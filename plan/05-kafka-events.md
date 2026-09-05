# NexusFlow — Kafka Events

All topics use JSON serialization. Each event has a common envelope.

## Common event envelope

```json
{
  "eventId": "uuid v4 — unique per event",
  "eventType": "SCREAMING_SNAKE_CASE string",
  "documentId": "uuid",
  "userId": "uuid",
  "correlationId": "uuid — ties all events for one upload together",
  "timestamp": "ISO 8601",
  "version": "1.0"
}
```

---

## Topics

### nexusflow.file.uploaded

Published by: `nexusflow-api` → `UploadController`
Consumed by: `nexusflow-storage` (StorageConsumer), `nexusflow-ai` (AiConsumer), `nexusflow-pipeline` (PipelineConsumer)
Partitions: 12 (by userId for ordering per user)

```json
{
  "eventId": "evt-001",
  "eventType": "FILE_UPLOADED",
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-uuid",
  "correlationId": "corr-uuid",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0",
  "payload": {
    "fileName": "invoice-jan-2024.pdf",
    "originalName": "Invoice January 2024.pdf",
    "mimeType": "application/pdf",
    "fileSizeBytes": 245760,
    "tempS3Key": "temp/550e8400/invoice-jan-2024.pdf",
    "checksum": "sha256:abc123...",
    "uploadSource": "WEB",
    "clientIp": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

---

### nexusflow.file.stored

Published by: `nexusflow-storage` → `StorageService` (once per cloud)
Consumed by: `nexusflow-events` (AuditConsumer), `nexusflow-api` (NotificationConsumer → WebSocket)
Partitions: 12

```json
{
  "eventId": "evt-002",
  "eventType": "FILE_STORED",
  "documentId": "...",
  "userId": "...",
  "correlationId": "...",
  "timestamp": "2024-01-15T10:30:01Z",
  "version": "1.0",
  "payload": {
    "cloudProvider": "AWS",
    "bucket": "nexusflow-documents",
    "storageKey": "documents/550e8400/invoice-jan-2024.pdf",
    "region": "us-east-1",
    "storageClass": "STANDARD",
    "etag": "abc123",
    "versionId": "xyz789",
    "durationMs": 342,
    "success": true,
    "errorMessage": null
  }
}
```

Emitted 4 times — once for AWS, AZURE, GCP, OCI.

---

### nexusflow.file.stored.failed

Published by: `nexusflow-storage` on upload failure
Consumed by: `nexusflow-pipeline` (RetryConsumer), `nexusflow-events` (AuditConsumer)

```json
{
  "eventType": "FILE_STORED_FAILED",
  "payload": {
    "cloudProvider": "AZURE",
    "errorCode": "SERVICE_UNAVAILABLE",
    "errorMessage": "Connection timeout after 30s",
    "attemptNumber": 1,
    "willRetry": true,
    "nextRetryAt": "2024-01-15T10:30:31Z"
  }
}
```

---

### nexusflow.ai.started

Published by: `nexusflow-ai` → `AiConsumer` when processing begins
Consumed by: `nexusflow-api` (NotificationConsumer)

```json
{
  "eventType": "AI_STARTED",
  "payload": {
    "pipeline": ["CLASSIFY", "SUMMARISE", "EXTRACT_ENTITIES", "EMBED", "INDEX"],
    "currentStep": "CLASSIFY",
    "estimatedMs": 3000
  }
}
```

---

### nexusflow.ai.step.complete

Published by: `nexusflow-ai` after each AI pipeline step
Consumed by: `nexusflow-api` (NotificationConsumer → WebSocket)

```json
{
  "eventType": "AI_STEP_COMPLETE",
  "payload": {
    "step": "CLASSIFY",
    "result": {
      "documentType": "INVOICE",
      "confidence": 0.9823,
      "provider": "GCP_VERTEX_AI"
    },
    "nextStep": "SUMMARISE",
    "stepDurationMs": 891
  }
}
```

---

### nexusflow.ai.complete

Published by: `nexusflow-ai` when full pipeline finishes
Consumed by: `nexusflow-storage` (updates CockroachDB), `nexusflow-events` (AuditConsumer), `nexusflow-api` (NotificationConsumer)

```json
{
  "eventType": "AI_COMPLETE",
  "payload": {
    "documentType": "INVOICE",
    "summary": "Invoice from Acme Corp for $1,250 for web development services in January 2024.",
    "tags": ["invoice", "acme-corp", "web-development", "2024"],
    "entities": {
      "organizations": ["Acme Corp"],
      "dates": ["January 2024"],
      "amounts": ["$1,250.00"],
      "persons": [],
      "locations": []
    },
    "sentiment": "NEUTRAL",
    "sentimentScores": {
      "positive": 0.05,
      "negative": 0.02,
      "neutral": 0.93,
      "mixed": 0.0
    },
    "confidence": 0.9823,
    "embeddingId": "vec_abc123",
    "processingTimeMs": 2341,
    "stepsCompleted": [
      "CLASSIFY",
      "SUMMARISE",
      "EXTRACT_ENTITIES",
      "EMBED",
      "INDEX"
    ]
  }
}
```

---

### nexusflow.ai.failed

Published by: `nexusflow-ai` on pipeline failure

```json
{
  "eventType": "AI_FAILED",
  "payload": {
    "failedStep": "SUMMARISE",
    "errorCode": "BEDROCK_THROTTLE",
    "errorMessage": "Rate limit exceeded",
    "partialResults": {
      "documentType": "INVOICE",
      "confidence": 0.9823
    },
    "willRetry": true,
    "retryAt": "2024-01-15T10:31:00Z"
  }
}
```

---

### nexusflow.document.archived

Published by: `nexusflow-pipeline` → `ArchiveJob`
Consumed by: `nexusflow-events` (AuditConsumer), `nexusflow-api` (NotificationConsumer)

```json
{
  "eventType": "DOCUMENT_ARCHIVED",
  "payload": {
    "reason": "NOT_ACCESSED_30_DAYS",
    "lastAccessedAt": "2023-12-15T00:00:00Z",
    "ociStorageTier": "ARCHIVE",
    "originalCloudKeys": {
      "AWS": "documents/...",
      "AZURE": "documents/...",
      "GCP": "documents/..."
    },
    "freedStorageBytes": 245760
  }
}
```

---

### nexusflow.document.deleted

Published by: `nexusflow-api` → `DocumentService`
Consumed by: `nexusflow-storage` (deletes from all clouds), `nexusflow-events` (AuditConsumer)

```json
{
  "eventType": "DOCUMENT_DELETED",
  "payload": {
    "deletionType": "SOFT",
    "reason": "USER_REQUESTED",
    "clouds": ["AWS", "AZURE", "GCP", "OCI"]
  }
}
```

---

### nexusflow.audit.log

Published by: every module for every significant action
Consumed by: `nexusflow-pipeline` → `OciStreamingWriter` (compliance audit)

```json
{
  "eventType": "AUDIT_LOG",
  "payload": {
    "action": "DOCUMENT_DOWNLOADED",
    "resourceType": "DOCUMENT",
    "resourceId": "...",
    "ipAddress": "192.168.1.1",
    "userAgent": "Chrome/120",
    "outcome": "SUCCESS",
    "durationMs": 234,
    "cloudProvider": "AWS",
    "additionalContext": {
      "presignedUrlExpiry": "2024-01-15T11:30:00Z"
    }
  }
}
```

---

### nexusflow.user.activity

Published by: `nexusflow-api` on user actions (login, search, upload)
Consumed by: `nexusflow-pipeline` → `BigQueryWriter` (analytics), `nexusflow-events` (ActivityFeedConsumer)

```json
{
  "eventType": "USER_ACTIVITY",
  "documentId": null,
  "payload": {
    "activityType": "SEARCH",
    "query": "invoices from last month",
    "resultCount": 5,
    "searchTimeMs": 45,
    "searchStrategy": "HYBRID",
    "sessionId": "sess-abc123"
  }
}
```

---

## Topic configuration

```yaml
Topics:
  nexusflow.file.uploaded:
    partitions: 12
    replication: 3
    retention: 7 days
    key: userId (for ordering)

  nexusflow.file.stored:
    partitions: 12
    replication: 3
    retention: 7 days
    key: documentId

  nexusflow.file.stored.failed:
    partitions: 4
    replication: 3
    retention: 30 days  (longer — for debugging)

  nexusflow.ai.started:
    partitions: 8
    replication: 3
    retention: 3 days

  nexusflow.ai.step.complete:
    partitions: 8
    replication: 3
    retention: 3 days

  nexusflow.ai.complete:
    partitions: 12
    replication: 3
    retention: 30 days

  nexusflow.ai.failed:
    partitions: 4
    replication: 3
    retention: 30 days

  nexusflow.document.archived:
    partitions: 4
    replication: 3
    retention: 90 days

  nexusflow.document.deleted:
    partitions: 4
    replication: 3
    retention: 90 days

  nexusflow.audit.log:
    partitions: 12
    replication: 3
    retention: 365 days  (compliance)

  nexusflow.user.activity:
    partitions: 12
    replication: 3
    retention: 30 days

  nexusflow.dlq:   (dead letter queue)
    partitions: 4
    replication: 3
    retention: 30 days
