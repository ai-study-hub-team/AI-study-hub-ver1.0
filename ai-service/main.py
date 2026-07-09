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
from schemas.generate_answer_schema import GenerateAnswerRequest, GenerateAnswerResponse
from schemas.embed_schema import EmbedQueryRequest, EmbedQueryResponse
from schemas.analyze_chat_query_schema import AnalyzeChatQueryRequest, AnalyzeChatQueryResponse
from gemini_usage import extract_usage


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
        raw_extract = extract_text(abs_file_path, request.fileType)

        # PDF returns a structured dict with page_char_map for locator injection.
        # All other file types return a plain string (or None).
        page_char_map = None
        if isinstance(raw_extract, dict):
            text = raw_extract.get("text", "")
            page_char_map = raw_extract.get("page_char_map")  # list[{page_number, char_start, char_end}]
        else:
            text = raw_extract

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
        chunks = chunk_text(text, file_type=request.fileType)
        chunk_count = len(chunks)

        if not chunks:
            logger.error(f"No chunks created for document ID: {request.documentId}")
            return {
                "documentId": request.documentId,
                "status": "FAILED",
                "message": "No chunks were created from extracted text.",
            }

        # ── 3a. Inject PDF page locators using page_char_map ────────────────
        # For PDF, text_extractor returns a page_char_map so we can determine
        # which page(s) each chunk's character range falls on.
        if page_char_map:
            for chunk in chunks:
                c_start = chunk.get("charStart", 0)
                c_end   = chunk.get("charEnd", 0)

                first_page = None
                last_page  = None

                for page_info in page_char_map:
                    p_num   = page_info["page_number"]
                    p_start = page_info["char_start"]
                    p_end   = page_info["char_end"]

                    # Chunk overlaps this page if the ranges intersect
                    if c_start < p_end and c_end > p_start:
                        if first_page is None:
                            first_page = p_num
                        last_page = p_num

                chunk["locatorType"]  = "PAGE"
                chunk["locatorStart"] = first_page
                chunk["locatorEnd"]   = last_page

        # ── 3b. Log sample locator metadata for the first 5 chunks ──────────
        logger.info(f"Extracted {text_length} characters from document ID: {request.documentId}")
        logger.info(f"Created {chunk_count} chunks")
        if chunks:
            logger.info(f"First chunk preview: {chunks[0]['chunkText'][:100]}...")
        for i, chunk in enumerate(chunks[:5]):
            logger.info(
                f"[ChunkMetadata] docId={request.documentId}, "
                f"chunkIndex={chunk.get('chunkIndex')}, "
                f"locatorType={chunk.get('locatorType')}, "
                f"locatorStart={chunk.get('locatorStart')}, "
                f"locatorEnd={chunk.get('locatorEnd')}"
            )

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
        if not vector_stored:
            logger.error(f"Vector storage failed for document ID: {request.documentId}. Error: {vector_error}")
            return {
                "documentId": request.documentId,
                "status": "FAILED",
                "message": f"Vector storage failed: {vector_error}",
                "vectorStored": vector_stored,
                "vectorCount": vector_count,
                "vectorError": vector_error,
            }

        return {
            "documentId": request.documentId,
            "status": "PROCESSED",
            "message": "Text extracted, chunked, and embeddings stored successfully",
            "textLength": text_length,
            "chunkCount": chunk_count,
            "previewText": preview_text,
            "previewChunks": chunks[:3],
            "chunks": chunks,
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
        usage = extract_usage(response, "chat-legacy")
    except Exception as e:
        logger.exception(f"Error calling Gemini: {e}")
        answer = f"Lỗi khi gọi mô hình AI: {str(e)}"
        from schemas.usage_schema import UsageResponse
        usage = UsageResponse()

    # 6. Map search results into Citations response (only if found and text resolved)
    def generate_citation_label(meta: dict) -> str:
        doc_type = meta.get("documentType", "").upper()
        if doc_type in ["XLS", "XLSX"]:
            sheet = meta.get("sheetName", "Unknown")
            start = meta.get("rowStart")
            end = meta.get("rowEnd")
            if start is not None and end is not None:
                return f"Sheet {sheet} (Rows {int(start)}-{int(end)})"
            return f"Sheet {sheet}"
        elif doc_type in ["PPT", "PPTX"]:
            start = meta.get("slideStart")
            end = meta.get("slideEnd")
            if start is not None and end is not None:
                if start == end:
                    return f"Slide {int(start)}"
                return f"Slides {int(start)}-{int(end)}"
            return "Slides"
        else:
            return f"Chunk {meta.get('chunkIndex', 0)}"

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
                    previewText=preview,
                    documentName=res.get("originalFileName", "Unknown"),
                    type=res.get("documentType", "UNKNOWN"),
                    label=generate_citation_label(res)
                )
            )

    return ChatResponse(answer=answer, citations=citations, usage=usage)


