# Configuration

## Basic settings

| Env Variable   | Required            | Default | Description                                                              |
|----------------|---------------------|---------|--------------------------------------------------------------------------|
| BASE_URL       | Yes                 | None    | Required for OpenID Connect or assistants using image generation. |
| GAIBLE_DB_RETRY_DELAY | No           | 100     | Delay in ms between the database connection attempts.                    |
| DB_URL         | Yes                 | None    |                                                                          |
| SESSION_SECRET | NODE_ENV=production | None    |                                                                          |
| NODE_ENV       | No                  | None    |                                                                          |
| EXTENSIONS     | No                  | None    | ","-separated list of enabled extensions, when empty all enabled         |
| PORT           | No                  | 3000    |                                                                          |
| UPLOAD_MAX_FILE_SIZE_MB | No         | 512     | Maximum size of an uploaded file (all uploads are buffered in memory).   |


## Logging (LLM)

| Env Variable         | Required | Default | Description                                                                        |
|----------------------|----------|---------|------------------------------------------------------------------------------------|
| DEBUG_MODEL_REQUESTS | No       | None    | When set, the requests to the model providers are logged (credentials redacted).  |

## Metrics

| Env Variable             | Required  | Default | Description                     |
|--------------------------|-----------|---------|---------------------------------|
| METRICS_PORT             | No        | 9100    | Can be disabled by setting to 0 |

## Authentication

### Local

| Env Variable                     | Required | Default       | Description                             |
|----------------------------------|----------|---------------|-----------------------------------------|
| AUTH_ENABLE_PASSWORD             | No       | None          | boolean                                 |
| AUTH_TRUST_PROXY                 | No       | None          | boolean; when true the session cookie is a browser-session cookie without `Secure` flag |
| AUTH_INITIAL_ADMIN_USERNAME      | No       | None          |                                         |
| AUTH_INITIALUSER_APIKEY          | No       | None          |                                         |
| AUTH_INITIAL_ADMIN_PASSWORD      | No       | None          |                                         |
| AUTH_INITIAL_ADMIN_ROLE_REQUIRED | No       | false         | true, when initial user should be admin | 

### Common

| Env Variable                            | Required | Default | Description                                                                                  |
|-----------------------------------------|----------|---------|----------------------------------------------------------------------------------------------|
| AUTH_BASEURL                            | No       | BASE_URL | Base URL for the OAuth callbacks.                                                           |
| AUTH_LOGOUT_REDIRECT                    | No       | /       | Redirect target after the logout.                                                           |
| AUTH_LOGIN_ALLOWED_GROUPS               | No       | None    | ","-separated user group names; when set, only members of these groups can log in.          |
| AUTH_USE_USER_GROUPS_FROM_AUTH_PROVIDER | No       | false   | When true, the user groups are taken (by name) from the auth provider on every login.        |
| AUTH_USER_GROUPS_PROPERTY_NAME          | No       | groups  | Name of the user info property with the groups (OAuth).                                     |

### Github

| Env Variable             | Required  | Default | Description |
|--------------------------|-----------|---------|-------------|
| AUTH_GITHUB_CLIENTID     | No        | None    |             |
| AUTH_GITHUB_CLIENTSECRET | No        | None    |             |

### Google

| Env Variable             | Required  | Default   | Description |
|--------------------------|-----------|-----------|-------------|
| AUTH_GOOGLE_CLIENTID     | No        | None      |             |
| AUTH_GOOGLE_CLIENTSECRET | No        | None      |             |

### Microsoft

| Env Variable                | Required  | Default   | Description |
|-----------------------------|-----------|-----------|-------------|
| AUTH_MICROSOFT_CLIENTID     | No        | None      |             |
| AUTH_MICROSOFT_CLIENTSECRET | No        | None      |             |
| AUTH_MICROSOFT_TENANT       | No        | common    | Set it to your tenant id: with `common` users of every tenant can log in and are matched by their (unverified) e-mail. |


### OAuth

| Env Variable                 | Required  | Default   | Description |
|------------------------------|-----------|-----------|-------------|
| AUTH_OAUTH_AUTHORIZATION_URL | No        | None      |             |
| AUTH_OAUTH_BRAND_COLOR       | No        | None      |             |
| AUTH_OAUTH_BRAND_NAME        | No        | None      |             |
| AUTH_OAUTH_CLIENTID          | No        | None      |             |
| AUTH_OAUTH_CLIENTSECRET      | No        | None      |             |
| AUTH_OAUTH_TOKEN_URL         | No        | None      |             |
| AUTH_OAUTH_USER_INFO_URL     | No        | None      |             |


## Langfuse

Tracing is enabled when both keys are set. The AI SDK spans are exported via OTLP to `<base url>/api/public/otel`.

| Env Variable        | Required  | Default                    | Description                                          |
|---------------------|-----------|----------------------------|------------------------------------------------------|
| LANGFUSE_PUBLIC_KEY | No        | None                       | public key of the Langfuse project                   |
| LANGFUSE_SECRET_KEY | No        | None                       | secret key of the Langfuse project                   |
| LANGFUSE_BASEURL    | No        | https://cloud.langfuse.com | Langfuse URL (`LANGFUSE_BASE_URL` is also accepted)  |

## Evaluation service

| Env Variable                 | Required | Default                 | Description                                                         |
|------------------------------|----------|-------------------------|---------------------------------------------------------------------|
| EVAL_SERVICE_ENABLED         | No       | false                   | Shows the evaluations in the admin UI.                              |
| EVAL_SERVICE_URL             | No       | http://localhost:3202   | URL of the eval service (proxied under `/api/eval`, admins only).   |
| EVAL_SERVICE_ACCOUNT_API_KEY | No       | None                    | API key (hex, >= 64 characters) of the admin account used by the eval service. |
| EVAL_SERVICE_ACCOUNT_EMAIL   | No       | eval-service@internal   | E-mail of that account.                                             |
