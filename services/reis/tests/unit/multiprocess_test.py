import os
from pathlib import Path
import shutil
import tempfile
import threading
from typing import Callable

from langchain_core.documents import Document
import pytest

from rei_s.services import store_service
from rei_s.services.formats.libre_office_provider import LibreOfficeProvider
from rei_s.services.formats.plain_provider import PlainProvider
from rei_s.services.multiprocess_utils import SubprocessError
from rei_s.types.source_file import SourceFile, temp_file

# The providers need to be defined at module level, such that the spawned process can import them.


class TestOnlyProvider(PlainProvider):
    __test__ = False  # not a pytest test class

    @property
    def enabled(self) -> bool:
        # every subclass is registered as format provider, so we need to disable them for the other tests
        return False


class CrashingProvider(TestOnlyProvider):
    def process_file(
        self, file: SourceFile, chunk_size: int | None = None, chunk_overlap: int | None = None
    ) -> list[Document]:
        os._exit(3)


class UnpicklableError(Exception):
    def __init__(self) -> None:
        super().__init__("unpicklable")
        self.lock = threading.Lock()


class UnpicklableErrorProvider(TestOnlyProvider):
    def process_file(
        self, file: SourceFile, chunk_size: int | None = None, chunk_overlap: int | None = None
    ) -> list[Document]:
        raise UnpicklableError()


class FailingProvider(TestOnlyProvider):
    def process_file(
        self, file: SourceFile, chunk_size: int | None = None, chunk_overlap: int | None = None
    ) -> list[Document]:
        raise ValueError("broken file")


def run_with_timeout[T](fn: Callable[[], T], timeout: float = 60) -> T:
    """Runs `fn` in a thread, such that a hanging implementation fails the test instead of blocking forever."""
    values: list[T] = []
    errors: list[BaseException] = []

    def target() -> None:
        try:
            values.append(fn())
        except BaseException as e:
            errors.append(e)

    thread = threading.Thread(target=target, daemon=True)
    thread.start()
    thread.join(timeout)
    assert not thread.is_alive(), "processing in a subprocess hangs"
    if errors:
        raise errors[0]
    return values[0]


def test_subprocess_result() -> None:
    with temp_file(b"hello world", file_name="a.txt") as f:
        chunks = run_with_timeout(lambda: store_service.process_file_synchronously(PlainProvider(), f, None, 1))
    assert isinstance(chunks, list)
    assert isinstance(chunks[0], Document)
    assert chunks[0].page_content == "hello world"


def test_subprocess_exception_is_reraised() -> None:
    with temp_file(b"hello world", file_name="a.txt") as f:
        with pytest.raises(ValueError, match="broken file"):
            run_with_timeout(lambda: store_service.process_file_synchronously(FailingProvider(), f, None, 1))


def test_crashing_subprocess_does_not_hang() -> None:
    with temp_file(b"hello world", file_name="a.txt") as f:
        with pytest.raises(SubprocessError, match="exited with code 3"):
            run_with_timeout(lambda: store_service.process_file_synchronously(CrashingProvider(), f, None, 1))


def test_unpicklable_exception_does_not_hang() -> None:
    with temp_file(b"hello world", file_name="a.txt") as f:
        with pytest.raises(SubprocessError, match="UnpicklableError"):
            run_with_timeout(lambda: store_service.process_file_synchronously(UnpicklableErrorProvider(), f, None, 1))


def test_office_preview_created_in_subprocess_is_handed_over(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    # the spawned process reads the temp dir from the environment
    monkeypatch.setenv("TMP_FILES_ROOT", str(tmp_path))
    monkeypatch.setattr(tempfile, "tempdir", str(tmp_path))

    path = tmp_path / "upload"
    shutil.copy("tests/data/birthdays.odt", path)
    file = SourceFile(id="1", path=path, file_name="birthdays.odt", mime_type="")
    provider = LibreOfficeProvider()

    chunks = run_with_timeout(lambda: store_service.process_file_synchronously(provider, file, None, 1), 120)
    assert isinstance(chunks, list)
    assert "Darkwing Duck" in chunks[0].page_content

    # the pdf converted in the child is reused for the preview instead of converting again
    cached = file.preview_pdf_cache
    assert cached is not None
    assert cached.exists
    assert store_service.convert_file_synchronously(provider, file, 10**9) is cached

    file.delete()
    assert list(tmp_path.iterdir()) == []
