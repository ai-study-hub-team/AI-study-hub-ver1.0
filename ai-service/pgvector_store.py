"""
pgvector_store.py
─────────────────
Handles all PostgreSQL pgvector interactions for the AI Study Hub service.

Responsibilities:
  - Connect to a PostgreSQL database with the pgvector extension.
  - Load the sentence-transformers embedding model (shared with vector_store.py).
  - Upsert chunk embeddings into the document_chunk_embeddings table.
  - Query pgvector for semantic search using cosine distance.
  - Delete embeddings when a document is reprocessed.

PostgreSQL stores:
  id, document_id, chunk_index, embedding (vector(384)), created_at, updated_at

PostgreSQL (document_chunks) remains the source of truth for chunkText.
"""

import logging
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ai-service.pgvector_store")

# ─── Configuration ────────────────────────────────────────────────────────────

from settings import (
    EMBEDDING_MODEL_NAME,
    PGVECTOR_HOST,
    PGVECTOR_PORT,
    PGVECTOR_DATABASE,
    PGVECTOR_USER,
    PGVECTOR_PASSWORD,
)

# ─── Lazy singletons ─────────────────────────────────────────────────────────

_embedding_model = None
_db_pool = None


def _get_embedding_model():
    """Load the sentence-transformers model once and reuse."""
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading embedding model: {EMBEDDING_MODEL_NAME}")
            _embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
            logger.info("Embedding model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load embedding model '{EMBEDDING_MODEL_NAME}': {e}")
            raise RuntimeError(f"Embedding model load error: {e}") from e
    return _embedding_model


def _get_db_connection():
    """
    Get a database connection from the pool.
    Uses psycopg2 with a simple connection (no pool for simplicity).
    """ 
  
    global _db_pool
    if _db_pool is None:
        try:
            logger.info(
                f"Connecting to pgvector database: "
                f"{PGVECTOR_HOST}:{PGVECTOR_PORT}/{PGVECTOR_DATABASE}"
            )
            _db_pool = {
                "host": PGVECTOR_HOST,
                "port": int(PGVECTOR_PORT),
                "database": PGVECTOR_DATABASE,
                "user": PGVECTOR_USER,
                "password": PGVECTOR_PASSWORD,
            }
            # Test connection
            conn = psycopg2.connect(**_db_pool)
            conn.close()
            logger.info("pgvector database connection successful.")
        except Exception as e:
            _db_pool = None
            logger.error(f"Failed to connect to pgvector database: {e}")
            raise RuntimeError(f"pgvector connection error: {e}") from e

    import psycopg2

    return psycopg2.connect(**_db_pool)


# ─── Ensure pgvector extension ───────────────────────────────────────────────

def _ensure_pgvector_extension(conn):
    """Create the vector extension if it doesn't exist."""
    try:
        with conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            conn.commit()
    except Exception as e:
        logger.warning(f"Could not ensure pgvector extension (may already exist): {e}")
        conn.rollback()


# ─── Public API ───────────────────────────────────────────────────────────────

def delete_document_vectors(document_id: int):
    """
    Deletes all pgvector embeddings for the given documentId.
    Prevents stale vectors when a document is reprocessed.
    """
    conn = None
    try:
        conn = _get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM document_chunk_embeddings WHERE document_id = %s",
                (document_id,)
            )
            deleted = cur.rowcount
            conn.commit()
        logger.info(f"Deleted {deleted} old embeddings for document ID: {document_id}")
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Failed to delete embeddings for document ID {document_id}: {e}")
        raise RuntimeError(f"pgvector deletion error: {e}") from e
    finally:
        if conn:
            conn.close()


