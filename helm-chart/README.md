# Helm Chart - Gaible

## Prerequisites

- A Kubernetes cluster
- A PostgreSQL database
- Any of the following Large Language Models providers:
  - Amazon Bedrock
  - Azure OpenAI
  - Google GenAI
  - OpenAI or anything OpenAI API-compatible
  - Ollama or anything Ollama API-compatible
- One of the following vector databases:
  - Azure AI Search
  - PostgreSQL with PGVector

## Getting Started

```bash
helm install gaible oci://ghcr.io/surt91/gaible/charts/gaible -f values.yaml
```

### Example `values.yaml`

```yaml
ingress:
  enabled: true
  host: gaible.example.com
  tls: true

backend:
  auth:
    enablePassword: true
    initialAdminUsername: my-admin-username
    initialAdminPassword: my-admin-password
  postgresql:
    connectionString: postgresql://my-username:my-password@my-host:my-port/my-db
  sessionSecret: my-session-secret

reis:
  enabled: true
  embeddings:
    type: azure-openai
    azureOpenAi:
      apiKey: my-openai-api-key
      endpoint: https://example-sweden-dev.openai.azure.com/
      deploymentName: text-embedding-3-large
      apiVersion: 2023-07-01-preview
      modelName: text-embedding-3-large
  vectorDatabase:
    type: azure-ai-search
    azureAiSearch:
      apiKey: my-search-api-key
      endpoint: https://example.search.windows.net
      indexName: gaible-reis
```

## Parameters

### General

| Name                        | Description                                                                   | Value   |
| --------------------------- | ----------------------------------------------------------------------------- | ------- |
| `fullnameOverride`          | Overrides the name of the resources                                           | `""`    |
| `nameOverride`              | Overrides the name of the chart                                               | `""`    |
| `networkPolicy.enabled`     | Specifies whether NetworkPolicies should be created                           | `false` |
| `grafanaDashboards.enabled` | Specifies whether a ConfigMap containing Grafana dashboards should be created | `false` |

### Ingress

| Name                       | Description                                                            | Value   |
| -------------------------- | ---------------------------------------------------------------------- | ------- |
| `ingress.enabled`          | Specifies whether an Ingress resource should be created.               | `false` |
| `ingress.ingressClassName` | The name of the ingressClass. One of: public-traefik, internal-traefik | `""`    |
| `ingress.host`             | The host for ingress                                                   | `""`    |
| `ingress.annotations`      | Map of annotations to add for ingress                                  | `{}`    |
| `ingress.tls`              | Specifies if a `tls` section should be created.                        | `false` |

### Backend

