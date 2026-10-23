from abc import ABC, abstractmethod
from typing import Protocol

from rei_s.types.source_file import SourceFile


class ReadableStream(Protocol):
    def read(self, amt: int, /) -> bytes: ...

    def close(self) -> None: ...


class FileStoreAdapter(ABC):
    @abstractmethod
    def add_document(self, document: SourceFile) -> None:
        raise NotImplementedError

    @abstractmethod
    def delete(self, doc_id: str) -> None:
        """Deletes the document. Deleting a document that does not exist is not an error."""
        raise NotImplementedError

    @abstractmethod
    def open_document(self, doc_id: str) -> ReadableStream | None:
        """Opens the document for reading, `None` if it does not exist. The caller has to close the stream."""
        raise NotImplementedError

    @abstractmethod
    def exists(self, doc_id: str) -> bool:
        raise NotImplementedError