def upsert_document_chunks(document_id: int, original_file_name: str, chunks: list) -> dict:
    """
    Embed each chunk and upsert into PostgreSQL pgvector.

    Args:
        document_id:        The document's database ID.
        original_file_name: The original upload filename (logged, not stored in embeddings).
        chunks:             List of chunk dicts from text_chunker.py.
                            Each dict has: chunkIndex, chunkText, charStart, charEnd, textLength.

    Returns:
        {"vectorCount": int, "success": bool, "error": str|None}

    NOTE: chunkText is used ONLY for generating the embedding vector.
          It is NOT stored in the embeddings table (it's in document_chunks).
    """
    if not chunks:
        logger.warning(f"No chunks to upsert for document ID: {document_id}")
        return {"vectorCount": 0, "success": True, "error": None}

    conn = None
    try:
        model = _get_embedding_model()
        conn = _get_db_connection()
        _ensure_pgvector_extension(conn)

        # Step 1: Delete old embeddings for this document
        delete_document_vectors(document_id)

        # Step 2: Generate embeddings
        texts = [chunk["chunkText"] for chunk in chunks]
        logger.info(f"Embedding {len(texts)} chunks for document ID: {document_id}")
        embeddings = model.encode(texts, batch_size=32, show_progress_bar=False)

        # Step 3: Upsert into pgvector (INSERT ... ON CONFLICT UPDATE)
        upsert_sql = """
            INSERT INTO document_chunk_embeddings (document_id, chunk_index, embedding, created_at, updated_at)
            VALUES (%s, %s, %s, NOW(), NOW())
            ON CONFLICT (document_id, chunk_index)
            DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()
        """

        total_upserted = 0
        with conn.cursor() as cur:
            for chunk, embedding in zip(chunks, embeddings):
                chunk_index = chunk["chunkIndex"]
                # Convert numpy array to Python list, then to pgvector string format
                embedding_list = embedding.tolist()
                embedding_str = "[" + ",".join(str(v) for v in embedding_list) + "]"

                cur.execute(upsert_sql, (document_id, chunk_index, embedding_str))
                total_upserted += 1

            conn.commit()

        logger.info(
            f"pgvector upsert complete for document ID: {document_id}. "
            f"Total embeddings stored: {total_upserted}"
        )
        return {"vectorCount": total_upserted, "success": True, "error": None}

    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"pgvector upsert failed for document ID {document_id}: {e}")
        return {"vectorCount": 0, "success": False, "error": str(e)}
    finally:
        if conn:
            conn.close()


def semantic_search(
    query: str,
    document_id: Optional[int] = None,
    document_ids: Optional[list] = None,
    top_k: int = 5
) -> list:
    """
    Embed the query and retrieve top-k most similar chunks from pgvector.

    Uses cosine distance (<=>) which is equivalent to the cosine similarity
    metric previously used by Pinecone.

    Args:
        query:        The user's natural language search query.
        document_id:  If provided, restrict results to this document only.
        document_ids: If provided, restrict results to this list of document IDs.
        top_k:        Number of top results to return.

    Returns:
        List of result dicts: {documentId, chunkIndex, score}

    NOTE: chunkText is NOT returned here. The caller (Spring Boot) fetches
          chunkText from PostgreSQL using documentId + chunkIndex.
    """
    conn = None
    try:
        model = _get_embedding_model()
        conn = _get_db_connection()

        logger.info(
            f"pgvector semantic search — query: '{query[:80]}', documentId={document_id}, "
            f"documentIds={document_ids}, topK={top_k}"
        )

        query_embedding = model.encode([query])[0].tolist()
        embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

        # Build query with optional document filtering
        # Cosine distance: 1 - cosine_similarity. Lower = more similar.
        # We convert to similarity score: 1 - cosine_distance
        if document_ids is not None and len(document_ids) > 0:
            sql = """
                SELECT document_id, chunk_index,
                       1 - (embedding <=> %s::vector) AS score
                FROM document_chunk_embeddings
                WHERE document_id = ANY(%s)
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """
            params = (embedding_str, document_ids, embedding_str, top_k)
        elif document_id is not None:
            sql = """
                SELECT document_id, chunk_index,
                       1 - (embedding <=> %s::vector) AS score
                FROM document_chunk_embeddings
                WHERE document_id = %s
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """
            params = (embedding_str, document_id, embedding_str, top_k)
        else:
            sql = """
                SELECT document_id, chunk_index,
                       1 - (embedding <=> %s::vector) AS score
                FROM document_chunk_embeddings
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """
            params = (embedding_str, embedding_str, top_k)

        results = []
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
            for row in rows:
                results.append({
                    "documentId": int(row[0]),
                    "chunkIndex": int(row[1]),
                    "score": round(float(row[2]), 4),
                })

        logger.info(f"pgvector semantic search returned {len(results)} results.")
        return results

    except Exception as e:
        logger.error(f"pgvector semantic search error: {e}")
        raise RuntimeError(f"pgvector semantic search failed: {e}") from e
    finally:
        if conn:
            conn.close()