# ─── Chat Planner / Intent Analyzer ─────────────────────────────────────────
# Called by Spring Boot to analyze user intent before performing retrieval.
# Returns structured JSON plan: intent, rewrittenQuestion, retrievalStrategy, etc.

ALLOWED_INTENTS = {
    "GENERAL_CHAT", "DOCUMENT_QA", "FOLLOW_UP_QA", "DOCUMENT_OVERVIEW",
    "COMPARISON", "TOOL_SUMMARY", "TOOL_QUIZ", "META_CHAT", "OUT_OF_SCOPE"
}
ALLOWED_STRATEGIES = {
    "NONE", "SEMANTIC_SEARCH", "OVERVIEW_CONTEXT", "MULTI_HOP_SEARCH", "TOOL_CALL"
}


@app.post("/analyze-chat-query", response_model=AnalyzeChatQueryResponse)
async def analyze_chat_query_endpoint(request: AnalyzeChatQueryRequest):
    """
    Chat Planner: analyze the user's intent and return a structured retrieval plan.
    Calls Gemini and forces JSON output. Returns a safe fallback on any error.
    """
    logger.info(
        f"[analyze-chat-query] question='{request.question[:80]}', "
        f"hasDocuments={request.hasDocuments}, documentCount={request.documentCount}, "
        f"historyLen={len(request.history or [])}"
    )

    def safe_fallback(question: str) -> AnalyzeChatQueryResponse:
        logger.info("[analyze-chat-query] Returning safe fallback plan.")
        return AnalyzeChatQueryResponse(
            intent="DOCUMENT_QA",
            rewrittenQuestion=question,
            retrievalStrategy="SEMANTIC_SEARCH",
            searchQueries=[question],
            needsRetrieval=True,
            confidence=0.5,
        )

    history_text = ""
    for msg in (request.history or [])[-6:]:
        role_label = "User" if msg.role.upper() == "USER" else "Assistant"
        history_text += f"{role_label}: {msg.content}\n"

    planner_prompt = f"""You are a chat intent analyzer for an AI Study Hub system.
Analyze the user query and return a strict JSON object.

Allowed intents: GENERAL_CHAT, DOCUMENT_QA, FOLLOW_UP_QA, DOCUMENT_OVERVIEW, COMPARISON, TOOL_SUMMARY, TOOL_QUIZ, META_CHAT, OUT_OF_SCOPE
Allowed retrieval strategies: NONE, SEMANTIC_SEARCH, OVERVIEW_CONTEXT, MULTI_HOP_SEARCH, TOOL_CALL

Context:
- Has attached documents: {request.hasDocuments}
- Document count: {request.documentCount}

Recent conversation history:
{history_text if history_text else '(none)'}

Current user question:
{request.question}

Rules:
- If no documents are attached, use GENERAL_CHAT and NONE strategy.
- For broad questions like 'Tài liệu này nói về gì?' or 'Give me an overview', use DOCUMENT_OVERVIEW and OVERVIEW_CONTEXT.
- For comparison questions like 'So sánh A và B' or 'Compare X and Y', use COMPARISON and MULTI_HOP_SEARCH.
- For follow-up questions referencing previous turns, use FOLLOW_UP_QA and expand the rewrittenQuestion with context.
- For specific factual questions about a document, use DOCUMENT_QA and SEMANTIC_SEARCH.
- rewrittenQuestion must be a complete, standalone question (no pronouns like 'it' or 'that').
- searchQueries: 1-3 search strings for retrieval (can be in Vietnamese or English).
- confidence: your confidence score between 0.0 and 1.0.

Return ONLY this JSON, no markdown, no explanation:
{{
  "intent": "<intent>",
  "rewrittenQuestion": "<rewritten question>",
  "retrievalStrategy": "<strategy>",
  "searchQueries": ["<query1>", "<query2>"],
  "needsRetrieval": true,
  "confidence": 0.9
}}"""

    try:
        import json
        client = get_gemini_client()
        from settings import GEMINI_MODEL
        from google.genai import types
        config = types.GenerateContentConfig(
            temperature=0.1,
            response_mime_type="application/json",
        )
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=planner_prompt,
            config=config,
        )
        raw = response.text.strip() if response.text else ""
        logger.info(f"[analyze-chat-query] Gemini raw response: {raw[:300]}")

        data = json.loads(raw)

        # Validate and sanitize fields
        intent = str(data.get("intent", "DOCUMENT_QA")).upper()
        if intent not in ALLOWED_INTENTS:
            intent = "DOCUMENT_QA"
        strategy = str(data.get("retrievalStrategy", "SEMANTIC_SEARCH")).upper()
        if strategy not in ALLOWED_STRATEGIES:
            strategy = "SEMANTIC_SEARCH"
        rewritten = str(data.get("rewrittenQuestion") or request.question).strip()
        queries = data.get("searchQueries", [request.question])
        if not isinstance(queries, list) or not queries:
            queries = [request.question]
        queries = [str(q) for q in queries][:3]
        needs_retrieval = bool(data.get("needsRetrieval", True))
        confidence = float(data.get("confidence", 0.8))

        # Extract token usage from planner Gemini call
        planner_usage = extract_usage(response, "chat-planner")

        logger.info(f"[analyze-chat-query] intent={intent}, strategy={strategy}, confidence={confidence}")
        return AnalyzeChatQueryResponse(
            intent=intent,
            rewrittenQuestion=rewritten,
            retrievalStrategy=strategy,
            searchQueries=queries,
            needsRetrieval=needs_retrieval,
            confidence=confidence,
            usage=planner_usage,
        )
    except Exception as e:
        logger.warning(f"[analyze-chat-query] Gemini call or JSON parse failed: {e}. Using fallback.")
        # Safe fallback: no Gemini was called (or it failed), so usage=None
        return safe_fallback(request.question)


