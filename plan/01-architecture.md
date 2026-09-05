# NexusFlow — System Architecture

## High-level architecture diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (React + Tailwind)                    │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────┐  │
│  │  Upload  │ │  Doc Library │ │  AI Chat     │ │ Live Dashboard│  │
│  │   Zone   │ │  + Search    │ │  Sidebar     │ │ Cloud Topology│  │
│  └────┬─────┘ └──────┬───────┘ └──────┬───────┘ └───────┬───────┘  │
└───────┼──────────────┼────────────────┼─────────────────┼──────────┘
        │ REST/multipart│ REST           │ REST            │ WebSocket
        ▼               ▼               ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    nexusflow-api (Spring Boot)                        │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────────────────┐   │
│  │ Upload       │ │ Document     │ │ WebSocket Handler          │   │
│  │ Controller   │ │ Controller   │ │ (STOMP /topic/events)      │   │
│  └──────┬───────┘ └──────┬───────┘ └───────────────────────────┘   │
│         │                │                                           │
│  ┌──────▼───────┐ ┌──────▼───────┐                                 │
│  │ Auth Filter  │ │ Search       │                                   │
│  │ (Cognito JWT)│ │ Service      │                                   │
│  └──────────────┘ └──────────────┘                                  │
└──────────┬──────────────────────────────────────────────────────────┘
           │ Kafka publish
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Apache Kafka (MSK via floci)                       │
│                                                                       │
│  Topics:                                                              │
│  ● nexusflow.file.uploaded      ● nexusflow.file.analysed            │
│  ● nexusflow.file.stored        ● nexusflow.file.archived            │
│  ● nexusflow.ai.complete        ● nexusflow.audit.log                │
└──┬──────────┬──────────┬───────────────────────────────────────────┘
   │          │          │
   ▼          ▼          ▼
nexusflow-storage   nexusflow-ai    nexusflow-pipeline
   │                    │                   │
   ├─► AWS S3           ├─► Ollama LLM      ├─► Step Functions
   ├─► Azure Blob       ├─► Embeddings      ├─► Scheduled Jobs
   ├─► GCP Storage      └─► RAG Index       └─► Lifecycle Mgmt
   └─► OCI Object
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Data Layer                                      │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │ CockroachDB   │  │ Redis         │  │ AWS DynamoDB  │           │
│  │ (metadata,    │  │ (cache,       │  │ (fast lookup, │           │
│  │  search index)│  │  sessions,    │  │  recent docs) │           │
│  │               │  │  WS pub/sub)  │  │               │           │
│  └───────────────┘  └───────────────┘  └───────────────┘           │
│  ┌───────────────┐  ┌───────────────┐                               │
│  │ Azure         │  │ GCP Firestore │                               │
│  │ Cosmos DB     │  │ (real-time    │                               │
│  │ (user prefs)  │  │  collab state)│                               │
│  └───────────────┘  └───────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Module responsibilities

### nexusflow-common
- Shared DTOs (DocumentDto, UploadEventDto, AiResultDto)
- Enums (CloudProvider, DocumentStatus, DocumentType)
- Exception types
- Utility classes
- Spring configuration base classes

### nexusflow-api
- REST controllers (upload, documents, search, users)
- WebSocket configuration and handlers
- Spring Security + Cognito JWT filter
- Rate limiting
- API error handling (GlobalExceptionHandler)
- OpenAPI/Swagger docs

### nexusflow-storage
- AWS S3 service (upload, download, presigned URLs, delete)
- Azure Blob service (upload, download, containers)
- GCP Cloud Storage service
- OCI Object Storage service
- StorageOrchestrator: fan-out to all 4 clouds
- StorageHealthChecker: verifies all 4 clouds are reachable

### nexusflow-events
- Kafka producer (publishes all events)
- Kafka consumers:
  - StorageConsumer (routes to nexusflow-storage)
  - AiConsumer (routes to nexusflow-ai)
  - AuditConsumer (writes to OCI Streaming + CockroachDB)
  - NotificationConsumer (pushes to WebSocket via Redis pub/sub)
