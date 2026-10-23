import os
from pathlib import Path
import shutil

from rei_s.config import Config
from rei_s.services.filestore_adapter import FileStoreAdapter, ReadableStream
from rei_s.types.source_file import SourceFile


def normalized_path(path: Path, base_name: str) -> Path:
    if base_name in {"", ".", ".."} or "/" in base_name or "\\" in base_name or "\x00" in base_name:
        raise ValueError(f"Invalid document id: {base_name!r}")
    return path.resolve() / base_name


class FSFileStoreAdapter(FileStoreAdapter):
    path: Path

    def add_document(self, document: SourceFile) -> None:
        shutil.copyfile(document.path, normalized_path(self.path, document.id))

    # documents with an invalid id can not have been added, so they are treated like missing documents

    def delete(self, doc_id: str) -> None:
        try:
            normalized_path(self.path, doc_id).unlink(missing_ok=True)
        except ValueError:
            pass

    def open_document(self, doc_id: str) -> ReadableStream | None:
        try:
            return open(normalized_path(self.path, doc_id), "rb")
        except (FileNotFoundError, ValueError):
            return None

    def exists(self, doc_id: str) -> bool:
        try:
            return normalized_path(self.path, doc_id).is_file()
        except ValueError:
            return False

    @classmethod
    def create(cls, config: Config) -> "FSFileStoreAdapter":
        ret = FSFileStoreAdapter()

        if config.file_store_filesystem_basepath is None:
            raise ValueError("The env variable `filestore_filesystem_basepath` is missing.")

        ret.path = Path(config.file_store_filesystem_basepath)
        os.makedirs(ret.path, exist_ok=True)
        return ret
