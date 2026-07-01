-- ============================================================================
-- V002: pgvector extension + document_chunk_embeddings table
-- ============================================================================
-- Run this against the pgvector-enabled PostgreSQL instance:
--   Host: localhost, Port: 5433, Database: aistudyhub_pgvector_test
--
-- Usage:
--   psql -h localhost -p 5433 -U postgres -d aistudyhub_pgvector_test -f V002__pgvector_schema.sql
-- ============================================================================

-- 1. Enable pgvector extension (safe to re-run)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create embeddings table
--    Embedding dimension = 384 (sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)
CREATE TABLE IF NOT EXISTS document_chunk_embeddings (
    id          BIGSERIAL   PRIMARY KEY,
    document_id BIGINT      NOT NULL,
    chunk_index INTEGER     NOT NULL,
    embedding   vector(384) NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT NOW(),

    -- Unique constraint: one embedding per (document, chunk) pair
    CONSTRAINT uq_dce_doc_chunk UNIQUE (document_id, chunk_index),

    -- Foreign key to documents table (cascade delete when document is removed)
    CONSTRAINT fk_dce_document FOREIGN KEY (document_id)
        REFERENCES documents(id) ON DELETE CASCADE
);

-- 3. Index for fast filtering by document_id
CREATE INDEX IF NOT EXISTS idx_dce_document_id ON document_chunk_embeddings(document_id);

-- 4. IVFFlat index for approximate nearest neighbor search (cosine distance)
--    NOTE: This index requires at least some data to exist before creation.
--    If the table is empty at migration time, you can create it later after
--    inserting the first batch of embeddings with:
--      CREATE INDEX idx_dce_embedding_cosine ON document_chunk_embeddings
--          USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
--    For now, we skip the IVFFlat index and rely on exact search which is
--    fast enough for < 100k vectors. Uncomment below when you have data:
--
-- CREATE INDEX IF NOT EXISTS idx_dce_embedding_cosine
--     ON document_chunk_embeddings USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 100);
