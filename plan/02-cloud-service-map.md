# NexusFlow — Cloud Service Map

Every cloud service used, why it's used, and what it teaches.

## AWS (floci :4566)

| Service | How NexusFlow uses it | What you learn |
|---------|----------------------|----------------|
| **S3** | Primary document storage. Every uploaded file stored here first. Versioning enabled. Presigned URLs for secure downloads. | S3 SDK v2, buckets, multipart upload, versioning, presigned URLs, object lifecycle |
| **SQS** | Dead letter queue for failed processing jobs. Retry queue for transient failures. | SQS standard + FIFO queues, DLQ, visibility timeout, message attributes |
| **SNS** | Fan-out notifications. When upload completes, SNS topic notifies email + SQS + Lambda simultaneously. | SNS topics, subscriptions, fan-out pattern, filtering |
| **DynamoDB** | Fast document metadata lookup by documentId. Hot path — used on every document open. | DynamoDB tables, GSI, single-table design, TTL, batch operations |
| **Lambda** | Thumbnail generator: triggered on S3 upload event, generates preview image, stores back to S3. | Lambda, S3 event triggers, function URLs, cold starts |
| **Cognito** | User authentication. Login/signup/JWT token issuance. | OAuth2, OIDC, JWT, user pools, app clients, auth flows |
| **KMS** | Encryption key for S3 server-side encryption. | KMS keys, CMK, envelope encryption |
| **Secrets Manager** | Stores DB password, API keys. Spring Boot reads on startup. | Secrets rotation, SDK integration, Spring Cloud AWS |
| **Step Functions** | Orchestrates the 5-step AI pipeline (classify → summarise → extract → embed → index). | ASL, state machine, task states, error handling, retries |
| **EventBridge** | Scheduled rules: trigger archive job daily at 2am. | EventBridge rules, cron expressions, Lambda targets |
| **EventBridge Scheduler** | Per-document scheduled deletion (if user sets expiry). | Scheduler groups, one-time schedules, flexible windows |
| **Bedrock Runtime** | Document summarisation. Sends extracted text, gets 3-sentence summary. | Bedrock InvokeModel, model selection, prompt engineering |
| **Comprehend** | Entity extraction from document text: names, dates, monetary amounts, locations. | NLP APIs, entity types, confidence scores |
| **Rekognition** | For image uploads (scanned documents, photos): detects text in images, object labels. | Image analysis, text detection, label detection |
| **Transcribe** | For audio/video uploads: transcribes to text so they can be searched. | Speech-to-text, async transcription jobs, S3 integration |
| **CloudWatch Logs** | All Spring Boot logs shipped here. Log groups per module. | Structured logging, log groups, metric filters, alarms |
| **CloudWatch Metrics** | Custom metrics: uploads/minute, AI processing time, storage per cloud. | PutMetricData, namespaces, dashboards, alarms |
| **API Gateway (HTTP)** | Lambda thumbnail URL exposed via API Gateway. | HTTP APIs, Lambda proxy integration, stages |
| **MSK (Kafka)** | The main Kafka cluster for NexusFlow's event backbone. | Kafka on AWS, broker configuration, topic setup |
| **IAM** | Service roles for Spring Boot to access S3, DynamoDB, Bedrock, etc. | Roles, policies, instance profiles, least privilege |
| **SSM Parameter Store** | Non-secret config: S3 bucket names, region, feature flags. | Parameter Store hierarchy, GetParametersByPath |
| **Athena** | Ad-hoc analytics: "how many documents were uploaded this week by type?" | Athena, Glue catalog, S3 data lake, SQL over S3 |
| **S3 Vectors** | Vector storage for document embeddings (semantic search index). | Vector indexes, cosine similarity queries |

## Azure (floci-az :4577)

| Service | How NexusFlow uses it | What you learn |
|---------|----------------------|----------------|
| **Blob Storage** | Backup copy of every document. Separate container per document type. | Azure Blob SDK, containers, block blobs, access tiers |
| **Queue Storage** | Backup event queue. If Kafka is down, Azure Queue catches the event. | Azure Queue messages, visibility timeout, poison messages |
| **Service Bus** | Enterprise messaging for notification events (email, webhook triggers). | Service Bus queues vs topics, sessions, DLQ, AMQP |
| **Event Hubs** | High-throughput audit log stream. Every document event streamed here. | Event Hubs, consumer groups, Kafka protocol compatibility |
| **Event Grid** | Triggers Azure Function when new file arrives in Blob Storage. | Event Grid topics, subscriptions, event schema |
| **Azure Functions** | Virus scan: triggered on blob upload, scans file, updates status. | Functions, blob trigger, output bindings |
| **Cosmos DB** | User preferences and settings (theme, default view, notification prefs). | Cosmos DB SDK, partitioning, consistency levels, RUs |
| **Azure SQL** | Relational backup of document metadata (redundancy for CockroachDB). | JDBC, Azure SQL connection string, Spring Data |
| **Key Vault** | Stores Azure-specific secrets and encryption keys. | Key Vault secrets, keys, certificates, RBAC |
| **App Configuration** | Feature flags: "enable AI chat", "enable OCI archiving". | App Config SDK, feature management, Spring integration |
| **Managed Identity** | Spring Boot authenticates to Azure services without credentials. | Managed Identity, DefaultAzureCredential, token flow |
| **API Management** | Rate limiting and API gateway for the NexusFlow REST API in prod. | APIM policies, rate limiting, JWT validation |
| **Azure Monitor** | Centralised log aggregation. All 4 clouds' logs aggregated here. | Log Analytics workspace, KQL queries, workbooks |
| **Communication Services** | Sends email notifications: "your document is ready", "upload failed". | Email SDK, sender domains, template rendering |
| **Container Registry** | Stores Docker images for NexusFlow modules. | ACR, docker push/pull, image tagging |
| **AKS** | Kubernetes cluster for running NexusFlow in prod (optional). | AKS, kubectl, deployments, services, ingress |
| **Cache for Redis** | Session storage, WebSocket pub/sub, hot document cache. | Azure Redis SDK, Spring Session, pub/sub |
| **Entra ID** | Enterprise SSO: login with corporate Microsoft account. | OAuth2, PKCE, token validation, Spring Security |

