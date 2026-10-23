# Configuration

## Basic settings

| Env Variable    | Required | Default | Description                                   |
|-----------------|----------|---------|-----------------------------------------------|
| STORE_TYPE      | Yes      | None    | `pgvector` or `azure-ai-search`               |
| EMBEDDINGS_TYPE | Yes      | None    | `openai` or `azure-openai`                    |
| STT_TYPE        | No       | None    | `azure-openai-whisper` or undefined           |
| TMP_FILES_ROOT  | No       | None    | absolute path where temp files will be stored |
| WORKERS         | No       | 1       | number of parallel workers                    |
| BATCH_SIZE      | No       | None    | number of chunks im memory at the same time   |
| MAX_FILE_SIZE   | No       | None    | maximum upload size in bytes (413 if larger)  |

## Metrics

| Env Variable | Required  | Default |
|--------------|-----------|---------|
| METRICS_PORT | No        | 9200    |

## Store

### Postgres

| Env Variable              | Required            | Default | Description                                                                                        |
|---------------------------|---------------------|---------|----------------------------------------------------------------------------------------------------|
| STORE_PGVECTOR_URL        | STORE_TYPE=pgvector | None    |                                                                                                    |
| STORE_PGVECTOR_INDEX_NAME | STORE_TYPE=pgvector | None    | Name of the collection used for the vector store (this is a logical distinction in the same table) |

### Azure AI Search

| Env Variable                             | Required                   | Default | Description                                 |
|------------------------------------------|----------------------------|---------|---------------------------------------------|
| STORE_AZURE_AI_SEARCH_SERVICE_ENDPOINT   | STORE_TYPE=azure-ai-search | None    |                                             |
| STORE_AZURE_AI_SEARCH_SERVICE_API_KEY    | STORE_TYPE=azure-ai-search | None    |                                             |
| STORE_AZURE_AI_SEARCH_SERVICE_INDEX_NAME | STORE_TYPE=azure-ai-search | None    | Name of the index used for the vector store |

## Embeddings

### Azure OpenAI

| Env Variable                            | Required                     | Default |
|-----------------------------------------|------------------------------|---------|
| EMBEDDINGS_AZURE_OPENAI_ENDPOINT        | EMBEDDINGS_TYPE=azure-openai | None    |
| EMBEDDINGS_AZURE_OPENAI_API_KEY         | EMBEDDINGS_TYPE=azure-openai | None    |
| EMBEDDINGS_AZURE_OPENAI_MODEL_NAME      | EMBEDDINGS_TYPE=azure-openai | None    |
| EMBEDDINGS_AZURE_OPENAI_DEPLOYMENT_NAME | EMBEDDINGS_TYPE=azure-openai | None    |
| EMBEDDINGS_AZURE_OPENAI_API_VERSION     | EMBEDDINGS_TYPE=azure-openai | None    |

### OpenAI

**Note that the OpenAI  embeddings are not tested and might currently be broken.**

| Env Variable                 | Required               | Default |
|------------------------------|------------------------|---------|
| EMBEDDINGS_OPENAI_API_KEY    | EMBEDDINGS_TYPE=openai | None    |
| EMBEDDINGS_OPENAI_MODEL_NAME | EMBEDDINGS_TYPE=openai | None    |

## Speech to Text

### Azure OpenAI Whisper

| Env Variable                             | Required                      | Default |
|------------------------------------------|-------------------------------|---------|
| STT_AZURE_OPENAI_WHISPER_ENDPOINT        | STT_TYPE=azure-openai-whisper | None    |
| STT_AZURE_OPENAI_WHISPER_API_KEY         | STT_TYPE=azure-openai-whisper | None    |
| STT_AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME | STT_TYPE=azure-openai-whisper | None    |
| STT_AZURE_OPENAI_WHISPER_API_VERSION     | STT_TYPE=azure-openai-whisper | None    |