| Name                                                  | Description                                                                                                                                                                                                             | Value                           |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `backend.enabled`                                     | Specifies whether Gaible should be deployed                                                                                                                                                                             | `true`                          |
| `backend.baseUrl`                                     | Base URL should match `https://{{ingress.host}}`. Required for OpenID Connect or assistants using image generation.                                                                                                     | `""`                            |
| `backend.ssl.rootCertificateConfigMapName`            | Name of the ConfigMap containing the root certificate for the external services.                                                                                                                                        | `""`                            |
| `backend.ssl.rootCertificateConfigMapKey`             | Key in the ConfigMap that holds the root certificate for the external services.                                                                                                                                         | `ca.crt`                        |
| `backend.auth.enablePassword`                         | Specifies if the built-in username & password auth is used                                                                                                                                                              | `false`                         |
| `backend.auth.initialAdminUsername`                   | The initial admin user Username saved in DB                                                                                                                                                                             | `""`                            |
| `backend.auth.initialAdminPassword`                   | The initial admin user Password hashed and saved in DB                                                                                                                                                                  | `""`                            |
| `backend.auth.existingAdminSecret`                    | The name of the existing k8s secret. `backend.auth.initialAdminUsername` and `backend.auth.initialAdminPassword` will be ignored. The keys must be `adminUsername` and `adminPassword`.                                 | `""`                            |
| `backend.auth.authorizationUrl`                       | The OpenID Connect authorizationUrl                                                                                                                                                                                     | `""`                            |
| `backend.auth.tokenUrl`                               | The OpenID Connect tokenUrl                                                                                                                                                                                             | `""`                            |
| `backend.auth.userInfoUrl`                            | The OpenID Connect userInfoUrl                                                                                                                                                                                          | `""`                            |
| `backend.auth.clientId`                               | The OpenID Connect clientId                                                                                                                                                                                             | `""`                            |
| `backend.auth.clientSecret`                           | The OpenID Connect clientSecret                                                                                                                                                                                         | `""`                            |
| `backend.auth.existingClientId`                       | The name of the existing k8s secret. `backend.auth.clientId` will be ignored. The key must be `clientId`                                                                                                                | `""`                            |
| `backend.auth.existingClientSecret`                   | The name of the existing k8s secret. `backend.auth.clientSecret` will be ignored. The key must be `clientSecret`                                                                                                        | `""`                            |
| `backend.auth.microsoftClientId`                      | The Microsoft Entra ID clientId                                                                                                                                                                                         | `""`                            |
| `backend.auth.microsoftClientSecret`                  | The Microsoft Entra ID clientSecret                                                                                                                                                                                     | `""`                            |
| `backend.auth.microsoftTenant`                        | The ID of your Microsoft Entra ID tenant. Required when the Microsoft login is enabled; `common`, `organizations` and `consumers` are rejected (users of any tenant could log in)                                       | `""`                            |
| `backend.auth.existingMicrosoftClientId`              | The name of the existing k8s secret. `backend.auth.microsoftClientId` will be ignored. The key must be `microsoftClientId`                                                                                              | `""`                            |
| `backend.auth.existingMicrosoftClientSecret`          | The name of the existing k8s secret. `backend.auth.microsoftClientSecret` will be ignored. The key must be `microsoftClientSecret`                                                                                      | `""`                            |
| `backend.auth.existingMicrosoftTenant`                | The name of the existing k8s secret. `backend.auth.microsoftTenant` will be ignored. The key must be `microsoftTenant`                                                                                                  | `""`                            |
| `backend.auth.acceptUserGroupsFromAuthProvider`       | Sets if user groups from the identity provider are saved in the Gaible user. (All groups manually selected in Gaible will be overwritten!)                                                                              | `false`                         |
| `backend.auth.userGroupsPropertyName`                 | The property in the auth token from where the user groups are read. Default is "groups".                                                                                                                                | `""`                            |
| `backend.auth.loginAllowedGroups`                     | Defines which user groups are allowed to log in, separated by commas. A user must have at least one of the groups to log in. The default defines no groups which allows any group or none for login.                    | `""`                            |
| `backend.postgresql.connectionString`                 | Connection string of an external Postgres. Will be ignored when `postgresql.enabled` is `true`.                                                                                                                         | `""`                            |
| `backend.postgresql.existingConnectionStringSecret`   | The name of the existing k8s secret. `postgresql.connectionString` will be ignored. The key must be `connectionString` Will be ignored when `postgresql.enabled` is `true`.                                             | `""`                            |
| `backend.postgresql.ssl.rootCertificateConfigMapName` | Name of the ConfigMap containing the root certificate for the external PostgreSQL database.                                                                                                                             | `""`                            |
| `backend.postgresql.ssl.rootCertificateConfigMapKey`  | Key in the ConfigMap that holds the root certificate for the external PostgreSQL database.  Make sure that the connection string contains `sslmode=verify-ca&sslrootcert=/etc/ssl/certs/<rootCertificateConfigMapKey>`. | `ca.crt`                        |
| `backend.postgresql.ssl.clientCertificateSecretName`  | Name of the Kubernetes Secret containing the client certificate for the external PostgreSQL database.                                                                                                                   | `""`                            |
| `backend.postgresql.ssl.clientCertificateSecretKey`   | Key in the Secret that holds the client certificate for the external PostgreSQL database. Make sure that the connection string contains `sslcert=/etc/ssl/certs/<clientCertificateSecretKey>`.                          | `client.crt`                    |
| `backend.postgresql.ssl.clientKeySecretKey`           | Key in the Secret that holds the client key for the external PostgreSQL database. Make sure that the connection string contains `sslkey=/etc/ssl/certs/<clientKeySecretKey>`.                                           | `client.key`                    |
| `backend.image.repository`                            | The image repository including host, port, repo                                                                                                                                                                         | `ghcr.io/surt91/gaible/backend` |
| `backend.image.tag`                                   | The image tag                                                                                                                                                                                                           | `""`                            |
| `backend.extraEnvVars`                                | An extra list of environment variables to add to the deployment.                                                                                                                                                        | `[]`                            |
| `backend.extraVolumes`                                | An extra list of volumes to add to the deployment.                                                                                                                                                                      | `[]`                            |
| `backend.extraVolumeMounts`                           | An extra list of volume mounts to add to the deployment.                                                                                                                                                                | `[]`                            |
| `backend.replicaCount`                                | The number of replicas to create.                                                                                                                                                                                       | `1`                             |
| `backend.updateStrategy.type`                         | Gaible deployment strategy type.                                                                                                                                                                                        | `RollingUpdate`                 |
| `backend.resources`                                   | Set container requests and limits for different resources like CPU or memory                                                                                                                                            | `{}`                            |
| `backend.sessionSecret`                               | The secret used to sign the session cookie                                                                                                                                                                              | `""`                            |
| `backend.existingSessionSecret`                       | The name of the existing k8s secret. `sessionSecret` will be ignored. The key must be `sessionSecret`                                                                                                                   | `""`                            |
| `backend.metrics.enabled`                             | Specifies whether a service for Gaible metrics should be created                                                                                                                                                        | `false`                         |
| `backend.metrics.port`                                | The Gaible metrics port                                                                                                                                                                                                 | `9100`                          |
| `backend.metrics.prometheusRule.enabled`              | Specifies whether a PrometheusRule for Gaible should be created                                                                                                                                                         | `false`                         |
| `backend.metrics.prometheusRule.ruleGroupLabels`      | Labels to add to the Gaible rule group                                                                                                                                                                                  | `{}`                            |
| `backend.metrics.serviceMonitor.enabled`              | Specifies whether a Gaible ServiceMonitor should be created                                                                                                                                                             | `false`                         |
| `backend.metrics.serviceMonitor.interval`             | Interval at which Prometheus scrapes the metrics from the target. If empty, Prometheus uses the global scrape interval.                                                                                                 | `""`                            |
| `backend.metrics.serviceMonitor.scrapeTimeout`        | Timeout after which Prometheus considers the scrape to be failed. If empty, Prometheus uses the global scrape timeout.                                                                                                  | `""`                            |
| `backend.metrics.serviceMonitor.labels`               | Map of labels to add to the Gaible ServiceMonitor                                                                                                                                                                       | `{}`                            |
| `backend.service.type`                                | The service type to use, one of: ClusterIP, NodePort, LoadBalancer                                                                                                                                                      | `""`                            |
| `backend.labels`                                      | Map of labels to add to the Gaible deployment                                                                                                                                                                           | `{}`                            |
| `backend.annotations`                                 | Map of annotations to add to the Gaible deployment                                                                                                                                                                      | `{}`                            |
| `backend.podLabels`                                   | Map of labels to add to the Gaible pods                                                                                                                                                                                 | `{}`                            |
| `backend.podAnnotations`                              | Map of annotations to add to the Gaible pods                                                                                                                                                                            | `{}`                            |
| `backend.podSecurityContext`                          | Configure the Security Context for the Pod                                                                                                                                                                              | `{}`                            |
| `backend.containerSecurityContext`                    | Configure the Security Context for the Container                                                                                                                                                                        | `{}`                            |

