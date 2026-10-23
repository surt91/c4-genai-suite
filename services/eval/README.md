# LLM Eval Service

Internal evaluation service for Gaible. This service provides LLM evaluation capabilities including:

- QA Catalog management and generation (using RAGAS)
- Evaluation execution with DeepEval metrics
- LLM endpoint configuration
- Dashboard and reporting

## Architecture

This service is an **internal trusted service** — it has no authentication layer of its own.
All user-facing requests are authenticated by the Gaible backend (NestJS), which proxies them to this service.

```
User requests:   Gaible Frontend → Gaible Backend (NestJS) → Eval Service
                                    ↑
                               Auth happens here

Eval → Gaible:       Eval Service  →  Gaible Backend
                       ↑
                  x-api-key (service account)
```

When the eval service needs to call back to the Gaible backend (e.g. to query an assistant
during evaluations), it authenticates as a **service account** using a shared API key.
See [Authentication Setup](#authentication-setup) below.

## Database

The service uses the same PostgreSQL database as Gaible, but with a separate schema: `llm_eval`.

Tables:

- `llm_eval.qa_catalog_group`
- `llm_eval.qa_catalog`
- `llm_eval.qa_pair`
- `llm_eval.evaluation`
- `llm_eval.test_case`
- `llm_eval.test_case_evaluation_result`
- `llm_eval.llm_endpoint`
- `llm_eval.evaluation_metric`

## Development

### Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/)
- PostgreSQL (use Gaible's dev postgres)
- RabbitMQ (for Celery)

### Setup

```bash
cd services/eval
uv sync
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:

- `PG_HOST`, `PG_USER`, `PG_PASSWORD`, `PG_DB`, `PG_PORT` - PostgreSQL connection
- `CELERY_BROKER_HOST`, `CELERY_BROKER_USER`, `CELERY_BROKER_PASSWORD` - RabbitMQ
- `LLM_EVAL_ENCRYPTION_KEY` - For encrypting sensitive config data
- `GAIBLE_BACKEND_URL` - URL of the Gaible backend API
- `GAIBLE_BACKEND_API_KEY` - API key for the eval service account (see [Authentication Setup](#authentication-setup))

### Authentication Setup

The eval service authenticates with the Gaible backend using a shared API key.
Both services must be configured with the **same raw key value**.

**1. Generate a key:**

```bash
openssl rand -hex 64
```

**2. Configure both services with the generated key:**

| Service                             | Environment Variable           | Value                |
| ----------------------------------- | ------------------------------ | -------------------- |
| Gaible Backend (`backend/.env`)         | `EVAL_SERVICE_ACCOUNT_API_KEY` | raw key              |
| Eval Service (`services/eval/.env`) | `GAIBLE_BACKEND_API_KEY`           | raw key (same value) |

**3. How it works:**

- On startup, the Gaible backend hashes `EVAL_SERVICE_ACCOUNT_API_KEY` with SHA-256 and
  provisions (or updates) a service account user (`eval-service@internal`) with the
  hashed key stored in the database. This account is assigned to the admin group.
- When the eval service calls the Gaible backend, it sends the raw key in the `x-api-key`
  header. The backend hashes the incoming key and looks it up — matching the standard
  API key authentication flow used by all other API key users.
- If `EVAL_SERVICE_ACCOUNT_API_KEY` is not set, the service account is not created
  and Gaible assistant evaluations will not work (other eval features are unaffected).

### Running the Service

```bash
# Run the FastAPI server
uv run uvicorn llm_eval.main:app --reload --port 3202

# Run Celery worker (in another terminal)
uv run celery -A llm_eval.tasks worker --loglevel=info
```

### API Documentation

When running, OpenAPI docs are available at:

- http://localhost:3202/docs (Swagger UI)
- http://localhost:3202/redoc (ReDoc)

## User Context

The Gaible backend passes user context via HTTP headers when proxying requests:

- `X-User-Id`: User ID
- `X-User-Name`: Username
- `X-User-Email`: User email

These are used for audit trails (e.g. tracking who created an endpoint or evaluation).

## Endpoints

- `GET /health` - Health check
- `/v1/eval/*` - Evaluation management
- `/v1/qa-catalog/*` - QA catalog management
- `/v1/llm-endpoints/*` - LLM endpoint configuration
- `/v1/metrics/*` - Evaluation metrics configuration
- `/v1/dashboard/*` - Dashboard data
