import random

from langchain_core.embeddings import Embeddings


class RandomEmbeddings(Embeddings):
    """Random normally distributed vectors, for tests and local development without an embedding model."""

    def __init__(self, size: int) -> None:
        self.size = size

    def _get_embedding(self) -> list[float]:
        return [random.gauss() for _ in range(self.size)]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._get_embedding() for _ in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._get_embedding()
