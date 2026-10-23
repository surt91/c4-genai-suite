from langchain_core.documents import Document
import pytest
from pytest_mock import MockerFixture

from rei_s.services import store_service
from rei_s.services.filestore_adapter import FileStoreAdapter
from rei_s.services.vectorstores.devnull_store import DevNullVectorStoreAdapter
from rei_s.types.source_file import SourceFile
from tests.conftest import get_test_config


def test_search_with_chunks_of_disabled_or_unknown_formats(mocker: MockerFixture) -> None:
    docs = [
        # audio is disabled without STT config
        Document(page_content="audio", metadata={"format": "audio", "bucket": "1", "source": "a.mp3"}),
        Document(page_content="plain", metadata={"format": "plain", "bucket": "1", "source": "a.txt"}),
        Document(page_content="no format", metadata={"bucket": "1", "source": "b"}),
    ]
    vector_store = mocker.Mock(spec=DevNullVectorStoreAdapter)
    vector_store.similarity_search.return_value = docs
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=vector_store)

    result = store_service.search(get_test_config(), "query", "1", 3)

    assert [doc.page_content for doc in result] == ["audio", "plain", "no format"]
    assert all("bucket" not in doc.metadata for doc in result)


def text_file() -> SourceFile:
    return SourceFile.new_temporary_file(("lorem ipsum " * 500).encode(), "txt")


def test_add_file_replaces_existing_chunks(mocker: MockerFixture) -> None:
    calls = mocker.Mock()
    vector_store = mocker.Mock(spec=DevNullVectorStoreAdapter)
    vector_store.delete.side_effect = lambda doc_id: calls("delete", doc_id)
    vector_store.add_documents.side_effect = lambda docs: calls("add")
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=vector_store)
    mocker.patch("rei_s.services.store_service.get_file_store", return_value=None)

    file = text_file()
    try:
        store_service.add_file(get_test_config(), file, "1", "doc")
    finally:
        file.delete()

    assert calls.call_args_list[0] == mocker.call("delete", "doc")
    assert calls.call_args_list[1] == mocker.call("add")


def test_add_file_rolls_back_on_failure(mocker: MockerFixture) -> None:
    vector_store = mocker.Mock(spec=DevNullVectorStoreAdapter)
    # the first batch is stored, the second fails
    vector_store.add_documents.side_effect = [None, RuntimeError("db gone")]
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=vector_store)
    file_store = mocker.Mock(spec=FileStoreAdapter)
    mocker.patch("rei_s.services.store_service.get_file_store", return_value=file_store)

    file = text_file()
    try:
        with pytest.raises(RuntimeError, match="db gone"):
            store_service.add_file(get_test_config(dict(batch_size=1)), file, "1", "doc")
    finally:
        file.delete()

    assert vector_store.add_documents.call_count == 2
    file_store.add_document.assert_called_once()
    # deleted once before adding and once for the rollback
    assert vector_store.delete.call_args_list == [mocker.call("doc"), mocker.call("doc")]
    file_store.delete.assert_called_once_with("doc")