- Event schemas (Avro or plain JSON)
- Dead letter queue handling

### nexusflow-ai
- Spring AI configuration (Ollama provider)
- Document text extraction (from S3 via Tika)
- Embedding generation (for vector search)
- RAG pipeline (retrieve + augment + generate)
- AI chat endpoint (conversational search)
- GCP Vertex AI integration (document classification)
- AWS Bedrock integration (summarisation)
- AWS Comprehend (entity extraction: names, dates, amounts)
- AWS Rekognition (image documents: photo analysis)
- AWS Transcribe (audio/video documents)

### nexusflow-pipeline
- AWS Step Functions orchestrator (full upload pipeline)
- Spring @Scheduled jobs:
  - ArchiveJob: move 30-day-old files to OCI cold storage
  - CleanupJob: remove orphaned temp files
  - ReindexJob: rebuild AI search index
  - HealthJob: check all 4 clouds every 5 minutes
- Azure Event Grid triggers
- GCP Cloud Scheduler integration
- OCI Events for compliance audit triggers

## Request flow — file upload (detailed)

```
1.  POST /api/v1/documents/upload (multipart/form-data)
        ↓
2.  AuthFilter validates Cognito JWT token
        ↓
3.  UploadController receives file + metadata
        ↓
4.  Generates documentId (UUID)
        ↓
5.  Writes initial record to CockroachDB (status: UPLOADING)
        ↓
6.  Publishes Kafka event: nexusflow.file.uploaded
        {documentId, fileName, fileSize, mimeType, userId, timestamp}
        ↓
7.  Returns 202 Accepted + documentId to client immediately
        ↓
8.  Client subscribes to WebSocket: /topic/documents/{documentId}
        ↓
--- async from here ---
        ↓
9.  StorageConsumer receives nexusflow.file.uploaded
        ↓
10. StorageOrchestrator fans out to 4 CompletableFuture:
        ├─ S3Service.upload()     → publishes nexusflow.file.stored {cloud: AWS}
        ├─ BlobService.upload()   → publishes nexusflow.file.stored {cloud: AZURE}
        ├─ GcsService.upload()    → publishes nexusflow.file.stored {cloud: GCP}
        └─ OciService.upload()    → publishes nexusflow.file.stored {cloud: OCI}
        ↓
11. AiConsumer receives nexusflow.file.uploaded
        ↓
12. Downloads file from S3 (primary copy)
        ↓
13. Apache Tika extracts text content
        ↓
14. Step Functions workflow starts:
        State 1: ClassifyDocument    → GCP Vertex AI
        State 2: SummariseDocument   → AWS Bedrock
        State 3: ExtractEntities     → AWS Comprehend
        State 4: GenerateEmbeddings  → Ollama (local)
        State 5: IndexDocument       → CockroachDB full-text + vector
        ↓
15. Each step publishes progress to nexusflow.ai.complete
        ↓
16. NotificationConsumer receives all events
        ↓
17. Pushes real-time updates via WebSocket to browser
        ↓
18. CockroachDB record updated: status: READY
        ↓
19. Document appears in library with full AI metadata
```

## Security model

```
Authentication:  AWS Cognito (floci) → JWT tokens
Authorisation:   Spring Security role-based (ROLE_USER, ROLE_ADMIN)
File access:     Presigned URLs (time-limited, S3)
Secrets:         AWS Secrets Manager (floci) in dev, OCI Vault in prod
API keys:        GCP Secret Manager (floci)
Encryption:      AWS KMS for S3 server-side encryption
TLS:             Between all services in prod (self-signed in dev)
```

## Observability

```
Metrics:   AWS CloudWatch (custom metrics per operation)
Logs:      Azure Monitor Log Analytics (structured JSON logs)
Traces:    GCP Cloud Monitoring (distributed tracing)
Dashboards: OCI Monitoring (cost + storage breakdown)
Alerts:    AWS CloudWatch Alarms → SNS → email
```
