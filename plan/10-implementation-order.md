# NexusFlow — Implementation Order

Build in this order. Each milestone is independently runnable and demonstrable.

---

## Milestone 0 — Project skeleton (Day 1)

**Goal:** Maven multi-module builds. Spring Boot starts. Database connects.

### Steps:

1. Create root Maven project with `pom.xml` declaring all 6 modules
2. Create each module directory with its own `pom.xml` inheriting from root
3. Add `nexusflow-common` first: DTOs, enums, exceptions (no Spring dependencies)
4. Add `nexusflow-api` with basic Spring Boot main class + `HealthController` returning `{"status":"UP"}`
5. Add CockroachDB dependency + Flyway. Create first migration: `V1__create_users_and_documents.sql`
6. Verify: `mvn clean install` succeeds, `GET /health` returns 200

**Test:** `curl http://localhost:8080/api/v1/health`

---

## Milestone 1 — Auth (Day 2)

**Goal:** Cognito login/JWT validation works end-to-end.

### Steps:

1. Start floci AWS emulator (`floci start`)
2. Create Cognito user pool via AWS SDK or LocalStack console
3. Add Spring Security dependency + Cognito JWT filter to `nexusflow-api`
4. Implement `AuthFilter`: validate JWT, extract `sub`, create `SecurityContext`
5. Protect all non-health endpoints with `@PreAuthorize("isAuthenticated()")`
6. Add `POST /auth/test` endpoint that returns the current user's JWT claims
7. Test with a manually generated JWT from Cognito

**Test:** `curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/users/me`

---

## Milestone 2 — Single-cloud upload (Day 3)

**Goal:** Upload a file, store to AWS S3, see it in S3.

### Steps:

1. Add `nexusflow-storage` module with AWS S3 SDK dependency
2. Implement `S3Service`: `upload(file, key)`, `getPresignedUrl(key)`, `delete(key)`
3. Add `POST /documents/upload` to `nexusflow-api`
4. Controller writes document record to CockroachDB (status: UPLOADING → READY)
5. Controller calls `S3Service.upload()` synchronously (no Kafka yet)
6. Return `DocumentDto` with S3 presigned URL

**Test:** Upload a PDF via Postman, verify it appears in floci UI at http://dj-pc:4500

---

## Milestone 3 — Kafka event pipeline (Day 4)

**Goal:** Upload triggers async Kafka event, storage happens in background.

### Steps:

1. Start Kafka (`docker compose up -d` in `docker/`)
2. Add `nexusflow-events` module with Kafka dependencies
3. Implement `KafkaEventPublisher`: publishes JSON events to any topic
4. Modify upload endpoint: write to DB + publish `nexusflow.file.uploaded` + return 202 immediately
5. Implement `StorageConsumer` in `nexusflow-events`: listens to `file.uploaded`, calls `nexusflow-storage`
6. Publish `nexusflow.file.stored` after each cloud store succeeds

**Test:** Upload → see 202 response immediately → check Kafka UI at http://dj-pc:8090

---

## Milestone 4 — Multi-cloud storage (Day 5)

**Goal:** File stored to all 4 clouds in parallel.

### Steps:

1. Add Azure Blob SDK to `nexusflow-storage`. Implement `AzureBlobService`
2. Add GCP Cloud Storage SDK. Implement `GcsService`
3. Add OCI Object Storage SDK. Implement `OciObjectStorageService`
4. Implement `StorageOrchestrator`: `CompletableFuture.allOf(s3, azure, gcs, oci).join()`
5. Each success publishes `nexusflow.file.stored` with `cloudProvider` field
6. Update CockroachDB `documents` row with all 4 storage keys after all complete

**Test:** Upload → floci UI shows file in all 4 clouds

---

## Milestone 5 — Real-time WebSocket updates (Day 6)

**Goal:** Upload progress updates appear in real time in a browser.

### Steps:

1. Add Spring WebSocket + STOMP to `nexusflow-api`
2. Implement `WebSocketConfig`: STOMP endpoint at `/ws`, broker prefix `/topic`
3. Add Redis pub/sub: Kafka consumers publish to Redis channel, WebSocket handler broadcasts to subscribers
4. Frontend: connect to WebSocket, subscribe to `/topic/documents/{id}`, show progress bar
5. Build minimal React page: just upload zone + progress display

**Test:** Drop a file → progress bar fills as each cloud confirms

---

## Milestone 6 — AI pipeline (Days 7–9)

**Goal:** Uploaded documents get classified, summarised, entities extracted, embedded.

### Steps:

1. Start Ollama (`docker compose up -d ollama`)
2. Pull models: `ollama pull llama3.2 && ollama pull nomic-embed-text`
3. Add `nexusflow-ai` module with Spring AI + Ollama dependency
4. Implement `TextExtractionService` using Apache Tika
5. Implement `ClassificationService` using Vertex AI (or Ollama fallback)
6. Implement `SummarisationService` using Bedrock (or Ollama fallback)
7. Implement `EntityExtractionService` using Comprehend
8. Implement `EmbeddingService` using Ollama `nomic-embed-text`, store in CockroachDB
9. Implement `AiConsumer` in `nexusflow-events`: chain all steps, publish progress events
10. Update CockroachDB document row with all AI results on completion

