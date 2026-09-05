# NexusFlow — Data Models

## CockroachDB schema (primary metadata store)

### documents table
```sql
CREATE TABLE documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,
    file_name           VARCHAR(500) NOT NULL,
    original_name       VARCHAR(500) NOT NULL,
    mime_type           VARCHAR(100) NOT NULL,
    file_size_bytes     BIGINT NOT NULL,
    document_type       VARCHAR(50),        -- INVOICE, CONTRACT, REPORT, RECEIPT, IMAGE, AUDIO, OTHER
    status              VARCHAR(50) NOT NULL DEFAULT 'UPLOADING',
                                            -- UPLOADING, PROCESSING, READY, FAILED, ARCHIVED
    
    -- Storage locations
    s3_key              VARCHAR(1000),       -- AWS S3 object key
    azure_blob_name     VARCHAR(1000),       -- Azure Blob object name
    gcs_object_name     VARCHAR(1000),       -- GCP Cloud Storage object name
    oci_object_name     VARCHAR(1000),       -- OCI Object Storage object name
    
    -- AI results
    summary             TEXT,               -- Bedrock-generated summary
    ai_tags             TEXT[],             -- array of tags: ['invoice', 'Q1', '2024']
    entities            JSONB,              -- Comprehend entities: {names:[], dates:[], amounts:[]}
    sentiment           VARCHAR(20),        -- POSITIVE, NEGATIVE, NEUTRAL, MIXED
    classification      VARCHAR(50),        -- Vertex AI classification result
    confidence_score    DECIMAL(5,4),       -- 0.0000 to 1.0000
    extracted_text      TEXT,               -- full OCR/extracted text content
    embedding_id        VARCHAR(200),       -- reference to vector in S3 Vectors
    
    -- Lifecycle
    is_archived         BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at         TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,        -- user-set expiry date
    last_accessed_at    TIMESTAMPTZ,
    access_count        INTEGER DEFAULT 0,
    
    -- Audit
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,        -- soft delete

    INDEX idx_documents_user_id (user_id),
    INDEX idx_documents_status (status),
    INDEX idx_documents_type (document_type),
    INDEX idx_documents_created_at (created_at DESC),
    INDEX idx_documents_tags USING GIN (ai_tags),
    INDEX idx_documents_entities USING GIN (entities)
);
```

### users table
```sql
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_sub         VARCHAR(200) UNIQUE NOT NULL,  -- Cognito user sub
    email               VARCHAR(500) UNIQUE NOT NULL,
    display_name        VARCHAR(200),
    avatar_url          VARCHAR(1000),
    role                VARCHAR(50) NOT NULL DEFAULT 'USER',  -- USER, ADMIN
    storage_used_bytes  BIGINT NOT NULL DEFAULT 0,
    storage_limit_bytes BIGINT NOT NULL DEFAULT 5368709120,   -- 5GB default
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at       TIMESTAMPTZ
);
```

### document_events table (audit trail)
```sql
CREATE TABLE document_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id         UUID NOT NULL REFERENCES documents(id),
    user_id             UUID NOT NULL,
    event_type          VARCHAR(100) NOT NULL,
    -- UPLOAD_STARTED, STORED_AWS, STORED_AZURE, STORED_GCP, STORED_OCI,
    -- AI_STARTED, AI_CLASSIFIED, AI_SUMMARISED, AI_ENTITIES_EXTRACTED,
    -- AI_COMPLETE, DOWNLOAD, SHARE, DELETE, ARCHIVE, RESTORE
    event_data          JSONB,
    cloud_provider      VARCHAR(20),         -- AWS, AZURE, GCP, OCI
    duration_ms         INTEGER,
    error_message       TEXT,
    ip_address          INET,
    user_agent          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    INDEX idx_events_document_id (document_id),
    INDEX idx_events_user_id (user_id),
    INDEX idx_events_type (event_type),
    INDEX idx_events_created_at (created_at DESC)
);
```

### shares table
```sql
CREATE TABLE shares (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id         UUID NOT NULL REFERENCES documents(id),
    created_by_user_id  UUID NOT NULL,
    share_token         VARCHAR(100) UNIQUE NOT NULL,
    shared_with_email   VARCHAR(500),        -- null = public link
    permission          VARCHAR(20) NOT NULL DEFAULT 'VIEW',  -- VIEW, DOWNLOAD
    expires_at          TIMESTAMPTZ,
    access_count        INTEGER DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### tags table
```sql
CREATE TABLE tags (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,
    name                VARCHAR(100) NOT NULL,
    color               VARCHAR(7) NOT NULL DEFAULT '#6366f1',  -- hex color
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name)
);

CREATE TABLE document_tags (
    document_id         UUID NOT NULL REFERENCES documents(id),
    tag_id              UUID NOT NULL REFERENCES tags(id),
    added_by            VARCHAR(20) NOT NULL DEFAULT 'USER',  -- USER or AI
    PRIMARY KEY (document_id, tag_id)
);
```

## DynamoDB table (hot path fast lookup)

### Table: nexusflow-documents
```
Partition key: documentId (String)
Sort key: none

