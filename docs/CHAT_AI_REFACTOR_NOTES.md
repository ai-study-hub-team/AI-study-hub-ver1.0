# Chat AI Refactor Notes — Removing Cyclic HTTP Dependency

> Tài liệu này ghi lại chi tiết thay đổi trong lần refactor Chat AI.
> Mục tiêu: loại bỏ vòng gọi HTTP tuần hoàn (Spring Boot → Python → Spring Boot).

---

## 1. Old Chat AI Flow (Có vấn đề)

```
Frontend
  → POST /api/chat/ask
  → ChatSessionService (Spring Boot)
      → validate user/session/documents
      → save USER message
      → build history
      → POST /chat (Python AI service)   ← Spring Boot BLOCK chờ Python
          → pgvector_store.semantic_search(documentIds)
          → POST /api/internal/chunks/resolve ← Python gọi ngược Spring Boot!
              → Spring Boot cần thread mới để xử lý
          ← return chunkText
          → build Gemini prompt
          → call Gemini
          ← return {answer, citations}
      ← Spring Boot nhận answer
      → save ASSISTANT message
      → save AiCitations
  ← return ChatAskResponse
```

**Vấn đề:**
- Spring Boot đang dùng 1 thread để chờ Python.
- Python gọi ngược Spring Boot → cần thêm 1 Tomcat thread mới.
- Khi load cao + Tomcat thread pool exhausted → **deadlock**.
- Python cũng không có keyword boost tiếng Việt khi search.

---

## 2. New Chat AI Flow (Đã fix)

```
Frontend
  → POST /api/chat/ask   (frontend API contract KHÔNG thay đổi)
  → ChatSessionService (Spring Boot)
      → validate user/session/documents
      → link documents to session
      → build history
      → save USER message
      → SemanticSearchService.retrieveForChat(question, documentIds, topK=5)
          → pgvector search (Python /semantic-search, per docId)
          → keyword fallback (PostgreSQL ILIKE)
          → hybrid boost scoring
          → resolve chunkText từ DocumentChunkRepository
          ← return List<PythonContextChunk> (đã có chunkText)
      → POST /generate-answer (Python AI service)
          → nhận {question, history, contextChunks}
          → build Gemini prompt từ contextChunks
          → call Gemini
          ← return {answer}
          (KHÔNG gọi ngược Spring Boot)
      ← nhận answer
      → save ASSISTANT message
      → save AiCitations từ contextChunks (Spring Boot đã có đủ data)
  ← return ChatAskResponse
```

**Kết quả:**
- Không còn cyclic dependency.
- Spring Boot chủ động làm retrieval với hybrid search tốt hơn.
- Python chỉ làm đúng 1 việc: gọi Gemini.

---

## 3. Files Changed

### Backend (Spring Boot)

| File | Thay đổi |
| :--- | :--- |
| `service/ChatSessionService.java` | **Rewritten.** Thay `POST /chat` bằng `retrieveForChat()` + `POST /generate-answer`. Inject `SemanticSearchService`. |
| `service/SemanticSearchService.java` | **Extended.** Thêm method `retrieveForChat(question, documentIds, topK)`. Method này thực hiện hybrid search lọc theo nhiều `documentIds`. |
| `dto/python/PythonContextChunk.java` | **New.** DTO để truyền resolved chunk (có chunkText) từ Spring Boot sang Python. |
| `dto/python/PythonGenerateAnswerRequest.java` | **New.** Request DTO cho Python `/generate-answer`. |
| `dto/python/PythonGenerateAnswerResponse.java` | **New.** Response DTO từ Python `/generate-answer`. |

### Python AI Service

| File | Thay đổi |
| :--- | :--- |
| `schemas/generate_answer_schema.py` | **New.** Pydantic models: `ContextChunk`, `HistoryMessage`, `GenerateAnswerRequest`, `GenerateAnswerResponse`. |
| `main.py` | **Extended.** Thêm endpoint `POST /generate-answer`. Endpoint `/chat` cũ vẫn còn (không xóa). |

### Files NOT Changed

- `ChatSessionController.java` — controller API không đổi
- `DocumentChunkController.java` — `/api/internal/chunks/resolve` vẫn còn (các feature khác có thể dùng)
- `SummaryService.java` — không thay đổi
- `QuizService.java` — không thay đổi
- `summary_service.py`, `quiz_service.py` — không thay đổi
- `pgvector_store.py`, `vector_store.py` — không thay đổi
- Frontend `ChatTest.jsx` — API contract `POST /api/chat/ask` không đổi

---

## 4. How Spring Boot Retrieval Works Now

`SemanticSearchService.retrieveForChat()` thực hiện 3 bước:

**Bước 1 — Semantic search per docId:**
- Gọi Python `GET /semantic-search?query=...&documentId={id}&topK=30` cho từng document ID trong danh sách.
- Python trả về `[(documentId, chunkIndex, score)]` — không có chunkText.
- Spring Boot batch-fetch `chunkText` từ `document_chunks` table qua `DocumentChunkRepository.findByDocument_IdAndChunkIndexIn()`.

