from fastapi import FastAPI, Query
from pydantic import BaseModel
import uvicorn
import logging
import os
from typing import Optional
import requests

from schemas.chat_schema import ChatRequest, ChatResponse, CitationResponse
from schemas.summary_schema import SummaryRequest, SummaryResponse
from schemas.quiz_schema import QuizRequest, QuizResponse


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

        if text is None or not str(text).strip():
            logger.error(f"Extracted text is empty for document ID: {request.documentId}")
            return {
                "documentId": request.documentId,
                "status": "FAILED",
                "message": "Extracted text is empty. Cannot create chunks.",
            }

        text = str(text).strip()
        text_length = len(text)
        preview_text = text[:500]

        logger.info(
            f"Extracted text length before chunking: {text_length} characters "
            f"for document ID: {request.documentId}"
        )

        # Optional safety warning for very large Gemini output
        if text_length > 500_000:
            logger.warning(
                f"Very large extracted text detected: {text_length} characters. "
                f"Chunking may take time."
            )

        # ── 3. Chunk text ─────────────────────────────────────────────────────
        chunks = chunk_text(text)
        chunk_count = len(chunks)

        if not chunks:
            logger.error(f"No chunks created for document ID: {request.documentId}")
            return {
                "documentId": request.documentId,
                "status": "FAILED",
                "message": "No chunks were created from extracted text.",
            }

        logger.info(f"Extracted {text_length} characters from document ID: {request.documentId}")
        logger.info(f"Created {chunk_count} chunks")
        if chunks:
            logger.info(f"First chunk preview: {chunks[0]['chunkText'][:100]}...")

        # ── 4. Upsert embeddings to vector store ─────────────────────────────
        # Routes to pgvector or Pinecone based on VECTOR_STORE setting.
        # This step is best-effort: if it fails, we still return PROCESSED
        # so Spring Boot can save the chunks to PostgreSQL.
        vector_stored = False
        vector_count = 0
        vector_error = None

        try:
            from settings import VECTOR_STORE
            if VECTOR_STORE == "pgvector":
                from pgvector_store import upsert_document_chunks
                logger.info(f"Using pgvector for embedding storage (document ID: {request.documentId})")
            else:
                from vector_store import upsert_document_chunks
                logger.info(f"Using Pinecone for embedding storage (document ID: {request.documentId})")

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
                    f"Vector upsert succeeded ({VECTOR_STORE}): {vector_count} vectors "
                    f"for document ID: {request.documentId}"
                )
            else:
                logger.warning(
                    f"Vector upsert failed ({VECTOR_STORE}) for document ID: {request.documentId}. "
                    f"Error: {vector_error}"
                )

        except Exception as vec_exc:
            vector_error = str(vec_exc)
            logger.error(
                f"Vector step threw an exception for document ID "
                f"{request.documentId}: {vector_error}"
            )

        # ── 5. Return result (chunks sent to Spring Boot for PostgreSQL save) ─
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
        logger.exception(f"Error processing document ID {request.documentId}")
        return {
            "documentId": request.documentId,
            "status": "FAILED",
             "message": f"Extraction/chunking error: {type(e).__name__}: {repr(e)}",
        }


# ─── GET /semantic-search ─────────────────────────────────────────────────────

@app.get("/semantic-search")
async def semantic_search_endpoint(
    query: str = Query(..., description="Natural language query"),
    documentId: Optional[int] = Query(None, description="Filter by document ID (optional)"),
    topK: int = Query(5, ge=1, le=50, description="Number of results to return"),
):
    """
    Embed the query and search the configured vector store for similar chunks.
    Routes to pgvector or Pinecone based on VECTOR_STORE setting.
    Returns documentId + chunkIndex metadata only (no chunkText).
    Spring Boot will use documentId + chunkIndex to fetch chunkText from PostgreSQL.
    """
    logger.info(
        f"Semantic search request — query='{query[:80]}', "
        f"documentId={documentId}, topK={topK}"
    )

    try:
        from settings import VECTOR_STORE
        if VECTOR_STORE == "pgvector":
            from pgvector_store import semantic_search
            logger.info("Using pgvector for semantic search")
        else:
            from vector_store import semantic_search
            logger.info("Using Pinecone for semantic search")

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



# ─── Chat Endpoint ────────────────────────────────────────────────────────────