```

---

## Consumer groups

| Consumer Group                 | Module             | Topics                                                                   |
| ------------------------------ | ------------------ | ------------------------------------------------------------------------ |
| `nexusflow-storage-group`      | nexusflow-storage  | file.uploaded                                                            |
| `nexusflow-ai-group`           | nexusflow-ai       | file.uploaded                                                            |
| `nexusflow-pipeline-group`     | nexusflow-pipeline | file.stored, ai.complete, document.deleted                               |
| `nexusflow-audit-group`        | nexusflow-events   | file.stored, ai.complete, document.archived, document.deleted, audit.log |
| `nexusflow-notification-group` | nexusflow-api      | file.stored, ai.step.complete, ai.complete, ai.failed, document.archived |
| `nexusflow-analytics-group`    | nexusflow-pipeline | user.activity, ai.complete                                               |
| `nexusflow-retry-group`        | nexusflow-pipeline | file.stored.failed, ai.failed                                            |

---

## Kafka producer config (Spring)

```yaml
spring:
  kafka:
    bootstrap-servers: dj-pc:9092 # broker runs on dj-pc and advertises dj-pc:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      acks: all
      retries: 3
      properties:
        enable.idempotence: true
        max.in.flight.requests.per.connection: 5
        delivery.timeout.ms: 120000
```

---

## Kafka consumer config (Spring)

```yaml
spring:
  kafka:
    consumer:
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      auto-offset-reset: earliest
      enable-auto-commit: false
      properties:
        spring.json.trusted.packages: com.nexusflow.*
    listener:
      ack-mode: MANUAL_IMMEDIATE
      concurrency: 3
```