Attributes:
- documentId (S)
- userId (S)
- fileName (S)
- status (S)
- s3Key (S)
- documentType (S)
- summary (S)            ← short summary for list view
- aiTags (SS)            ← string set
- fileSize (N)
- createdAt (S)          ← ISO8601
- updatedAt (S)

GSI: userId-createdAt-index
  Partition key: userId
  Sort key: createdAt
  ← for listing a user's recent documents

TTL: ttl (N)  ← epoch seconds, for expiring documents
```

## Azure Cosmos DB (user preferences)

### Container: user-preferences
```json
{
  "id": "user-{cognitoSub}",
  "userId": "uuid",
  "theme": "dark",
  "defaultView": "grid",
  "defaultSort": "createdAt_desc",
  "notificationsEnabled": true,
  "emailNotifications": {
    "uploadComplete": true,
    "aiComplete": true,
    "shareAccepted": false
  },
  "defaultCloudPriority": ["AWS", "GCP", "AZURE", "OCI"],
  "aiAutoAnalyse": true,
  "storagePreferences": {
    "archiveAfterDays": 30,
    "autoDeleteAfterDays": null
  },
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

## GCP Firestore (real-time collaboration)

### Collection: document-sessions
```json
{
  "documentId": "uuid",
  "activeViewers": [
    {
      "userId": "uuid",
      "displayName": "Divya",
      "avatarColor": "#6366f1",
      "joinedAt": "timestamp",
      "cursor": null
    }
  ],
  "annotations": [
    {
      "id": "uuid",
      "userId": "uuid",
      "text": "Check this clause",
      "position": { "page": 1, "x": 0.3, "y": 0.5 },
      "createdAt": "timestamp",
      "resolved": false
    }
  ],
  "lastActivity": "timestamp"
}
```

## Kafka event schemas

### nexusflow.file.uploaded
```json
{
  "eventId": "uuid",
  "eventType": "FILE_UPLOADED",
  "documentId": "uuid",
  "userId": "uuid",
  "fileName": "invoice-jan-2024.pdf",
  "mimeType": "application/pdf",
  "fileSizeBytes": 245760,
  "tempS3Key": "temp/uuid/invoice-jan-2024.pdf",
  "timestamp": "2024-01-15T10:30:00Z",
  "correlationId": "uuid"
}
```

### nexusflow.file.stored
```json
{
  "eventId": "uuid",
  "eventType": "FILE_STORED",
  "documentId": "uuid",
  "cloudProvider": "AWS",
  "storageKey": "documents/uuid/invoice-jan-2024.pdf",
  "durationMs": 342,
  "timestamp": "2024-01-15T10:30:01Z",
  "correlationId": "uuid"
}
```

### nexusflow.ai.complete
```json
{
  "eventId": "uuid",
  "eventType": "AI_COMPLETE",
  "documentId": "uuid",
  "documentType": "INVOICE",
  "summary": "Invoice from Acme Corp for $1,250 for web development services in January 2024.",
  "tags": ["invoice", "acme-corp", "web-development", "2024"],
  "entities": {
    "organizations": ["Acme Corp"],
    "dates": ["January 2024"],
    "amounts": ["$1,250.00"],
    "persons": []
  },
  "sentiment": "NEUTRAL",
  "confidence": 0.9823,
  "processingTimeMs": 2341,
  "timestamp": "2024-01-15T10:30:04Z",
  "correlationId": "uuid"
}
```

## Spring Boot DTOs

### DocumentDto.java
```java
public record DocumentDto(
    UUID id,
    String fileName,
    String mimeType,
    long fileSizeBytes,
    String documentType,
    String status,
    String summary,
    List<String> aiTags,
    Map<String, List<String>> entities,
    String sentiment,
    Double confidenceScore,
    StorageLocationsDto storageLocations,
    Instant createdAt,
    Instant updatedAt
) {}

public record StorageLocationsDto(
    String awsS3Url,
    String azureBlobUrl,
    String gcpStorageUrl,
    String ociObjectUrl,
    boolean isArchived
) {}
```

### UploadResponseDto.java
```java
public record UploadResponseDto(
    UUID documentId,
    String status,
    String websocketTopic,   // /topic/documents/{documentId}
    String message
) {}
```

### SearchRequestDto.java
```java
public record SearchRequestDto(
    String query,            // natural language query
    String documentType,     // filter by type (optional)
    List<String> tags,       // filter by tags (optional)
    String dateFrom,         // ISO date (optional)
    String dateTo,           // ISO date (optional)
    String cloudProvider,    // filter by cloud (optional)
    int page,
    int size,
    String sortBy,           // createdAt, fileName, fileSize
    String sortDir           // asc, desc
) {}
```

### ChatRequestDto.java
```java
public record ChatRequestDto(
    String message,
    String conversationId,   // for multi-turn conversation
    List<String> documentIds // limit context to specific docs (optional)
) {}

public record ChatResponseDto(
    String message,
    String conversationId,
    List<DocumentReferenceDto> sources,
    long processingTimeMs
) {}
```