**Test:** Upload invoice → watch AI steps in Kafka UI → check document in DB has summary + tags

---

## Milestone 7 — Search (Day 10)

**Goal:** Natural language search returns relevant documents.

### Steps:

1. Add full-text search index to CockroachDB (`tsvector` column on `extracted_text`)
2. Implement keyword search: `WHERE to_tsvector(...) @@ plainto_tsquery(...)`
3. Implement vector search: embed query with Ollama, find top-k nearest chunks
4. Implement `SearchService`: runs both, merges results by score (hybrid search)
5. Add `POST /search` endpoint in `nexusflow-api`

**Test:** Upload 10 different documents → search "invoices acme corp" → correct docs surface first

---

## Milestone 8 — AI Chat (Day 11)

**Goal:** Conversational chat over documents using RAG.

### Steps:

1. Implement `RagService`: embed query → retrieve top chunks → build context → call Ollama
2. Add multi-turn conversation support via Redis
3. Add `POST /ai/chat` endpoint
4. Build chat UI in React: input, message history, source citations

**Test:** "summarise all my contracts" → LLM response citing correct document names

---

## Milestone 9 — Full frontend (Days 12–14)

**Goal:** Beautiful, complete React UI.

### Steps:

1. Set up Vite + React + Tailwind + shadcn/ui
2. Landing page with particle background (tsparticles)
3. Cognito OAuth2 login flow
4. Dashboard: upload zone + cloud status + storage overview
5. Library: grid/list view, filters, search bar
6. Document detail: PDF preview, AI results, tags, storage locations
7. Cloud topology: live event feed, cloud status cards
8. AI chat: document context picker + chat interface

---

## Milestone 10 — Pipeline & lifecycle (Day 15)

**Goal:** Scheduled jobs, archiving, Step Functions orchestration.

### Steps:

1. Add `nexusflow-pipeline` module
2. Implement `ArchiveJob` (`@Scheduled`): move files older than 30 days to OCI cold storage
3. Implement `CleanupJob`: delete expired files from all clouds
4. Implement `HealthJob`: poll all 4 clouds every 5 minutes, publish status events
5. Wire up AWS Step Functions for the AI pipeline (replaces simple Kafka chain)

---

## Milestone 11 — Prod deployment (Days 16–17)

**Goal:** App running live on Oracle Cloud + Vercel.

### Steps:

1. Oracle Cloud: provision 2 free VMs (4 ARM cores, 24GB RAM)
2. Install Docker + Docker Compose on OCI VMs
3. Set up real AWS/Azure/GCP/OCI accounts (all free tier)
4. Update environment variables to point to real clouds
5. Build Docker image for Spring Boot: `docker build -t nexusflow-api .`
6. Deploy backend on OCI with nginx reverse proxy + SSL (Let's Encrypt)
7. Deploy frontend on Vercel: `vercel deploy --prod`
8. Update Cognito callback URLs to prod domain

---

## Quick reference — build order

```
Week 1:
  Day 1: Project skeleton + DB
  Day 2: Auth (Cognito JWT)
  Day 3: Single-cloud upload (S3)
  Day 4: Kafka event pipeline
  Day 5: Multi-cloud storage (all 4)

Week 2:
  Day 6: WebSocket real-time updates + basic React
  Days 7-9: Full AI pipeline
  Day 10: Search (keyword + vector)
  Day 11: AI Chat (RAG)

Week 3:
  Days 12-14: Full React frontend
  Day 15: Scheduled jobs + archiving
  Days 16-17: Prod deployment
```

---

## Maven module dependency graph

```
nexusflow-common        (no Spring deps — just DTOs/utils)
       ↑
nexusflow-storage       (depends on common, AWS/Azure/GCP/OCI SDKs)
nexusflow-events        (depends on common, Spring Kafka)
nexusflow-ai            (depends on common, Spring AI, Tika)
nexusflow-pipeline      (depends on common, events, storage)
nexusflow-api           (depends on all modules — the executable)
```

---

## Technology versions

| Library          | Version                  |
| ---------------- | ------------------------ |
| Java             | 21 (LTS)                 |
| Spring Boot      | 3.3.x                    |
| Spring AI        | 1.0.x                    |
| Spring Kafka     | 3.2.x                    |
| Spring Security  | 6.3.x                    |
| Flyway           | 10.x                     |
| CockroachDB JDBC | 24.1.x (Postgres driver) |
| AWS SDK v2       | 2.26.x                   |
| Azure SDK        | 12.x (blob)              |
| GCP SDK          | 26.x                     |
| OCI SDK          | 3.x                      |
| Apache Tika      | 2.9.x                    |
| React            | 18.x                     |
| Vite             | 5.x                      |
| Tailwind         | 3.x                      |
| Zustand          | 4.x                      |
| TanStack Query   | 5.x                      |
| STOMP.js         | 7.x                      |
| shadcn/ui        | latest                   |
| tsparticles      | 3.x                      |