### Frontend

| Name                                            | Description                                                                                                             | Value                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `frontend.enabled`                              | Specifies whether the frontend should be deployed                                                                       | `true`                           |
| `frontend.image.repository`                     | The image repository including host, port, repo                                                                         | `ghcr.io/surt91/gaible/frontend` |
| `frontend.image.tag`                            | The image tag                                                                                                           | `""`                             |
| `frontend.replicaCount`                         | The number of replicas to create                                                                                        | `1`                              |
| `frontend.updateStrategy.type`                  | Frontend deployment strategy type                                                                                       | `RollingUpdate`                  |
| `frontend.resources`                            | Set container requests and limits for different resources like CPU or memory                                            | `{}`                             |
| `frontend.extraEnvVars`                         | An extra list of environment variables to add to the deployment                                                         | `[]`                             |
| `frontend.metrics.enabled`                      | Specifies whether a service for REIS metrics should be created.                                                         | `false`                          |
| `frontend.metrics.serviceMonitor.enabled`       | Specifies whether a ServiceMonitor should be created for the frontend.                                                  | `false`                          |
| `frontend.metrics.serviceMonitor.interval`      | Interval at which Prometheus scrapes the metrics from the target. If empty, Prometheus uses the global scrape interval. | `""`                             |
| `frontend.metrics.serviceMonitor.scrapeTimeout` | Timeout after which Prometheus considers the scrape to be failed. If empty, Prometheus uses the global scrape timeout.  | `""`                             |
| `frontend.metrics.serviceMonitor.labels`        | Map of labels to add to the Frontend ServiceMonitor.                                                                    | `{}`                             |
| `frontend.extraVolumes`                         | An extra list of volumes to add to the deployment                                                                       | `[]`                             |
| `frontend.extraVolumeMounts`                    | An extra list of volume mounts to add to the deployment                                                                 | `[]`                             |
| `frontend.labels`                               | Map of labels to add to the frontend deployment                                                                         | `{}`                             |
| `frontend.annotations`                          | Map of annotations to add to the frontend deployment                                                                    | `{}`                             |
| `frontend.podLabels`                            | Map of labels to add to the frontend pods                                                                               | `{}`                             |
| `frontend.podAnnotations`                       | Map of annotations to add to the frontend pods                                                                          | `{}`                             |
| `frontend.podSecurityContext`                   | Configure the Security Context for the Pod                                                                              | `{}`                             |
| `frontend.containerSecurityContext`             | Configure the Security Context for the Container                                                                        | `{}`                             |

