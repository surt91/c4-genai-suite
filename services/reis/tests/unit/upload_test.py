import asyncio
from pathlib import Path
import tempfile
from typing import AsyncIterator, Generator

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
import pytest
from pytest_mock import MockerFixture
from starlette.requests import ClientDisconnect

from rei_s.config import get_config
from rei_s.routes.files import save_upload
from rei_s.services.random_embeddings import RandomEmbeddings
from rei_s.services.vectorstores.devnull_store import DevNullVectorStoreAdapter
from tests.conftest import get_test_config


@pytest.fixture
def temp_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(tempfile, "tempdir", str(tmp_path))
    return tmp_path


@pytest.fixture
def client(mocker: MockerFixture, app: FastAPI) -> Generator[TestClient, None, None]:
    config = get_test_config(dict(max_file_size=100))
    app.dependency_overrides[get_config] = lambda: config
    mocker.patch("rei_s.services.store_service.get_embeddings", return_value=RandomEmbeddings(size=8))
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=DevNullVectorStoreAdapter())

    yield TestClient(app)

    del app.dependency_overrides[get_config]


def upload(client: TestClient, file_id: str, content: bytes = b"Hello world") -> int:
    response = client.post(
        "/files",
        content=content,
        headers={"bucket": "1", "id": file_id, "fileName": "a.txt", "fileMimeType": "text/plain"},
    )
    return response.status_code


@pytest.mark.parametrize("file_id", ["1", ".", "..", "../x", "a/b"])
def test_temp_file_does_not_depend_on_the_id(client: TestClient, temp_dir: Path, file_id: str) -> None:
    assert upload(client, file_id) == 200
    assert list(temp_dir.iterdir()) == []


def test_upload_too_large(client: TestClient, temp_dir: Path) -> None:
    assert upload(client, "1", b"x" * 101) == 413
    assert list(temp_dir.iterdir()) == []


class DisconnectingRequest:
    headers: dict[str, str] = {}

    async def stream(self) -> AsyncIterator[bytes]:
        yield b"first chunk"
        raise ClientDisconnect()


def test_partial_upload_is_deleted_on_disconnect(temp_dir: Path) -> None:
    with pytest.raises(ClientDisconnect):
        asyncio.run(save_upload(DisconnectingRequest(), get_test_config()))  # type: ignore[arg-type]  # ty: ignore[invalid-argument-type]

    assert list(temp_dir.iterdir()) == []


class StreamingRequest(DisconnectingRequest):
    async def stream(self) -> AsyncIterator[bytes]:
        for _ in range(3):
            yield b"x" * 10


def test_size_limit_without_content_length(temp_dir: Path) -> None:
    # chunked uploads have no Content-Length header
    with pytest.raises(HTTPException) as e:
        asyncio.run(save_upload(StreamingRequest(), get_test_config(dict(max_file_size=25))))  # type: ignore[arg-type]  # ty: ignore[invalid-argument-type]

    assert e.value.status_code == 413
    assert list(temp_dir.iterdir()) == []
