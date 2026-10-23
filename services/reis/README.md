# REI-S

**R**etrieval **E**xtraction **I**ngestion **S**erver

This server offers RAG functionality for Gaible.

## Getting started

For development, install `python` and `uv`. Then the REI-S can be started with

```bash
uv sync
uv run fastapi dev rei_s/app.py --port 3201
```

## Testing

The tests can be run with

```bash
uv run pytest -rs
```

Unit tests need `ffmpeg` and LibreOffice (`soffice`) on the host, but no credentials or network services.
The tests in `tests/e2e` need a local postgres with pgvector (`STORE_PGVECTOR_URL`) and, for the S3 file store,
an S3 compatible store like S3Mock or MinIO (`FILE_STORE_S3_ENDPOINT_URL`, `FILE_STORE_S3_ACCESS_KEY_ID`,
`FILE_STORE_S3_SECRET_ACCESS_KEY`, `FILE_STORE_S3_BUCKET_NAME`). They are skipped if those environment variables are
not set (CI runs with `--error-for-skips`, so they cannot be skipped silently there).

Unit tests and e2e tests can also run selectively with

```bash
uv run pytest -rs tests/unit
uv run pytest -rs tests/e2e
```

## Open API

To generate the specs `reis-dev-spec.json`, run `uv run python rei_s/generate_open_api.py` in this directory.

## Vector stores

Currently REI-S supports Azure AI Search and pgvector (e.g. provided by the `postgres` service of the root [`docker-compose.yml`](../../docker-compose.yml))

The used store can be specified using the environment variables:

### Azure AI Search:

```bash
STORE_TYPE=azure-ai-search
# other STORE_AZURE_AI_SEARCH_* variables from .env.example
```

### pgvector:

```bash
STORE_TYPE=pgvector
STORE_PGVECTOR_URL=postgres+psycopg://admin:secret@localhost:5432/gaible
```

## File stores

Optionally, REIS can save a pdf preview of the uploaded file in a file store.

This feature is activated by supplying a FILE_STORE_TYPE env variable.

If it is activated, Gaible will be able to show a pdf version of the uploaded file,
if a user clicks on a source.

Note that activation of this feature will lead to every file to be converted to
a pdf before being parsed and chunked. This is necessary to supply the metadata
of the chunks with the correct page number.

Also, if this feature is active, LibreOffice needs to be available on the system.
In our the docker image, this is the case.

On MacOS it might be necessary to install further system dependecies for pdf generation
with `brew install glib cairo pango gdk-pixbuf harfbuzz libxml2 libxslt gobject-introspection fontconfig freetype pkg-config libffi`

### S3:

```bash
FILE_STORE_TYPE=s3
# other FILE_STORE_S3_* variables from .env.example
```

### filesystem:

This option will save the files at a specified location in the file system.

This is not advised to use in production, but provided for easy setup for experiments and development.

## Example configuration in Gaible

In Gaible, the configuration is a multi step process.

### Create a bucket

First, a bucket needs to be created: `Administration > Files > "+"`

Choose a sensible name and the REI-S instance as the Endpoint.
For local development it is by default `http://localhost:3201`.
If you want to use the REI-S started with the docker compose, use `http://reis:3201`.

For a detailled explanation about all the option, see [the administrator documentation.](../../frontend/public/docs/admin/files/index.md)

### Add an extension to the deployment

Next, an Extension needs to be added to a deployment: `Administration > Assistants > [asstistant name] > Add Extension`

You can choose one of the extensions which handle files and are integrated with REI-S.
A detailled explanation which extension should be used for which use case is available in [the administrator documentation](../../frontend/public/docs/admin/assistants/index.md)

### When are user files queried

Currently the LLM is encouraged to query the user files and is possibly given a list of the filenames to decide whether a query is performed against the files (if the tool description has enough space left to fit all filenames).
However, the LLM might decide that it already knows the answer or does not recognize that a tool call to the file tool would be advantageous.

These cases can be mitigated by changing the prompt to explicitly mention that the LLM should look up a file.

If this is not an option, the admin can modify the bucket description or the system prompt can be extended with explicit directions.
