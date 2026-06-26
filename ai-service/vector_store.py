"""
vector_store.py
───────────────
Handles all Pinecone interactions for the AI Study Hub service.

Responsibilities:
  - Load env vars (PINECONE_API_KEY, PINECONE_INDEX_NAME) once at startup.
  - Load the sentence-transformers embedding model once at startup.
  - Upsert chunk vectors into Pinecone (NO chunkText stored).
  - Query Pinecone for semantic search.

Pinecone stores ONLY:
  id, vector, metadata: {documentId, chunkIndex, charStart, charEnd, textLength, originalFileName}

MySQL (document_chunks) remains the source of truth for chunkText.
"""

import logging
import os
from typing import Optional

from dotenv import load_dotenv

# Load .env file if present (local dev). In production, set env vars directly.
load_dotenv()

logger = logging.getLogger("ai-service.vector_store")

# ─── Configuration ────────────────────────────────────────────────────────────

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "ai-study-hub")
NAMESPACE = "documents"


from settings import EMBEDDING_MODEL_NAME


# Using multilingual model for Vietnamese support. 
# This model also outputs 384-dimensional vectors, matching our Pinecone index.
# IMPORTANT: All existing documents must be reprocessed to regenerate vectors with this model.
#EMBEDDING_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


# ─── Lazy singletons (initialized on first use) ───────────────────────────────

_pinecone_index = None
_embedding_model = None


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


def _get_pinecone_index():
    """Connect to the existing Pinecone index once and reuse."""
    global _pinecone_index
    if _pinecone_index is None:
        if not PINECONE_API_KEY:
            raise RuntimeError(
                "PINECONE_API_KEY is not set. "
                "Create ai-service/.env with PINECONE_API_KEY=<your key>."
            )
        if not PINECONE_INDEX_NAME:
            raise RuntimeError(
                "PINECONE_INDEX_NAME is not set. "
                "Create ai-service/.env with PINECONE_INDEX_NAME=ai-study-hub."
            )
        try:
            from pinecone import Pinecone
            logger.info(f"Connecting to Pinecone index: {PINECONE_INDEX_NAME}")
            pc = Pinecone(api_key=PINECONE_API_KEY)
            _pinecone_index = pc.Index(PINECONE_INDEX_NAME)
            stats = _pinecone_index.describe_index_stats()
            logger.info(
                f"Pinecone connected. Index '{PINECONE_INDEX_NAME}' "
                f"total vectors: {stats.total_vector_count}"
            )
        except Exception as e:
            logger.error(f"Failed to connect to Pinecone index '{PINECONE_INDEX_NAME}': {e}")
            raise RuntimeError(f"Pinecone connection error: {e}") from e
    return _pinecone_index


# ─── Public API ───────────────────────────────────────────────────────────────

def delete_document_vectors(document_id: int):
    """
    Deletes all Pinecone vectors associated with the given documentId.
    Prevents stale vectors from remaining when a document is reprocessed.
    """
    try:
        index = _get_pinecone_index()
        logger.info(f"Starting deletion of old vectors for document ID: {document_id}")
        
        index.delete(
            filter={"documentId": {"$eq": document_id}},
            namespace=NAMESPACE
        )
        
        logger.info(f"Completed deletion of old vectors for document ID: {document_id}")
    except Exception as e:
        err_msg = str(e)
        if "namespace not found" in err_msg.lower():
            logger.warning(
                f"Namespace '{NAMESPACE}' not found when deleting vectors for document ID {document_id}: {err_msg}. "
                "This is expected if this is the first document uploaded or if the namespace has not been created yet."
            )
            return
        logger.error(f"Failed to delete old vectors for document ID {document_id}: {e}")
        raise RuntimeError(f"Pinecone deletion error: {e}") from e