# ─── Generate Answer Endpoint (Refactored Chat AI) ────────────────────────────
# Spring Boot performs hybrid semantic search and resolves chunk text.
# This endpoint ONLY builds the Gemini prompt and returns the answer.
# No pgvector calls. No Spring Boot callbacks.

SYSTEM_INSTRUCTION_GENERATE_ANSWER = (
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
9. Không nhắc đến embedding, vector search, chunk, retrieval score hoặc cơ chế kỹ thuật nội bộ trong câu trả lời.
'''
)


@app.post("/generate-answer", response_model=GenerateAnswerResponse)
async def generate_answer_endpoint(request: GenerateAnswerRequest):
    """
    Refactored Chat AI endpoint.
    Spring Boot sends pre-resolved context chunks (with chunkText).
    This endpoint builds the prompt and calls Gemini. No pgvector, no callbacks.
    Adapts prompt style based on intent and hasDocuments flag.
    """
    intent = (request.intent or "DOCUMENT_QA").upper()
    has_docs = request.hasDocuments if request.hasDocuments is not None else True
    logger.info(
        f"[generate-answer] question='{request.question[:80]}', "
        f"intent={intent}, hasDocuments={has_docs}, "
        f"contextChunks={len(request.contextChunks or [])}, "
        f"historyLen={len(request.history or [])}"
    )

    # Log context chunk locator metadata for observability
    for chunk in (request.contextChunks or []):
        logger.info(
            f"[Chat Context] docId={chunk.documentId}, chunkIndex={chunk.chunkIndex}, "
            f"locatorType={chunk.locatorType}, locatorStart={chunk.locatorStart}, "
            f"locatorEnd={chunk.locatorEnd}, score={chunk.score}"
        )

    # Build context text from provided chunks
    context_parts = []
    for chunk in (request.contextChunks or []):
        if chunk.chunkText and chunk.chunkText.strip():
            label = chunk.sourceLabel or f"Chunk {chunk.chunkIndex}"
            doc_info = f"Tài liệu: {chunk.documentTitle}" if chunk.documentTitle else f"Tài liệu ID: {chunk.documentId}"

            # Append source location only when reliable location data exists.
            # Never invent page/slide numbers for UNKNOWN locator types.
            location_info = ""
            if chunk.locatorType == "PAGE" and chunk.locatorStart is not None:
                if chunk.locatorEnd is not None and chunk.locatorEnd != chunk.locatorStart:
                    location_info = f" — Trang {chunk.locatorStart}-{chunk.locatorEnd}"
                else:
                    location_info = f" — Trang {chunk.locatorStart}"
            elif chunk.locatorType == "SLIDE" and chunk.locatorStart is not None:
                if chunk.locatorEnd is not None and chunk.locatorEnd != chunk.locatorStart:
                    location_info = f" — Slide {chunk.locatorStart}-{chunk.locatorEnd}"
                else:
                    location_info = f" — Slide {chunk.locatorStart}"
            # UNKNOWN or None: no location info appended — prevents hallucination

            context_parts.append(f"[{doc_info} — {label}{location_info}]\n{chunk.chunkText.strip()}")

    context_text = "\n\n".join(context_parts)

    # Build system instruction based on mode
    if not has_docs or intent == "GENERAL_CHAT":
        system_instruction = (
            """Bạn là trợ lý học tập AI Study Hub. Hãy trả lời câu hỏi của người dùng một cách chính xác, """
            """mạch lạc và dễ hiểu. Bạn có thể dùng kiến thức chung của mình để trả lời."""
            """ Trả lời bằng tiếng Việt."""
        )
    elif intent == "DOCUMENT_OVERVIEW":
        system_instruction = (
            """Bạn là trợ lý học tập AI Study Hub. Dựa vào các đoạn nội dung tài liệu được cung cấp, """
            """hãy tóm tắt và trình bày tổng quan nội dung chính của tài liệu một cách rõ ràng, đầy đủ, có cấu trúc. """
            """Không bịa thêm thông tin ngoài nội dung được cung cấp. Trả lời bằng tiếng Việt."""
        )
    elif intent == "COMPARISON":
        system_instruction = (
            """Bạn là trợ lý học tập AI Study Hub. Dựa vào các đoạn tài liệu được cung cấp, """
            """hãy so sánh các đối tượng được hỏi một cách rõ ràng. """
            """Nếu phù hợp, hãy dùng bảng so sánh (markdown table). """
            """Chỉ dùng thông tin trong tài liệu. Trả lời bằng tiếng Việt."""
        )
    else:
        system_instruction = SYSTEM_INSTRUCTION_GENERATE_ANSWER

    # Build prompt
    if has_docs and context_text.strip():
        prompt = f"=== NỘI DUNG TÀI LIỆU ===\n{context_text}\n\n"
    elif has_docs:
        prompt = "=== NỘI DUNG TÀI LIỆU ===\n(Không tìm thấy nội dung liên quan trong tài liệu.)\n\n"
    else:
        prompt = ""

    if request.history:
        prompt += "=== LỊCH SỬ CUỘC TRÒ CHUYỆN ===\n"
        for msg in request.history:
            role_label = "Người dùng" if msg.role.upper() == "USER" else "Trợ lý"
            prompt += f"{role_label}: {msg.content}\n"
        prompt += "\n"

    # Include rewrittenQuestion context for follow-up
    if request.rewrittenQuestion and request.rewrittenQuestion != request.question:
        prompt += f"=== CÂU HỎI ĐÃ PHÂN TÍCH ===\n{request.rewrittenQuestion}\n\n"

    prompt += f"=== CÂU HỎI HIỆN TẠI ===\nNgười dùng: {request.question}\nTrợ lý:"

    # Call Gemini
    try:
        client = get_gemini_client()
        from settings import GEMINI_MODEL
        from google.genai import types
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.7
        )
        logger.info(f"[generate-answer] Calling Gemini ({GEMINI_MODEL}), intent={intent}...")
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=config
        )
        answer = response.text or "Không nhận được phản hồi từ mô hình AI."
        answer_usage = extract_usage(response, "generate-answer")
        logger.info("[generate-answer] Gemini answered successfully.")
    except Exception as e:
        logger.exception(f"[generate-answer] Gemini call failed: {e}")
        answer = f"Lỗi khi gọi mô hình AI: {str(e)}"
        from schemas.usage_schema import UsageResponse
        answer_usage = UsageResponse()

    return GenerateAnswerResponse(answer=answer, usage=answer_usage)


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


# ─── Embed Query Endpoint ──────────────────────────────────────────────────────
# Spring Boot calls this endpoint to get a query embedding, then queries
# pgvector directly via JDBC. This replaces the old flow where Python
# performed the full pgvector search and returned (docId, chunkIndex, score).

@app.post("/embed-query", response_model=EmbedQueryResponse)
async def embed_query_endpoint(request: EmbedQueryRequest):
    """
    Return a 384-dimensional embedding for the provided text.
    Used by Spring Boot to build a query vector for direct pgvector SQL search.
    The embedding model is the same one used during document processing.
    """
    if not request.text or not request.text.strip():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="text must not be blank")

    logger.info(f"[embed-query] Embedding text (len={len(request.text)})")
    try:
        from pgvector_store import _get_embedding_model
        from settings import EMBEDDING_MODEL_NAME
        model = _get_embedding_model()
        embedding = model.encode([request.text.strip()])[0].tolist()
        logger.info(f"[embed-query] Embedding generated, dim={len(embedding)}")
        return EmbedQueryResponse(
            embedding=embedding,
            dimension=len(embedding),
            model=EMBEDDING_MODEL_NAME
        )
    except Exception as e:
        logger.exception(f"[embed-query] Embedding failed: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")


# ─── Debug Query Embedding Endpoint ──────────────────────────────────────────
# This endpoint is only for development/demo purposes to inspect query vectors.
# Do not expose in production unless necessary.

class QueryEmbeddingRequest(BaseModel):
    query: str

@app.post("/debug/query-embedding")
def debug_query_embedding(request: QueryEmbeddingRequest):
    from fastapi import HTTPException
    try:
        query = request.query.strip()

        if not query:
            raise HTTPException(status_code=400, detail="Query must not be empty")

        from pgvector_store import _get_embedding_model
        model = _get_embedding_model()
        vector = model.encode([query])[0].tolist()

        return {
            "query": query,
            "dimension": len(vector),
            "first_10_values": vector[:10],
            "vector": vector
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate query embedding: {str(e)}"
        )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
