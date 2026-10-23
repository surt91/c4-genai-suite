from langchain_core.documents import Document
from pytest_mock import MockerFixture

from rei_s.services import store_service
from rei_s.services.vectorstores.devnull_store import DevNullVectorStoreAdapter
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