**Bước 2 — Keyword fallback:**
- Tách query thành important terms (loại bỏ Vietnamese stopwords).
- Query PostgreSQL với `ILIKE '%phrase%'` per docId.
- Thêm vào candidate pool những chunk chưa có từ vector search.

**Bước 3 — Keyword boost + sorting:**
- Tính `finalScore = baseScore + keywordBoost` cho mỗi candidate.
- Sort descending, lấy top 5.
- Map sang `PythonContextChunk` (có `documentId`, `documentTitle`, `chunkIndex`, `chunkText`, `score`, `sourceLabel`).

---

## 5. What Python Does Now

Endpoint mới `POST /generate-answer`:

1. Nhận `{question, history, contextChunks}` từ Spring Boot.
2. Build context text: nối các `chunkText` với label `[Tài liệu: X — Chunk Y]`.
3. Build prompt gồm: `=== CONTEXT ===`, `=== LỊCH SỬ ===`, `=== CÂU HỎI ===`.
4. Call Gemini API với system instruction bằng tiếng Việt.
5. Return `{answer}`.

**Python KHÔNG:**
- Gọi pgvector.
- Gọi ngược Spring Boot.
- Parse/save citations.

---

## 6. How Citations Are Saved

Sau khi nhận `answer` từ Python, Spring Boot:
1. Loop qua `contextChunks` đã được chọn bởi `retrieveForChat()`.
2. Lookup `Document` từ `documentRepository`.
3. Lookup `DocumentChunk` từ `documentChunkRepository.findByDocument_IdAndChunkIndex()`.
4. Tạo `AiCitation` entity với `previewText` = 500 chars đầu của `chunkText`.
5. Save vào `ai_citations` table.

Citations bây giờ hoàn toàn dựa trên data của Spring Boot — không phụ thuộc Python.

---

## 7. Manual Test Checklist

| # | Test | Steps | Expected | Kiểm tra |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Chat 1 doc | Tạo session, ask question có trong tài liệu | Answer đúng nội dung | DB: 2 `chat_messages`, `ai_citations` created |
| 2 | Chat 5 docs | `documentIds` = 5 doc IDs | Answer tổng hợp từ nhiều docs | DB: `chat_session_documents` có 5 rows |
| 3 | Chat tiếng Việt | Ask câu hỏi tiếng Việt | Answer tiếng Việt, keyword boost hoạt động | Spring log: "[Chat RAG] retrieveForChat" |
| 4 | Câu hỏi không trong doc | Ask câu hỏi ngoài phạm vi | "Mình không tìm thấy đủ thông tin..." | Gemini theo system instruction |
| 5 | Verify no callback | Check Python log | Python log KHÔNG có gọi `/api/internal/chunks/resolve` | Python log |
| 6 | Spring log check | Check backend log | Log "[Chat RAG] retrieveForChat" xuất hiện | Backend log |
| 7 | Python down | Stop Python, ask | Fallback error message tiếng Việt | Backend log: "Error calling Python" |
| 8 | Chat history | Ask 2 câu liên tiếp | Câu 2 nhận biết context câu 1 | DB: 4 `chat_messages` |
| 9 | Summary still works | `POST /api/summaries/generate` | Vẫn tạo summary | Không bị ảnh hưởng |
| 10 | Quiz still works | `POST /api/quizzes/generate` | Vẫn tạo quiz | Không bị ảnh hưởng |

---

## 8. Remaining TODOs

### Must Fix (Security)
- **[HIGH]** Xóa `userId` khỏi `ChatAskRequest` và các request DTOs. Lấy userId từ JWT token qua `SecurityContextHolder`. Hiện tại `permitAll()` đang che lấp vấn đề bảo mật này.

### Should Fix (Reliability)
- **[MEDIUM]** Citation snapshot: `AiCitation` entity nên lưu `chunkText` snapshot tĩnh. Khi document bị reprocess, `document_chunks` cũ bị xóa nhưng citation vẫn trỏ vào chunk cũ (FK broken). Giải pháp: thêm cột `chunkTextSnapshot` vào `ai_citations`.
- **[LOW]** `retrieveForChat()` gọi Python `/semantic-search` N lần (1 lần per docId). Cải thiện bằng cách pass `document_ids` list vào 1 lần nếu Python endpoint được mở rộng để nhận list.

### Optional Future Improvements
- **Streaming response**: Thay `POST /api/chat/ask` bằng SSE endpoint để stream answer từ Gemini token-by-token.
- **Session management**: Giới hạn số lượng session per user, auto-expire old sessions.
- **Context window**: Giới hạn số messages trong `history` được gửi đến Gemini để tránh tốn token.

---

## 9. Architecture Comparison

```
OLD: Spring Boot ←────────────────────→ Python
                   calls /chat          calls /internal/chunks/resolve
                                        (DEADLOCK risk)

NEW: Spring Boot ──[retrieve]──→ DB
                ──[generate]──→ Python → Gemini
                                (no callback, no deadlock)
```
