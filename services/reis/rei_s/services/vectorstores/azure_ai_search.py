from array import array
import base64
import json
from threading import Lock
from typing import Any, Awaitable, List
import uuid

from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import ResourceNotFoundError
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    ExhaustiveKnnAlgorithmConfiguration,
    ExhaustiveKnnParameters,
    HnswAlgorithmConfiguration,
    HnswParameters,
    SearchableField,
    SearchField,
    SearchFieldDataType,
    SearchIndex,
    SimpleField,
    VectorSearch,
    VectorSearchAlgorithmKind,
    VectorSearchAlgorithmMetric,
    VectorSearchProfile,
)
from azure.search.documents.models import VectorizedQuery
from langchain_core.documents import Document
from langchain_core.embeddings.embeddings import Embeddings

from rei_s.config import Config
from rei_s.services.vectorstore_adapter import VectorStoreAdapter, VectorStoreFilter


lock = Lock()
# (endpoint, index name) of indexes which are known to exist
_known_indexes: set[tuple[str, str]] = set()

FIELD_ID = "id"
FIELD_CONTENT = "content"
FIELD_CONTENT_VECTOR = "content_vector"
FIELD_METADATA = "metadata"
# metadata entries with the name of an index field are also written to that field (used for filtering)
INDEX_FIELD_NAMES = [FIELD_ID, FIELD_CONTENT, FIELD_CONTENT_VECTOR, FIELD_METADATA, "doc_id", "bucket"]

MAX_UPLOAD_BATCH_SIZE = 1000

# delimiter for `search.in`; the default delimiters (space and comma) may occur in ids
SEARCH_IN_DELIMITER = "|"


def odata_string(value: str) -> str:
    """Quotes a value as OData string literal."""
    return "'" + value.replace("'", "''") + "'"


def odata_search_in(field: str, values: list[str]) -> str:
    if any(SEARCH_IN_DELIMITER in value for value in values):
        raise ValueError(f"Values must not contain `{SEARCH_IN_DELIMITER}`")
    joined = SEARCH_IN_DELIMITER.join(values)
    return f"search.in({field}, {odata_string(joined)}, {odata_string(SEARCH_IN_DELIMITER)})"


def get_index_fields(vector_dimensions: int) -> list[SearchField]:
    # We can not filter on the json metadata, so we have to configure new fields in the azure index,
    # on which we want to filter.
    return [
        SimpleField(
            name=FIELD_ID,
            type=SearchFieldDataType.String,
            key=True,
            filterable=True,
        ),
        SearchableField(
            name=FIELD_CONTENT,
            type=SearchFieldDataType.String,
            searchable=True,
        ),
        SearchField(
            name=FIELD_CONTENT_VECTOR,
            type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
            searchable=True,
            vector_search_dimensions=vector_dimensions,
            vector_search_profile_name="myHnswProfile",
        ),
        SearchableField(
            name=FIELD_METADATA,
            type=SearchFieldDataType.String,
            searchable=True,
        ),
        # Additional field for deleting by our id
        SearchableField(
            name="doc_id",
            type=SearchFieldDataType.String,
            searchable=True,
            filterable=True,
        ),
        # Additional field for filtering on bucket
        SearchableField(
            name="bucket",
            type=SearchFieldDataType.String,
            searchable=True,
            filterable=True,
        ),
    ]


def get_vector_search() -> VectorSearch:
    return VectorSearch(
        algorithms=[
            HnswAlgorithmConfiguration(
                name="default",
                kind=VectorSearchAlgorithmKind.HNSW,
                parameters=HnswParameters(
                    m=4,
                    ef_construction=400,
                    ef_search=500,
                    metric=VectorSearchAlgorithmMetric.COSINE,
                ),
            ),
            ExhaustiveKnnAlgorithmConfiguration(
                name="default_exhaustive_knn",
                kind=VectorSearchAlgorithmKind.EXHAUSTIVE_KNN,
                parameters=ExhaustiveKnnParameters(metric=VectorSearchAlgorithmMetric.COSINE),
            ),
        ],
        profiles=[
            VectorSearchProfile(name="myHnswProfile", algorithm_configuration_name="default"),
            VectorSearchProfile(name="myExhaustiveKnnProfile", algorithm_configuration_name="default_exhaustive_knn"),
        ],
    )


def result_to_document(result: dict[str, Any]) -> Document:
    if FIELD_METADATA in result:
        metadata = result[FIELD_METADATA]
        if not isinstance(metadata, dict):
            metadata = json.loads(metadata)
    else:
        metadata = {k: v for k, v in result.items() if k not in [FIELD_CONTENT_VECTOR, FIELD_CONTENT]}
    fields_id = {FIELD_ID: result.pop(FIELD_ID)} if FIELD_ID in result else {}
    return Document(page_content=result[FIELD_CONTENT], metadata={**fields_id, **metadata})