def upsert_document_chunks(document_id: int, original_file_name: str, chunks: list, user_id: Optional[int] = None) -> dict:
    """
    Embed each chunk and upsert into Pinecone.

    Args:
        document_id:        The document's database ID (used as Pinecone metadata and vector id prefix).
        original_file_name: The original upload filename (stored as metadata).
        chunks:             List of chunk dicts from text_chunker.py.
                            Each dict has: chunkIndex, chunkText, charStart, charEnd, textLength.

    Returns:
        {"vectorCount": int, "success": bool, "error": str|None}

    NOTE: chunkText is used ONLY for generating the embedding vector.
          It is NOT stored in Pinecone metadata.
    """
    if not chunks:
        logger.warning(f"No chunks to upsert for document ID: {document_id}")
        return {"vectorCount": 0, "success": True, "error": None}

    try:
        model = _get_embedding_model()
        index = _get_pinecone_index()

        # Step 1: Delete old vectors to prevent staleness on reprocess
        delete_document_vectors(document_id)

        # Extract just the text for batch embedding
        texts = [chunk["chunkText"] for chunk in chunks]
        logger.info(f"Embedding {len(texts)} chunks for document ID: {document_id}")

        # Batch encode — returns numpy array shape (n_chunks, 384)
        embeddings = model.encode(texts, batch_size=32, show_progress_bar=False)

        # Build Pinecone upsert vectors
        vectors = []
        for chunk, embedding in zip(chunks, embeddings):
            chunk_index = chunk["chunkIndex"]
            vector_id = f"doc_{document_id}_chunk_{chunk_index}"

            # ── IMPORTANT: Do NOT include chunkText in metadata ──
            ext = original_file_name.split('.')[-1].upper() if '.' in original_file_name else "UNKNOWN"
            metadata = {
                "documentId": document_id,
                "chunkIndex": chunk_index,
                "charStart": chunk.get("charStart", 0),
                "charEnd": chunk.get("charEnd", 0),
                "textLength": chunk.get("textLength", 0),
                "originalFileName": original_file_name,
                "documentType": ext,
            }
            if user_id is not None:
                metadata["userId"] = user_id
            # Add dynamic fields if present
            for field in ["sheetIndex", "sheetName", "rowStart", "rowEnd", "slideStart", "slideEnd", "slideType"]:
                if field in chunk and chunk[field] is not None:
                    metadata[field] = chunk[field]

            vectors.append({
                "id": vector_id,
                "values": embedding.tolist(),  # convert numpy → plain list
                "metadata": metadata,
            })

        # Upsert in batches of 100 (Pinecone recommended limit)
        batch_size = 100
        total_upserted = 0
        for i in range(0, len(vectors), batch_size):
            batch = vectors[i: i + batch_size]
            index.upsert(vectors=batch, namespace=NAMESPACE)
            total_upserted += len(batch)
            logger.info(
                f"Upserted batch {i // batch_size + 1}: "
                f"{len(batch)} vectors for document ID: {document_id}"
            )

        logger.info(
            f"Pinecone upsert complete for document ID: {document_id}. "
            f"Total vectors stored: {total_upserted}"
        )
        return {"vectorCount": total_upserted, "success": True, "error": None}

    except Exception as e:
        logger.error(f"Pinecone upsert failed for document ID {document_id}: {e}")
        return {"vectorCount": 0, "success": False, "error": str(e)}


def semantic_search(
    query: str,
    document_id: Optional[int] = None,
    document_ids: Optional[list] = None,
    top_k: int = 5
) -> list:
    """
    Embed the query and retrieve top-k most similar chunks from Pinecone.

    Args:
        query:       The user's natural language search query.
        document_id: If provided, restrict results to this document only.
        document_ids: If provided, restrict results to this list of document IDs.
        top_k:       Number of top results to return.

    Returns:
        List of result dicts: {documentId, chunkIndex, score, charStart, charEnd,
                                textLength, originalFileName}

    NOTE: chunkText is NOT returned here because it is not stored in Pinecone.
          The caller (Spring Boot) will fetch chunkText from MySQL using documentId + chunkIndex.
    """
    try:
        model = _get_embedding_model()
        index = _get_pinecone_index()

        logger.info(
            f"Semantic search — query: '{query[:80]}', documentId={document_id}, "
            f"documentIds={document_ids}, topK={top_k}"
        )

        query_embedding = model.encode([query])[0].tolist()

        # Optional metadata filter — only filter when a documentId or documentIds is given
        if document_ids is not None:
            metadata_filter = {"documentId": {"$in": document_ids}}
        elif document_id is not None:
            metadata_filter = {"documentId": {"$eq": document_id}}
        else:
            metadata_filter = None

        query_response = index.query(
            vector=query_embedding,
            top_k=top_k,
            namespace=NAMESPACE,
            include_metadata=True,
            include_values=False,
            filter=metadata_filter,
        )

        results = []
        for match in query_response.get("matches", []):
            meta = match.get("metadata", {})
            res_item = {
                "documentId": int(meta.get("documentId", 0)),
                "chunkIndex": int(meta.get("chunkIndex", 0)),
                "score": round(float(match.get("score", 0.0)), 4),
                "charStart": int(meta.get("charStart", 0)),
                "charEnd": int(meta.get("charEnd", 0)),
                "textLength": int(meta.get("textLength", 0)),
                "originalFileName": meta.get("originalFileName", ""),
                "documentType": meta.get("documentType", ""),
            }
            for field in ["sheetIndex", "sheetName", "rowStart", "rowEnd", "slideStart", "slideEnd", "slideType"]:
                if field in meta:
                    res_item[field] = meta[field]
            results.append(res_item)

        logger.info(f"Semantic search returned {len(results)} results.")
        return results

    except Exception as e:
        logger.error(f"Semantic search error: {e}")
        raise RuntimeError(f"Semantic search failed: {e}") from e
