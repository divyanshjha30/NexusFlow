-- NexusFlow V1: users and documents.
-- CockroachDB is Postgres-wire-compatible; VECTOR is built in (no pgvector extension).

CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_sub         VARCHAR(200) UNIQUE NOT NULL,
    email               VARCHAR(500) UNIQUE NOT NULL,
    display_name        VARCHAR(200),
    avatar_url          VARCHAR(1000),
    role                VARCHAR(50) NOT NULL DEFAULT 'USER',
    storage_used_bytes  BIGINT NOT NULL DEFAULT 0,
    storage_limit_bytes BIGINT NOT NULL DEFAULT 5368709120,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,
    file_name           VARCHAR(500) NOT NULL,
    original_name       VARCHAR(500) NOT NULL,
    mime_type           VARCHAR(100) NOT NULL,
    file_size_bytes     BIGINT NOT NULL,
    document_type       VARCHAR(50),
    status              VARCHAR(50) NOT NULL DEFAULT 'UPLOADING',

    s3_key              VARCHAR(1000),
    azure_blob_name     VARCHAR(1000),
    gcs_object_name     VARCHAR(1000),
    oci_object_name     VARCHAR(1000),

    summary             TEXT,
    ai_tags             TEXT[],
    entities            JSONB,
    sentiment           VARCHAR(20),
    classification      VARCHAR(50),
    confidence_score    DECIMAL(5,4),
    extracted_text      TEXT,
    embedding_id        VARCHAR(200),

    is_archived         BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at         TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,
    last_accessed_at    TIMESTAMPTZ,
    access_count        INTEGER DEFAULT 0,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id    ON documents (user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status     ON documents (status);
CREATE INDEX IF NOT EXISTS idx_documents_type       ON documents (document_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents (created_at DESC);

CREATE TABLE IF NOT EXISTS document_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id         UUID NOT NULL REFERENCES documents(id),
    user_id             UUID NOT NULL,
    event_type          VARCHAR(100) NOT NULL,
    event_data          JSONB,
    cloud_provider      VARCHAR(20),
    duration_ms         INTEGER,
    error_message       TEXT,
    ip_address          INET,
    user_agent          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_document_id ON document_events (document_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id     ON document_events (user_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at  ON document_events (created_at DESC);
