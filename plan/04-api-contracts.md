# NexusFlow — API Contracts

Base URL: `http://localhost:8080/api/v1`

All endpoints require `Authorization: Bearer <cognito-jwt>` unless marked public.

---

## Authentication

### POST /auth/token (public)

Exchange Cognito auth code for tokens (handled by frontend → Cognito hosted UI, not this API).

---

## Documents

### POST /documents/upload

Upload a file. Returns immediately with 202; AI processing happens async.

**Request:** `Content-Type: multipart/form-data`

```text
file       (binary, required)   — the file to upload
metadata   (JSON string, optional) — {description: "...", tags: ["custom-tag"]}
```

**Response 202:**

```json
{
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "UPLOADING",
  "websocketTopic": "/topic/documents/550e8400-e29b-41d4-a716-446655440000",
  "message": "File received. Processing in background."
}
```

**Response 400:**

```json
{
  "error": "INVALID_FILE",
  "message": "File size exceeds 100MB limit",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Response 413:**

```json
{
  "error": "FILE_TOO_LARGE",
  "message": "Maximum file size is 100MB",
  "maxSizeBytes": 104857600
}
```

---

### GET /documents

List the authenticated user's documents.

**Query parameters:**

```text
page        (int, default 0)
size        (int, default 20, max 100)
sort        (string, default "createdAt")   — createdAt, fileName, fileSize
direction   (string, default "desc")        — asc, desc
type        (string, optional)              — INVOICE, CONTRACT, REPORT, RECEIPT, IMAGE, AUDIO, OTHER
status      (string, optional)              — UPLOADING, PROCESSING, READY, FAILED, ARCHIVED
tags        (string[], optional)            — ?tags=invoice&tags=2024
archived    (boolean, optional, default false)
```

**Response 200:**

```json
{
  "content": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "fileName": "invoice-jan-2024.pdf",
      "mimeType": "application/pdf",
      "fileSizeBytes": 245760,
      "documentType": "INVOICE",
      "status": "READY",
      "summary": "Invoice from Acme Corp for $1,250 for web development services.",
      "aiTags": ["invoice", "acme-corp", "web-development"],
      "sentiment": "NEUTRAL",
      "confidenceScore": 0.9823,
      "storageLocations": {
        "awsS3Url": "https://presigned-url...",
        "azureBlobUrl": "https://presigned-url...",
        "gcpStorageUrl": "https://presigned-url...",
        "ociObjectUrl": "https://presigned-url...",
        "isArchived": false
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:45Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 142,
  "totalPages": 8
}
```

---

### GET /documents/{documentId}

Get a single document with full details.

**Response 200:** Full DocumentDto (same as list item above, plus `extractedText`, `entities`)

```json
{
  "id": "...",
  "entities": {
    "organizations": ["Acme Corp"],
    "dates": ["January 2024"],
    "amounts": ["$1,250.00"],
    "persons": [],
    "locations": []
  },
  "extractedText": "INVOICE\n\nFrom: Acme Corp\n...",
  "...": "all other fields"
}
```

**Response 404:**

```json
{
  "error": "DOCUMENT_NOT_FOUND",
  "documentId": "...",
  "timestamp": "..."
}
```

---

### DELETE /documents/{documentId}

Soft-delete a document (sets `deleted_at`). Async — removes from all 4 clouds in background.

**Response 202:**

```json
{
  "documentId": "...",
  "message": "Document deletion scheduled across all clouds."
}
```

---

### PATCH /documents/{documentId}

Update document metadata.

**Request:**

```json
{
  "description": "Updated description",
  "tags": ["invoice", "2024", "paid"],
  "expiresAt": "2025-01-01T00:00:00Z"
}
```

**Response 200:** Updated DocumentDto

---

### POST /documents/{documentId}/archive

Move to OCI cold storage.

**Response 202:**

```json
{
  "documentId": "...",
  "message": "Archive scheduled. Document will move to OCI Object Storage."
}
```

---

### POST /documents/{documentId}/restore

Restore from archive back to active storage.

**Response 202:**

```json
{
  "documentId": "...",
  "message": "Restore scheduled. Document will be available within 5 minutes."
}
```

---

### GET /documents/{documentId}/download

Get presigned download URLs from all clouds.

**Response 200:**

```json
{
  "documentId": "...",
  "fileName": "invoice-jan-2024.pdf",
  "expiresAt": "2024-01-15T11:30:00Z",
  "urls": {
    "AWS_S3": "https://s3.amazonaws.com/...",
    "AZURE_BLOB": "https://devstoreaccount1.blob...",
    "GCP_STORAGE": "https://storage.googleapis.com/...",
    "OCI_OBJECT": "https://objectstorage.us-..."
  }
}
```

---

## Search

### POST /search

Natural language or keyword search across all user documents.

**Request:**

```json
{
  "query": "find all invoices from acme corp last quarter",
  "documentType": null,
  "tags": [],
  "dateFrom": null,
  "dateTo": null,
  "cloudProvider": null,
  "page": 0,
  "size": 20,
  "sortBy": "createdAt",
  "sortDir": "desc"
}
```

**Response 200:**

```json
{
  "query": "find all invoices from acme corp last quarter",
  "results": [
    {
      "document": { "...DocumentDto..." },
      "score": 0.9712,
      "matchedFields": ["fileName", "aiTags", "summary"],
      "highlights": {
        "summary": "Invoice from <em>Acme Corp</em> for..."
      }
    }
  ],
  "totalResults": 5,
  "searchTimeMs": 45,
  "searchStrategy": "HYBRID"
}
```

---

### GET /search/suggestions

Autocomplete suggestions.

**Query params:** `q=inv`

**Response 200:**

```json
{
  "suggestions": ["invoice", "invoice jan 2024", "invoices acme corp"],
  "recentSearches": ["payslip march", "contracts 2023"]
}
```

---

## AI Chat

### POST /ai/chat

Conversational chat over user's document library (RAG).

**Request:**

```json
{
  "message": "Summarise all contracts from last year and highlight the ones still active",
  "conversationId": null,
  "documentIds": []
}
```

**Response 200:**

```json
{
  "message": "You have 7 contracts from 2023. Of these, 3 appear to be active based on their end dates:\n\n1. **Service Agreement – TechVendor Ltd** (expires Dec 2025)...",
  "conversationId": "conv-abc123",
  "sources": [
    {
      "documentId": "...",
      "fileName": "service-agreement-techvendor.pdf",
      "excerpt": "...this agreement shall continue until December 31, 2025...",
      "relevanceScore": 0.95
    }
  ],
  "processingTimeMs": 2341
}
```

---

### POST /ai/analyse/{documentId}

Re-run AI analysis on a document.

**Response 202:**

```json
{
  "documentId": "...",
  "message": "AI re-analysis started. Updates will arrive via WebSocket."
}
```

---

## Shares

### POST /shares

Create a share link.

**Request:**

```json
{
  "documentId": "...",
  "sharedWithEmail": "colleague@example.com",
  "permission": "VIEW",
  "expiresAt": "2024-02-01T00:00:00Z"
}
```

**Response 201:**

```json
{
  "shareToken": "abc123xyz",
  "shareUrl": "http://localhost:5173/share/abc123xyz",
  "expiresAt": "2024-02-01T00:00:00Z"
}
```

---

### GET /share/{token} (public)

Access a shared document.

**Response 200:** DocumentDto (limited fields — no extractedText, no storageLocations)

---

### DELETE /shares/{shareToken}

Revoke a share.

**Response 204:** No content

---

## Users

### GET /users/me

Get current user profile.

**Response 200:**

```json
{
  "id": "...",
  "email": "divya@example.com",
  "displayName": "Divya",
  "role": "USER",
  "storageUsedBytes": 52428800,
  "storageUsedMb": 50,
  "storageLimitBytes": 5368709120,
  "storageLimitGb": 5,
  "storagePercentUsed": 1.0,
  "documentCount": 142,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### PUT /users/me/preferences

Update user preferences.

**Request:**

```json
{
  "theme": "dark",
  "defaultView": "grid",
  "defaultSort": "createdAt_desc",
  "notificationsEnabled": true,
  "aiAutoAnalyse": true,
  "storagePreferences": {
    "archiveAfterDays": 30,
    "autoDeleteAfterDays": null
  }
}
```

**Response 200:** Updated preferences object

---

## Health & Cloud Status

### GET /health (public)

Application health check.

**Response 200:**

```json
{
  "status": "UP",
  "modules": {
    "database": "UP",
    "kafka": "UP",
    "redis": "UP"
  }
}
```

---

### GET /health/clouds

Cloud connectivity status.

**Response 200:**

```json
{
  "clouds": {
    "AWS": {
      "status": "UP",
      "endpoint": "http://dj-pc:4566",
      "services": ["S3", "SQS", "DynamoDB", "Cognito"],
      "latencyMs": 12
    },
    "AZURE": {
      "status": "UP",
      "endpoint": "http://dj-pc:4577",
      "services": ["Blob", "Queue", "CosmosDB"],
      "latencyMs": 8
    },
    "GCP": {
      "status": "UP",
      "endpoint": "http://dj-pc:4588",
      "services": ["Storage", "PubSub", "Firestore"],
      "latencyMs": 10
    },
    "OCI": {
      "status": "UP",
      "endpoint": "http://dj-pc:4599",
      "services": ["ObjectStorage", "Streaming"],
      "latencyMs": 15
    }
  },
  "checkedAt": "2024-01-15T10:30:00Z"
}
```

---

## WebSocket (STOMP)

Connect to: `ws://localhost:8080/ws`

### Subscribe: /topic/documents/{documentId}

Real-time document processing updates.

**Message payload:**

```json
{
  "documentId": "...",
  "eventType": "STORED_AWS",
  "progress": 25,
  "message": "Stored to AWS S3 (1/4 clouds)",
  "timestamp": "2024-01-15T10:30:01Z"
}
```

Possible `eventType` values:

- `STORED_AWS` — progress 25%
- `STORED_AZURE` — progress 50%
- `STORED_GCP` — progress 75%
- `STORED_OCI` — progress 87%
- `AI_STARTED` — AI pipeline begins
- `AI_CLASSIFIED` — Vertex AI result
- `AI_SUMMARISED` — Bedrock summary
- `AI_ENTITIES` — Comprehend entities
- `AI_COMPLETE` — all done, progress 100%
- `FAILED` — error state

### Subscribe: /topic/cloud-health

Cloud health heartbeat every 30s.

### Subscribe: /topic/activity/{userId}

User-specific activity feed (uploads, shares, logins from new device).

---

## Error response format

All error responses follow this structure:

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "field": "fieldName (only for validation errors)",
  "timestamp": "2024-01-15T10:30:00Z",
  "traceId": "abc123 (for support)"
}
```

HTTP status codes:

- `200` OK
- `201` Created
- `202` Accepted (async operation started)
- `204` No Content
- `400` Bad Request (validation error)
- `401` Unauthorized (missing/invalid JWT)
- `403` Forbidden (valid JWT, wrong role)
- `404` Not Found
- `409` Conflict (duplicate)
- `413` Payload Too Large
- `429` Too Many Requests (rate limited)
- `500` Internal Server Error
- `503` Service Unavailable (cloud down)
