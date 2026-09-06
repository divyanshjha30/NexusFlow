-- Chunk-level embeddings for semantic search. CockroachDB has VECTOR built in.
CREATE TABLE IF NOT EXISTS document_embeddings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL,
    chunk_index  INTEGER NOT NULL,
    chunk_text   TEXT NOT NULL,
    embedding    VECTOR(768),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embeddings_document ON document_embeddings (document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_user ON document_embeddings (user_id);