### REIS

| Name                                                          | Description                                                                                                                                              | Value                        |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `reis.enabled`                                                | Specifies whether the REIS microservice should be deployed                                                                                               | `false`                      |
| `reis.replicaCount`                                           | The number of replicas to create.                                                                                                                        | `1`                          |
| `reis.updateStrategy.type`                                    | REIS deployment strategy type.                                                                                                                           | `RollingUpdate`              |
| `reis.host`                                                   | The REIS container host to bind to                                                                                                                       | `0.0.0.0`                    |
| `reis.image.repository`                                       | The image repository including host, port, repo                                                                                                          | `ghcr.io/surt91/gaible/reis` |
| `reis.image.tag`                                              | The image tag                                                                                                                                            | `""`                         |
| `reis.metrics.enabled`                                        | Specifies whether a service for REIS metrics should be created                                                                                           | `false`                      |
| `reis.metrics.port`                                           | The REIS metrics port                                                                                                                                    | `9200`                       |
| `reis.metrics.prometheusRule.enabled`                         | Specifies whether a PrometheusRule for REIS should be created                                                                                            | `false`                      |
| `reis.metrics.prometheusRule.ruleGroupLabels`                 | Labels to add to the Gaible rule group                                                                                                                   | `{}`                         |
| `reis.metrics.serviceMonitor.enabled`                         | Specifies whether a REIS ServiceMonitor should be created                                                                                                | `false`                      |
| `reis.metrics.serviceMonitor.interval`                        | Interval at which Prometheus scrapes the metrics from the target. If empty, Prometheus uses the global scrape interval.                                  | `""`                         |
| `reis.metrics.serviceMonitor.scrapeTimeout`                   | Timeout after which Prometheus considers the scrape to be failed. If empty, Prometheus uses the global scrape timeout.                                   | `""`                         |
| `reis.metrics.serviceMonitor.labels`                          | Map of labels to add to the REIS ServiceMonitor                                                                                                          | `{}`                         |
| `reis.embeddings.type`                                        | The embedding api type to use, one of: azure-openai, openai, bedrock, nvidia, ollama                                                                     | `""`                         |
| `reis.embeddings.azureOpenAi.apiKey`                          | API key for Azure OpenAI.                                                                                                                                | `""`                         |
| `reis.embeddings.azureOpenAi.existingApiKeySecret`            | Name of the Kubernetes Secret containing the Azure OpenAI API Key. The key must be `azureOpenAiApiKey`.                                                  | `""`                         |
| `reis.embeddings.azureOpenAi.endpoint`                        | The Azure OpenAI endpoint.                                                                                                                               | `""`                         |
| `reis.embeddings.azureOpenAi.deploymentName`                  | The Azure OpenAI deployment name.                                                                                                                        | `""`                         |
| `reis.embeddings.azureOpenAi.apiVersion`                      | The Azure OpenAI API version.                                                                                                                            | `""`                         |
| `reis.embeddings.azureOpenAi.modelName`                       | The Azure OpenAI model name.                                                                                                                             | `""`                         |
| `reis.embeddings.openAi.apiKey`                               | API key for OpenAI.                                                                                                                                      | `""`                         |
| `reis.embeddings.openAi.existingApiKeySecret`                 | Name of the Kubernetes Secret containing the OpenAI API Key. The key must be `openAiApiKey`.                                                             | `""`                         |
| `reis.embeddings.openAi.endpoint`                             | The OpenAI endpoint.                                                                                                                                     | `""`                         |
| `reis.embeddings.openAi.modelName`                            | The OpenAI model name.                                                                                                                                   | `""`                         |
| `reis.embeddings.openAiCompatible.apiKey`                     | API key for OpenAI Compatible.                                                                                                                           | `""`                         |
| `reis.embeddings.openAiCompatible.existingApiKeySecret`       | Name of the Kubernetes Secret containing the OpenAI Compatible API Key. The key must be `openAiCompatibleApiKey`.                                        | `""`                         |
| `reis.embeddings.openAiCompatible.endpoint`                   | The OpenAI Compatible endpoint.                                                                                                                          | `""`                         |
| `reis.embeddings.openAiCompatible.modelName`                  | The OpenAI Compatible model name.                                                                                                                        | `""`                         |
| `reis.embeddings.bedrock.modelId`                             | The model ID.                                                                                                                                            | `""`                         |
| `reis.embeddings.bedrock.regionName`                          | The AWS region.                                                                                                                                          | `""`                         |
| `reis.embeddings.bedrock.accessKeyId`                         | The AWS access key Id.                                                                                                                                   | `""`                         |
| `reis.embeddings.bedrock.secretAccessKey`                     | The AWS secret access key.                                                                                                                               | `""`                         |
| `reis.embeddings.bedrock.existingAccessKeySecret`             | Name of the Kubernetes Secret containing the Bedrock Secret Access Key. The secret must have the keys `bedrockAccessKeyId` and `bedrockSecretAccessKey`. | `""`                         |
| `reis.embeddings.nvidia.baseUrl`                              | The API URL for NVIDIA.                                                                                                                                  | `""`                         |
| `reis.embeddings.nvidia.apiKey`                               | API key for NVIDIA.                                                                                                                                      | `""`                         |
| `reis.embeddings.nvidia.existingApiKeySecret`                 | Name of the Kubernetes Secret containing the NVIDIA API Key. The key must be `nvidiaApiKey`.                                                             | `""`                         |
| `reis.embeddings.nvidia.model`                                | The model for NVIDIA.                                                                                                                                    | `""`                         |
| `reis.embeddings.ollama.endpoint`                             | The endpoint for Ollama.                                                                                                                                 | `""`                         |
| `reis.embeddings.ollama.modelName`                            | The model name for Ollama.                                                                                                                               | `""`                         |
| `reis.speechToText.type`                                      | The speech-to-text api type to use, one of: azure-openai-whisper. Leave empty to disable.                                                                | `""`                         |
| `reis.speechToText.azureOpenAiWhisper.apiKey`                 | API key for Azure OpenAI Whisper.                                                                                                                        | `""`                         |
| `reis.speechToText.azureOpenAiWhisper.existingApiKeySecret`   | Name of the Kubernetes Secret containing the Azure OpenAI Whisper API Key. The key must be `azureOpenAiWhisperApiKey`.                                   | `""`                         |
| `reis.speechToText.azureOpenAiWhisper.endpoint`               | The Azure OpenAI Whisper endpoint.                                                                                                                       | `""`                         |
| `reis.speechToText.azureOpenAiWhisper.deploymentName`         | The Azure OpenAI Whisper deployment name.                                                                                                                | `""`                         |
| `reis.speechToText.azureOpenAiWhisper.apiVersion`             | The Azure OpenAI Whisper API version.                                                                                                                    | `""`                         |
| `reis.extraEnvVars`                                           | An extra list of environment variables to add to the deployment.                                                                                         | `[]`                         |
| `reis.extraVolumes`                                           | An extra list of volumes to add to the deployment.                                                                                                       | `[]`                         |
| `reis.extraVolumeMounts`                                      | An extra list of volume mounts to add to the deployment.                                                                                                 | `[]`                         |
| `reis.resources`                                              | Set container requests and limits for different resources like CPU or memory                                                                             | `{}`                         |
| `reis.vectorDatabase.type`                                    | The search api type to use, one of: azure-ai-search, pgvector                                                                                            | `""`                         |
| `reis.vectorDatabase.azureAiSearch.apiKey`                    | API Key for Azure AI Search.                                                                                                                             | `""`                         |
| `reis.vectorDatabase.azureAiSearch.existingApiKeySecret`      | Name of the Kubernetes Secret containing the Azure AI Search API Key. The key must be `azureAiSearchApiKey`.                                             | `""`                         |
| `reis.vectorDatabase.azureAiSearch.endpoint`                  | The Azure AI Search endpoint.                                                                                                                            | `""`                         |
| `reis.vectorDatabase.azureAiSearch.indexName`                 | The Azure AI Search index.                                                                                                                               | `""`                         |
| `reis.vectorDatabase.pgVector.connectionString`               | PostgreSQL connection string for a PGVector database. Must use protocol `postgresql+psycopg://`.                                                         | `""`                         |
| `reis.vectorDatabase.pgVector.existingConnectionStringSecret` | The name of an existing k8s secret. `reis.search.connectionString` will be ignored. The key must be `connectionString`.                                  | `""`                         |
| `reis.vectorDatabase.pgVector.indexName`                      | Name of the collection used for the PGVector store (this is a logical distinction in the same table).                                                    | `""`                         |
| `reis.fileStore.type`                                         | The file store to use, one of: s3                                                                                                                        | `""`                         |
| `reis.fileStore.s3.endpointUrl`                               | The s3 compatible endpoint.                                                                                                                              | `""`                         |
| `reis.fileStore.s3.bucketName`                                | The s3 compatible bucket name.                                                                                                                           | `""`                         |
| `reis.fileStore.s3.regionName`                                | The AWS region.                                                                                                                                          | `""`                         |
| `reis.fileStore.s3.accessKeyId`                               | The s3 compatible access key Id.                                                                                                                         | `""`                         |
| `reis.fileStore.s3.secretAccessKey`                           | The s3 compatible secret access key.                                                                                                                     | `""`                         |
| `reis.fileStore.s3.existingAccessKeySecret`                   | Name of the Kubernetes Secret containing the s3 compatible secret access key. The secret must have the keys `s3AccessKeyId` and `s3SecretAccessKey`.     | `""`                         |
| `reis.workers`                                                | Number of concurrent threads to process the uploaded files                                                                                               | `2`                          |
| `reis.batchSize`                                              | Number of chunks uploaded to the vectorstore at once                                                                                                     | `100`                        |
| `reis.tmpFilesRoot`                                           | The root directory for temporary files                                                                                                                   | `""`                         |
| `reis.labels`                                                 | Map of labels to add to the REI-S deployment                                                                                                             | `{}`                         |
| `reis.annotations`                                            | Map of annotations to add to the REI-S deployment                                                                                                        | `{}`                         |
| `reis.podLabels`                                              | Map of labels to add to the REI-S pods                                                                                                                   | `{}`                         |
| `reis.podAnnotations`                                         | Map of annotations to add to the REI-S pods                                                                                                              | `{}`                         |
| `reis.podSecurityContext`                                     | Configure the Security Context for the Pod                                                                                                               | `{}`                         |
| `reis.containerSecurityContext`                               | Configure the Security Context for the Container                                                                                                         | `{}`                         |

## Migrations

### Migrating from the upstream chart

Gaible is a fork of an Apache-2.0-licensed upstream project. Compared to the upstream chart, the chart name, the
template helpers and all generated resource names have changed to `gaible`. Therefore you cannot upgrade an existing
upstream installation using `helm upgrade`. Because the chart's components are stateless, you can install this chart
alongside the old one and configure it to use the same persistence layer (your existing PostgreSQL database and vector
database). Note that the backend metrics are now prefixed with `gaible_`.

Upgrade notes for chart versions before the fork are available in the git history.
