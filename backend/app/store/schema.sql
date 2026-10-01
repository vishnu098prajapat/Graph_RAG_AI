-- CogniGraph schema (idempotent; executed on startup by PostgresStore.ensure_schema()).
-- Embedding dimension 384 matches BAAI/bge-small-en-v1.5 and the hashing embedder.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
    id         TEXT PRIMARY KEY,
    filename   TEXT        NOT NULL,
    n_pages    INTEGER     NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
    id         TEXT PRIMARY KEY,                 -- "<doc_id>:<index>"
    doc_id     TEXT        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    idx        INTEGER     NOT NULL,
    text       TEXT        NOT NULL,
    char_start INTEGER     NOT NULL,
    char_end   INTEGER     NOT NULL,
    spans      JSONB       NOT NULL,             -- [{"page":3,"start":120,"end":480}, ...]
    embedding  vector(384) NOT NULL,
    tsv        tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED
);

CREATE INDEX IF NOT EXISTS chunks_doc_idx       ON chunks (doc_id, idx);
CREATE INDEX IF NOT EXISTS chunks_tsv_gin       ON chunks USING gin (tsv);
CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops);