## GCP (floci-gcp :4588)

| Service | How NexusFlow uses it | What you learn |
|---------|----------------------|----------------|
| **Cloud Storage** | AI processing copy. Document sent here before Vertex AI analysis. | GCS SDK, buckets, signed URLs, CORS config |
| **Pub/Sub** | Analytics event stream. Every user action published for analytics. | Pub/Sub topics, subscriptions, push vs pull, ack |
| **Firestore** | Real-time collaboration: shared document annotations, comments. | Firestore SDK, real-time listeners, transactions |
| **Cloud Run** | OCR microservice: container running Tesseract for scanned PDFs. | Cloud Run, container deployment, HTTP triggers |
| **Cloud Functions** | Webhook relay: receives external webhook, publishes to Pub/Sub. | Cloud Functions, HTTP triggers, Pub/Sub publish |
| **Vertex AI** | Document classification: invoice/contract/report/receipt/other. | Vertex AI SDK, model endpoints, prediction requests |
| **Natural Language API** | Sentiment analysis on document content (positive/negative/neutral). | NL API, sentiment + entity analysis |
| **BigQuery** | Analytics warehouse: document processing metrics, user activity. | BigQuery SDK, datasets, tables, streaming inserts |
| **Cloud Scheduler** | Triggers reindex job every Sunday at 3am. | Scheduler jobs, cron, HTTP targets |
| **Cloud Workflows** | Alternative pipeline orchestration (GCP-native Step Functions). | Workflows YAML, steps, parallel branches |
| **Secret Manager** | GCP-specific secrets: Vertex AI service account key. | Secret Manager SDK, versions, IAM |
| **Firebase Auth** | Mobile-friendly auth alternative to Cognito. | Firebase Auth SDK, custom tokens, REST API |
| **Cloud Monitoring** | Distributed tracing across all Spring Boot modules. | Cloud Trace, custom spans, latency analysis |
| **Cloud DNS** | DNS management for prod domain. | DNS zones, A records, TTL |
| **Cloud SQL** | PostgreSQL instance for CockroachDB failover (prod). | Cloud SQL, JDBC, connection pooling, IAM auth |

## OCI (floci-oci :4599)

| Service | How NexusFlow uses it | What you learn |
|---------|----------------------|----------------|
| **Object Storage** | Cold/archive storage. Files not accessed in 30 days moved here. | OCI SDK, namespaces, buckets, storage tiers |
| **Streaming** | Compliance audit log. Immutable record of every access/action. | OCI Streaming (Kafka-compatible), producer/consumer |
| **Queue** | Backup job queue for archive/restore jobs. | OCI Queue, messages, visibility |
| **Autonomous Database** | Compliance reports: who accessed what, when, from where. | ADB SDK, JDBC, Spring Data |
| **Vault** | Master encryption keys for production. | OCI Vault, keys, secrets, encryption |
| **Events** | Compliance trigger: alert when file is accessed by a new IP. | OCI Events, rules, streaming targets |
| **Monitoring** | Cost dashboard: storage used per cloud, per user, per month. | OCI Monitoring, metrics, alarms |
| **Logging** | Centralised log archive for compliance (90-day retention). | OCI Logging, log groups, log objects |
| **IAM** | Service accounts for Spring Boot to authenticate with OCI. | OCI IAM, compartments, policies, instance principals |
| **Container Engine (OKE)** | Kubernetes for prod deployment (OCI free tier has 2 VMs). | OKE, node pools, kubectl, load balancers |
| **Load Balancer** | Routes prod traffic to Spring Boot instances. | OCI LB, backends, health checks, SSL |

## Service interaction diagram

```
                    ┌─────────────────────────────┐
                    │         KAFKA TOPICS         │
                    │                              │
   ┌────────────────┤  nexusflow.file.uploaded     ├─────────────┐
   │                │  nexusflow.file.stored       │             │
   │                │  nexusflow.ai.complete       │             │
   │                │  nexusflow.audit.log         │             │
   │                └─────────────┬────────────────┘             │
   │                              │                               │
   ▼                              ▼                               ▼
AWS Services              GCP Services                    Azure Services
S3 (primary store)        Cloud Storage (AI copy)         Blob (backup)
DynamoDB (hot lookup)     Vertex AI (classify)            Service Bus (notify)
Bedrock (summarise)       Pub/Sub (analytics)             Cosmos DB (prefs)
Comprehend (entities)     Firestore (realtime)            Key Vault (secrets)
Step Functions (pipeline) BigQuery (analytics)            Event Hubs (audit)
Cognito (auth)            Cloud Run (OCR)                 Functions (virus scan)
CloudWatch (metrics)      Secret Manager (keys)           Monitor (logs)
Secrets Manager (secrets) Cloud Monitoring (traces)       Redis (cache/sessions)
                                  │
                                  ▼
                          OCI Services
                          Object Storage (archive)
                          Streaming (compliance log)
                          Vault (encryption keys)
                          Monitoring (cost dashboard)
                          Autonomous DB (compliance reports)
```