def get_gemini_client():
    from google import genai
    from settings import GEMINI_API_KEY
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")
    return genai.Client(api_key=GEMINI_API_KEY)


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    logger.info(f"Received chat request for session: {request.sessionId}")
    
    # 1. Perform semantic search restricted to request.documentIds
    try:
        from settings import VECTOR_STORE
        if VECTOR_STORE == "pgvector":
            from pgvector_store import semantic_search
        else:
            from vector_store import semantic_search
        search_results = semantic_search(
            query=request.question,
            document_ids=request.documentIds,
            top_k=5
        )
    except Exception as e:
        logger.error(f"Error querying vector store: {e}")
        search_results = []

    # 2. Build batch chunk resolve request to call Spring Boot
    resolved_chunks_map = {}
    if search_results:
        resolve_payload = {
            "chunks": [
                {"documentId": res["documentId"], "chunkIndex": res["chunkIndex"]}
                for res in search_results
            ]
        }
        
        from settings import SPRING_BOOT_BASE_URL
        resolve_url = f"{SPRING_BOOT_BASE_URL.rstrip('/')}/api/internal/chunks/resolve"
        
        try:
            logger.info(f"Resolving {len(search_results)} chunks from Spring Boot at {resolve_url}")
            response = requests.post(resolve_url, json=resolve_payload, timeout=10)
            if response.status_code == 200:
                response_data = response.json()
                for item in response_data.get("chunks", []):
                    if item.get("found"):
                        key = (item["documentId"], item["chunkIndex"])
                        resolved_chunks_map[key] = item["chunkText"]
            else:
                logger.error(f"Spring Boot chunk resolution returned status {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Failed to connect to Spring Boot chunk resolution API: {e}")

    # 3. Construct context for Gemini using found=True chunks only
    context_parts = []
    for res in search_results:
        key = (res["documentId"], res["chunkIndex"])
        if key in resolved_chunks_map:
            text = resolved_chunks_map[key]
            context_parts.append(
                f"[Tài liệu ID: {res['documentId']}, Chunk: {res['chunkIndex']}]\n{text}"
            )
            
    context_text = "\n\n".join(context_parts)

    # 4. Construct prompt with context, history, and question
    system_instruction = (
        '''Bạn là chatbot học tập của hệ thống AI Study Hub.
Nhiệm vụ của bạn là trả lời câu hỏi của người dùng CHỈ dựa trên phần CONTEXT được cung cấp từ các tài liệu đã chọn.
Quy tắc bắt buộc:
1. Trước khi trả lời, hãy tự kiểm tra xem CONTEXT có thật sự liên quan trực tiếp đến USER QUESTION hay không.
2. Chỉ trả lời khi CONTEXT có đủ thông tin rõ ràng để trả lời câu hỏi.
3. Nếu CONTEXT không liên quan, chỉ liên quan rất ít, hoặc không đủ dữ liệu để trả lời, hãy trả lời đúng câu sau:
   "Mình không tìm thấy đủ thông tin phù hợp trong tài liệu đã chọn để trả lời câu hỏi này."
4. Không được dùng kiến thức chung bên ngoài tài liệu để tự bổ sung câu trả lời.
5. Không được suy đoán, không được bịa thêm thông tin nếu CONTEXT không nói rõ.
6. Nếu CONTEXT có một phần thông tin liên quan nhưng chưa đủ đầy đủ, hãy nói rõ phần nào có trong tài liệu và phần nào không đủ thông tin.
7. Trả lời bằng tiếng Việt, dễ hiểu, phù hợp với sinh viên.
8. Nếu trả lời được, hãy trình bày mạch lạc, có thể dùng gạch đầu dòng nếu cần.
9. Không nhắc đến Pinecone, embedding, vector search, chunk, retrieval score hoặc cơ chế kỹ thuật nội bộ trong câu trả lời cho người dùng.
'''
    )

    prompt = f"=== CONTEXT ===\n{context_text}\n\n"
    
    if request.history:
        prompt += "=== CHAT HISTORY ===\n"
        for msg in request.history:
            role_label = "Người dùng" if msg.role.lower() == "user" else "Trợ lý"
            prompt += f"{role_label}: {msg.content}\n"
        prompt += "\n"
        
    prompt += f"=== CURRENT QUESTION ===\nNgười dùng: {request.question}\nTrợ lý:"

    # 5. Call Gemini API
    try:
        client = get_gemini_client()
        from settings import GEMINI_MODEL
        logger.info(f"Calling Gemini ({GEMINI_MODEL}) for session {request.sessionId}...")
        
        from google.genai import types
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.7
        )
        
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=config
        )
        answer = response.text or "Không nhận được phản hồi từ mô hình AI."
    except Exception as e:
        logger.exception(f"Error calling Gemini: {e}")
        answer = f"Lỗi khi gọi mô hình AI: {str(e)}"

    # 6. Map search results into Citations response (only if found and text resolved)
    citations = []
    for res in search_results:
        key = (res["documentId"], res["chunkIndex"])
        if key in resolved_chunks_map:
            chunk_text = resolved_chunks_map[key]
            # Clip between 300 to 500 characters
            preview = chunk_text[:400] if len(chunk_text) > 400 else chunk_text
            citations.append(
                CitationResponse(
                    documentId=res["documentId"],
                    chunkIndex=res["chunkIndex"],
                    score=res["score"],
                    previewText=preview
                )
            )

    return ChatResponse(answer=answer, citations=citations)


# ─── Document Summary Endpoint ────────────────────────────────────────────────

@app.post("/summary", response_model=SummaryResponse)
async def summary_endpoint(request: SummaryRequest):
    logger.info(f"Received summary request for document ID: {request.documentId}")
    from summary_service import process_summary_request
    return process_summary_request(request)


# ─── Quiz Endpoint ───────────────────────────────────────────────────────────

@app.post("/quiz", response_model=QuizResponse)
async def quiz_endpoint(request: QuizRequest):
    logger.info(
        f"Received quiz request for document ID: {request.documentId}, "
        f"questionCount: {request.questionCount}, difficulty: {request.difficulty}"
    )
    from quiz_service import process_quiz_request
    return process_quiz_request(request)


# ─── Health check ─────────────────────────────────────────────────────────────


@app.get("/health")
async def health():
    return {"status": "ok", "service": "AI Document Processing Service"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
