from pathlib import Path
from typing import Generator

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest
from pytest_mock import MockerFixture

from rei_s.config import get_config
from rei_s.services.filestores.filesystem import FSFileStoreAdapter
from rei_s.services.random_embeddings import RandomEmbeddings
from rei_s.services.vectorstores.devnull_store import DevNullVectorStoreAdapter
from tests.conftest import get_test_config


@pytest.fixture
def base_path(tmp_path: Path) -> Path:
    return tmp_path / "files"


@pytest.fixture
def client(mocker: MockerFixture, app: FastAPI, base_path: Path) -> Generator[TestClient, None, None]:
    config = get_test_config(dict(file_store_type="filesystem", file_store_filesystem_basepath=str(base_path)))
    app.dependency_overrides[get_config] = lambda: config
    mocker.patch("rei_s.services.store_service.get_embeddings", return_value=RandomEmbeddings(size=8))
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=DevNullVectorStoreAdapter())

    yield TestClient(app)

    del app.dependency_overrides[get_config]


def upload(client: TestClient, file_id: str) -> None:
    response = client.post(
        "/files",
        content=b"Hello world",
        headers={"bucket": "1", "id": file_id, "fileName": "a.txt", "fileMimeType": "text/plain"},
    )
    assert response.status_code == 200, response.text


def test_get_document_pdf(client: TestClient, base_path: Path) -> None:
    upload(client, "1")

    response = client.get("/documents/pdf", params={"doc_id": "1"})

    assert response.status_code == 200
    assert response.content == (base_path / "1").read_bytes()
    assert response.content.startswith(b"%PDF")


def test_get_missing_document_pdf_is_404(client: TestClient) -> None:
    response = client.get("/documents/pdf", params={"doc_id": "missing"})

    assert response.status_code == 404


def test_delete_file_without_pdf(client: TestClient) -> None:
    # e.g. uploaded before the file store was enabled; the backend deletes before every file update
    response = client.delete("/files/never-uploaded")

    assert response.status_code == 200


def test_delete_file(client: TestClient, base_path: Path) -> None:
    upload(client, "1")
    assert (base_path / "1").exists()

    response = client.delete("/files/1")

    assert response.status_code == 200
    assert not (base_path / "1").exists()


@pytest.mark.parametrize("doc_id", ["", ".", "..", "../x", "a/b", "/etc/passwd"])
def test_invalid_ids(base_path: Path, doc_id: str) -> None:
    store = FSFileStoreAdapter.create(
        get_test_config(dict(file_store_type="filesystem", file_store_filesystem_basepath=str(base_path)))
    )

    assert not store.exists(doc_id)
    assert store.open_document(doc_id) is None
    store.delete(doc_id)