class AzureAISearchStoreAdapter(VectorStoreAdapter):
    client: SearchClient
    embeddings: Embeddings

    @classmethod
    def create(cls, config: Config, embeddings: Embeddings, index_name: str | None) -> "AzureAISearchStoreAdapter":
        if index_name is None:
            index_name = config.store_azure_ai_search_service_index_name

        # this is ensured by the config validation, the following lines are there to help the ty typechecker
        if config.store_azure_ai_search_service_endpoint is None:
            raise ValueError("The env variable `STORE_AZURE_AI_SEARCH_SERVICE_ENDPOINT` is missing.")
        if config.store_azure_ai_search_service_api_key is None:
            raise ValueError("The env variable `STORE_AZURE_AI_SEARCH_SERVICE_API_KEY` is missing.")

        endpoint = config.store_azure_ai_search_service_endpoint
        credential = AzureKeyCredential(config.store_azure_ai_search_service_api_key.get_secret_value())

        # We need to lock this, otherwise it two processes might race to create the same collection
        with lock:
            # indexes are not deleted by us, so the existence check is only needed once per index
            if (endpoint, index_name) not in _known_indexes:
                index_client = SearchIndexClient(endpoint=endpoint, credential=credential)
                try:
                    index_client.get_index(name=index_name)
                except ResourceNotFoundError:
                    fields = get_index_fields(len(embeddings.embed_query("Text")))
                    index = SearchIndex(name=index_name, fields=fields, vector_search=get_vector_search())
                    index_client.create_index(index)
                finally:
                    index_client.close()
                _known_indexes.add((endpoint, index_name))

        instance = cls()
        instance.client = SearchClient(endpoint=endpoint, index_name=index_name, credential=credential)
        instance.embeddings = embeddings

        return instance

    def add_documents(self, documents: list[Document]) -> None:
        # Either no document or every document needs an id
        keys = [doc.id for doc in documents if doc.id is not None]
        if len(keys) > 0 and len(keys) != len(documents):
            raise ValueError("If you give an `id` for any document, you need to give an id for every document")

        texts = [doc.page_content for doc in documents]
        embeddings = self.embeddings.embed_documents(texts)
        if len(embeddings) == 0:
            return

        data = []
        for i, (doc, embedding) in enumerate(zip(documents, embeddings, strict=True)):
            if keys:
                key = keys[i]
            else:
                # Encoding key for Azure Search valid characters
                key = base64.urlsafe_b64encode(str(uuid.uuid4()).encode()).decode("ascii")
            metadata = doc.metadata
            data.append(
                {
                    "@search.action": "upload",
                    FIELD_ID: key,
                    FIELD_CONTENT: doc.page_content,
                    # the index stores single precision floats
                    FIELD_CONTENT_VECTOR: array("f", embedding).tolist(),
                    FIELD_METADATA: json.dumps(metadata),
                    **{k: v for k, v in metadata.items() if k in INDEX_FIELD_NAMES},
                }
            )

        for start in range(0, len(data), MAX_UPLOAD_BATCH_SIZE):
            response = self.client.upload_documents(documents=data[start : start + MAX_UPLOAD_BATCH_SIZE])
            failed = [r for r in response if not r.succeeded]
            if failed:
                raise RuntimeError(f"Failed to upload documents to Azure AI Search: {failed}")

    def delete(self, doc_id: str) -> None:
        # Documents can only be deleted by the "key", which is unique, i.e., the chunk id.
        # To delete by our doc_id, we first need to fetch all chunk_ids of the doc_id.
        response = self.client.search(search_text="*", filter=f"doc_id eq {odata_string(doc_id)}", select=["id"])
        # assure ty that we get the sync type
        if isinstance(response, Awaitable):
            raise TypeError("Got awaitable response from client. Expected sync Azure AI Search client")

        ids = [i["id"] for i in response]
        if ids:
            self.client.delete_documents([{FIELD_ID: i} for i in ids])

    @staticmethod
    def convert_filter(search_filter: VectorStoreFilter | None) -> str | None:
        if search_filter is None:
            filter_expression = None
        else:
            filter_expressions = []
            if search_filter.bucket is not None:
                filter_expressions.append(f"bucket eq {odata_string(search_filter.bucket)}")
            if search_filter.doc_ids is not None:
                if len(search_filter.doc_ids) == 0:
                    raise ValueError("The result would not match any entry")
                filter_expressions.append(odata_search_in("doc_id", search_filter.doc_ids))
            filter_expression = " and ".join(filter_expressions)

        return filter_expression

    def _hybrid_search(self, query: str, k: int, filter_expression: str | None) -> List[Document]:
        """Combined full text and vector search."""
        results = self.client.search(
            search_text=query,
            vector_queries=[
                VectorizedQuery(
                    vector=self.embeddings.embed_query(query),
                    k_nearest_neighbors=k,
                    fields=FIELD_CONTENT_VECTOR,
                )
            ],
            filter=filter_expression,
            top=k,
        )
        return [result_to_document(result) for result in results]

    def similarity_search(
        self, query: str, k: int = 4, search_filter: VectorStoreFilter | None = None
    ) -> List[Document]:
        # We catch the special case of an empty file list. While None means that all files may be searched
        # an empty file list means that no files may be searched, such that the result will always be empty.
        # So we do not have to bother Azure.
        if search_filter is not None and search_filter.doc_ids is not None and len(search_filter.doc_ids) == 0:
            return []

        filter_expression = self.convert_filter(search_filter)

        return self._hybrid_search(query, k, filter_expression)

    def get_documents(self, ids: List[str]) -> List[Document]:
        if not ids:
            return []
        # a plain filter query, there is nothing to rank (and no need to embed a query)
        results = self.client.search(search_text="*", filter=odata_search_in(FIELD_ID, ids), top=len(ids))
        return [result_to_document(result) for result in results]
