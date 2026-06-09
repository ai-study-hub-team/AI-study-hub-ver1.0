from fastapi import FastAPI, Query
from pydantic import BaseModel
import uvicorn
import logging
import os
from typing import Optional

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("ai-service")

app = FastAPI(title="AI Document Processing Service")


# ─── Request model ────────────────────────────────────────────────────────────

class DocumentRequest(BaseModel):
    documentId: int
    fileName: str
    originalFileName: str
    filePath: str
    fileType: str


# ─── POST /process-document ───────────────────────────────────────────────────

@app.post("/process-document")
async def process_document(request: DocumentRequest):
    logger.info(f"Received request to process document ID: {request.documentId}")
    logger.info(f"File Name: {request.fileName}")
    logger.info(f"Original File Name: {request.originalFileName}")
    logger.info(f"File Path: {request.filePath}")
    logger.info(f"File Type: {request.fileType}")

    try:
        from text_extractor import extract_text
        from text_chunker import chunk_text

        # ── 1. Resolve and validate file path ─────────────────────────────────
        abs_file_path = os.path.abspath(request.filePath)
        logger.info(f"Resolved absolute path: {abs_file_path}")
        logger.info(f"File exists: {os.path.exists(abs_file_path)}")

        if not os.path.exists(abs_file_path):
            logger.error(f"File not found: {abs_file_path}")
            return {
                "documentId": request.documentId,
                "status": "FAILED",
                "message": "File not found",
            }

        # ── 2. Extract text ───────────────────────────────────────────────────
        text = extract_text(abs_file_path, request.fileType)
        text_length = len(text)
        preview_text = text[:500]

        # ── 3. Chunk text ─────────────────────────────────────────────────────
        chunks = chunk_text(text)
        chunk_count = len(chunks)

        logger.info(f"Extracted {text_length} characters from document ID: {request.documentId}")
        logger.info(f"Created {chunk_count} chunks")
        if chunks:
            logger.info(f"First chunk preview: {chunks[0]['chunkText'][:100]}...")

        # ── 4. Upsert embeddings to Pinecone ──────────────────────────────────
        # This step is best-effort: if Pinecone fails, we still return PROCESSED
        # so Spring Boot can save the chunks to MySQL.
        vector_stored = False
        vector_count = 0
        vector_error = None

        try:
            from vector_store import upsert_document_chunks
            result = upsert_document_chunks(
                document_id=request.documentId,
                original_file_name=request.originalFileName,
                chunks=chunks,
            )
            vector_stored = result["success"]
            vector_count = result["vectorCount"]
            vector_error = result["error"]

            if vector_stored:
                logger.info(
                    f"Pinecone upsert succeeded: {vector_count} vectors "
                    f"for document ID: {request.documentId}"
                )
            else:
                logger.warning(
                    f"Pinecone upsert failed for document ID: {request.documentId}. "
                    f"Error: {vector_error}"
                )

        except Exception as vec_exc:
            vector_error = str(vec_exc)
            logger.error(
                f"Pinecone step threw an exception for document ID "
                f"{request.documentId}: {vector_error}"
            )

        # ── 5. Return result (chunks sent to Spring Boot for MySQL save) ──────
        return {
            "documentId": request.documentId,
            "status": "PROCESSED",
            "message": "Text extracted and chunked successfully",
            "textLength": text_length,
            "chunkCount": chunk_count,
            "previewText": preview_text,
            "previewChunks": chunks[:3],
            "chunks": chunks,
            # Vector metadata (informational, Spring Boot logs but does not rely on these)
            "vectorStored": vector_stored,
            "vectorCount": vector_count,
            "vectorError": vector_error,
        }

    except Exception as e:
        logger.error(f"Error processing document ID {request.documentId}: {str(e)}")
        return {
            "documentId": request.documentId,
            "status": "FAILED",
            "message": f"Extraction/chunking error: {str(e)}",
        }


# ─── GET /semantic-search ─────────────────────────────────────────────────────

@app.get("/semantic-search")
async def semantic_search_endpoint(
    query: str = Query(..., description="Natural language query"),
    documentId: Optional[int] = Query(None, description="Filter by document ID (optional)"),
    topK: int = Query(5, ge=1, le=50, description="Number of results to return"),
):
    """
    Embed the query and search Pinecone for the most semantically similar chunks.
    Returns documentId + chunkIndex metadata only (no chunkText).
    Spring Boot will use documentId + chunkIndex to fetch chunkText from MySQL.
    """
    logger.info(
        f"Semantic search request — query='{query[:80]}', "
        f"documentId={documentId}, topK={topK}"
    )

    try:
        from vector_store import semantic_search
        results = semantic_search(query=query, document_id=documentId, top_k=topK)
        return {
            "query": query,
            "topK": topK,
            "documentId": documentId,
            "resultCount": len(results),
            "results": results,
        }
    except Exception as e:
        logger.error(f"Semantic search error: {e}")
        return {
            "query": query,
            "topK": topK,
            "documentId": documentId,
            "resultCount": 0,
            "results": [],
            "error": str(e),
        }


# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "AI Document Processing Service"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
