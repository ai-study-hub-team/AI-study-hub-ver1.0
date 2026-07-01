# Semantic Search Refactor Notes — PostgreSQL/pgvector

## 1. Why This Refactor Was Needed

**Vấn đề cũ:**
- Dự án đã chuyển đổi việc lưu trữ vector (vector storage) từ Pinecone sang PostgreSQL thông qua extension `pgvector`.
- Các vector nhúng (embeddings) của `document_chunks` hiện đã được lưu trữ an toàn trong bảng `document_chunk_embeddings` trên PostgreSQL.
- Tuy nhiên, tính năng Semantic Search vẫn phụ thuộc quá nhiều vào endpoint `/semantic-search` của Python. Trước đây, Python phải nhận truy vấn, tạo embedding, rồi tự query vào pgvector database, sau đó trả về danh sách `(documentId, chunkIndex, score)` cho Spring Boot.
- Việc bắt Python phải chịu trách nhiệm query database gây ra độ trễ (latency) lớn hơn do thêm một nhịp gọi HTTP (Spring Boot → Python → Database → Python → Spring Boot).

**Giải pháp:**
- **Spring Boot nên trực tiếp query pgvector**: Vì Spring Boot đã có kết nối JDBC trực tiếp đến PostgreSQL (`PgvectorSearchService`), nó hoàn toàn có thể tự thực thi câu lệnh SQL để tìm kiếm vector.
- **Python chỉ nên tập trung vào xử lý AI**: Python chỉ cần làm một việc duy nhất trong flow này là tạo embedding vector từ query text.

## 2. Old Semantic Search Flow

Flow cũ hoạt động theo các bước sau:

1. **Frontend** gọi API `GET /api/documents/semantic-search?query=...&documentId=...`
2. **Spring Boot** nhận request và gọi HTTP GET đến Python `/semantic-search`.
3. **Python** nhận query, dùng model `sentence-transformers` để tạo embedding vector.
4. **Python** mở connection đến pgvector (hoặc Pinecone cũ), thực hiện cosine similarity search.
5. **Python** trả về JSON array chứa `documentId, chunkIndex, score` cho Spring Boot.
6. **Spring Boot** duyệt qua mảng kết quả, dùng `DocumentChunkRepository` để fetch nội dung chữ (`chunkText`) thực tế tương ứng với các chunk index đó.
7. **Spring Boot** áp dụng fallback từ khoá (keyword fallback) và tăng điểm (keyword boost) cho tiếng Việt.
8. **Spring Boot** sort lại kết quả và trả về cho Frontend.

**Hạn chế của flow cũ sau khi migrate pgvector:**
- Chậm hơn mức cần thiết vì dữ liệu phải đi vòng qua Python service chỉ để thực thi một câu query SQL mà Spring Boot hoàn toàn có thể tự làm.

## 3. New Semantic Search Flow

Flow mới được thiết kế gọn gàng và tối ưu hơn:

1. **Frontend** gọi API `GET /api/documents/semantic-search?query=...`
2. **Spring Boot** nhận request và gọi HTTP POST đến Python endpoint mới: `/embed-query` (truyền raw text).
3. **Python** tạo query embedding và trả về mảng 384 số float nguyên thuỷ.
4. **Spring Boot** nhận embedding vector, gọi `PgvectorSearchService` để trực tiếp query bảng `document_chunk_embeddings` thông qua Spring JDBC.
5. **Spring Boot** fetch nội dung `chunkText` từ bảng `document_chunks` dựa trên `documentId` và `chunkIndex` vừa tìm được.
6. **Spring Boot** thực hiện Vietnamese keyword fallback & keyword boost trên các chunk text vừa lấy.
7. **Spring Boot** xếp hạng (rank) lại và trả kết quả cuối cùng cho Frontend.

**Phân chia trách nhiệm:**
- **Python**: CHỈ tạo query embedding.
- **Spring Boot**: Lo phần retrieval (query SQL pgvector), fetch text, scoring, và ranking.

## 4. Files Changed

| File | What changed | Why it changed | Important methods/endpoints added or modified |
| :--- | :--- | :--- | :--- |
| `ai-service/schemas/embed_schema.py` | Tạo mới schema cho endpoint embed. | Định nghĩa request/response payload (`EmbedQueryRequest`, `EmbedQueryResponse`) một cách rõ ràng. | Mới: class `EmbedQueryRequest`, `EmbedQueryResponse`. |
| `ai-service/main.py` | Thêm endpoint `/embed-query`. | Cung cấp API nhẹ để Spring Boot lấy embedding vector. | Mới: `@app.post("/embed-query")`. |
| `PgvectorSearchService.java` | Thêm method tìm kiếm vector trực tiếp bằng JDBC. | Cần một phương thức thực thi câu lệnh SQL dùng toán tử cosine distance (`<=>`) trên pgvector. | Mới: `searchByEmbedding(float[] queryEmbedding, ...)`. |
| `SemanticSearchService.java` | Viết lại flow để dùng embed-query và PgvectorSearchService thay vì gọi Python semantic-search. | Chuyển trách nhiệm query db về lại Spring Boot, loại bỏ code thừa và dư thừa (như vòng lặp batch fetch n+1 cũ). | Sửa: `search()`, `retrieveForChat()`.<br>Mới: `callEmbedAndSearch()`, `callEmbedQuery()`. |

## 5. New Python `/embed-query` Endpoint

- **Endpoint path**: `POST /embed-query`
- **Request body**: `EmbedQueryRequest` chứa `text` cần nhúng.
- **Response body**: `EmbedQueryResponse` chứa mảng `embedding`, `dimension`, `model`.
- **Embedding model**: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (tương tự như lúc process document).
- **Embedding dimension**: 384 chiều.
- **Lý do endpoint này KHÔNG query pgvector**: Để tách biệt rạch ròi trách nhiệm (Separation of Concerns). AI service sinh vector, Backend service thao tác với Database.

**Example request:**
```json
{
  "text": "HTTP 401 là gì?"
}
```

**Example response:**
```json
{
  "embedding": [0.123, -0.045, 0.887, ...],
  "dimension": 384,
  "model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
}
```

## 6. New Spring Boot pgvector Search

- **Nhận query**: Spring Boot nhận query từ User qua tham số REST Controller.
- **Lấy query embedding**: Spring Boot gửi query text qua `POST /embed-query` của Python và parse JSON để lấy mảng `float[]`.
- **Search DB (`PgvectorSearchService`)**: Spring parse `float[]` thành chuỗi vector literal hợp lệ của PostgreSQL (ví dụ: `'[0.1, 0.2, ...]'`).
- **SQL Execution**: Sử dụng `JdbcTemplate`, Spring chạy câu lệnh SQL có mệnh đề `ORDER BY embedding <=> ?::vector`. Phép toán `<=>` là cosine distance của pgvector.
- **Score calculation**: Điểm (cosine similarity) được tính bằng `1 - (embedding <=> ?::vector)`. Càng gần 1 càng giống nhau.
- **Document Filters**: Nếu có `documentId` hoặc list `documentIds`, SQL sẽ tự động thêm mệnh đề `WHERE document_id = ?` hoặc `WHERE document_id IN (...)`.
- **Top K**: SQL được giới hạn bằng lệnh `LIMIT ?` (với K thường lớn hơn K người dùng yêu cầu, gọi là `candidateK`, để có không gian cho việc keyword reranking).
- **Resolve text**: Sau khi có danh sách `(document_id, chunk_index)`, Spring dùng `DocumentChunkRepository` để fetch raw string từ PostgreSQL.

## 7. Keyword Fallback and Vietnamese Boost

Flow fallback và boost tiếng Việt **vẫn hoạt động nguyên vẹn và hiệu quả hơn** vì không còn phụ thuộc gián tiếp vào list candidate hạn hẹp từ Python.

- **Extract terms**: Stopwords tiếng Việt (như "là", "gì", "của", "và") bị loại bỏ khỏi query. Các từ quan trọng được giữ lại.
- **Fallback**: Nếu vector search bị thiếu sót từ khoá cụ thể, Spring tự động chạy câu truy vấn SQL `ILIKE` với từ khoá quan trọng để lấy thêm các chunk bị sót vào candidate pool.
- **Match checking & Scoring**: Spring Boot dùng tokenizer đơn giản để phân tích `chunkText`.
  - Khớp nguyên cụm (Exact phrase): +0.25 hoặc +0.15 score.
  - Khớp N-gram: +0.06 (trigram), +0.04 (bigram).
  - Tỉ lệ phủ từ vựng (Coverage): +0.12 nếu coverage > 85%.
- **FinalScore**: `base vector score` + `keyword boost` (giới hạn boost tối đa 0.3).
- **Lợi ích cho Tiếng Việt**: Do model vector có thể hiểu sai một vài từ vựng đặc thù, keyword boost đảm bảo rằng các đoạn văn chứa chính xác từ người dùng gõ sẽ được đẩy lên top 1.

## 8. Impact on Chat AI

Sự thay đổi này mang lại tác động cực kỳ tích cực cho Chat AI.

- **Chat AI có còn gọi Python `/semantic-search` không?**: **KHÔNG**.
- **Chat AI có dùng `SemanticSearchService.retrieveForChat()` không?**: **CÓ**.
- **Flow mới của Chat AI**: Từ giờ Chat AI tự động dùng flow `Spring Boot (embed-query) → Pgvector (trực tiếp) → Gemini` vì `retrieveForChat()` gọi cùng các method private (như `callEmbedAndSearch()`) dùng chung logic với Semantic Search.
- **Python làm gì trong Chat AI?**: Nó cung cấp vector qua `/embed-query`, sau đó ở bước tạo câu trả lời, nó cung cấp text qua `/generate-answer` (gọi Gemini).
- **Cyclic HTTP dependency đã bị loại bỏ hoàn toàn**: Spring Boot không còn bị block để chờ Python gọi ngược lại `/api/internal/chunks/resolve` nữa. Tình trạng Deadlock được xoá bỏ.
- **Check logs**: Bạn sẽ thấy `[embed-query]` trong log Python, và `[Chat RAG] pgvector direct returned X rows` trong log Spring Boot, cùng với log của `/generate-answer`. Endpoint `/semantic-search` cũ sẽ không xuất hiện trong log khi test Chat AI.

## 9. Impact on Upload and Reprocess

Các tính năng này **không bị thay đổi logic cốt lõi** và **hoạt động bình thường**.

- **Upload processing**: Khi upload, Python vẫn tự nhận text, tạo embedding, và lưu trực tiếp vào PostgreSQL `document_chunk_embeddings` thông qua module `pgvector_store.py`. (Do xử lý số lượng lớn, việc batch insert trực tiếp từ Python là tối ưu).
- **Reprocess**: Tương tự như upload. `PgvectorSearchService` vẫn có hàm `deleteEmbeddingsByDocumentId` để xoá vector cũ trước khi reprocess.
- **Lưu trữ**: Embeddings MỚI luôn được lưu vào PostgreSQL `document_chunk_embeddings`.
- **Verify**: Chạy câu lệnh SQL `SELECT count(*) FROM document_chunk_embeddings WHERE document_id = ?;` để kiểm chứng.

## 10. Pinecone Status

Tình trạng hiện tại của hệ thống với Pinecone:

- **Có dùng Pinecone trong flow Semantic Search mới không?**: **KHÔNG**.
- **`vector_store.py` có còn được chạy không?**: **KHÔNG** (nếu `VECTOR_STORE=pgvector`).
- **Dependency `pinecone` còn cần không?**: Về logic là không, nhưng hiện nó vẫn nằm trong `requirements.txt` và được import lỏng (lazy load).
- **Có thể xoá Pinecone ngay không?**: **CÓ THỂ**. Bạn có thể an toàn xoá key trong `.env` và package trong `requirements.txt`.
- **Files chứa code legacy Pinecone**: `ai-service/vector_store.py`, `ai-service/settings.py`. Vẫn được giữ lại theo yêu cầu của task này, không xoá hay chỉnh sửa gì thêm.

## 11. How to Test Manually

Dưới đây là các bước để bạn tự kiểm chứng:

### Start services
1. Start pgvector Docker instance ở port 5433 (tuỳ config).
2. Start Python AI service: `cd ai-service && uvicorn main:app --reload`
3. Start Spring Boot backend: `cd backend && mvnw spring-boot:run`
4. Mở Frontend UI (hoặc dùng `frontend_old` test tools).

### Verify embeddings exist
Dùng pgAdmin hoặc DBeaver chạy lệnh:
```sql
SELECT document_id, chunk_index, embedding
FROM document_chunk_embeddings
WHERE document_id = 1 /* Thay bằng ID của bạn */
ORDER BY chunk_index
LIMIT 5;
```

### Test Python embed endpoint
Dùng Postman hoặc curl:
```bash
curl -X POST http://localhost:8000/embed-query \
-H "Content-Type: application/json" \
-d '{"text":"Xin chào thế giới"}'
```
*Expected: Nhận được mảng 384 con số float.*

### Test backend semantic search
Dùng Postman hoặc curl:
```bash
curl "http://localhost:8080/api/documents/semantic-search?query=quy%20chế&documentId=1&topK=5"
```
*Expected: Kết quả chứa `chunkText`, `finalScore`, `documentTitle`.*

### Test ChatAI
1. Mở trang ChatTest trong `frontend_old`.
2. Tạo chat session, gắn vào một document đã PROCESSED.
3. Đặt câu hỏi dựa vào nội dung văn bản.
4. Chờ câu trả lời.
5. **Check Terminal Logs**:
   - Python: Thấy `[embed-query] Embedding text...` và `[generate-answer] Calling Gemini...`.
   - Python: **KHÔNG** thấy dòng `POST /api/internal/chunks/resolve`.
   - Spring: Thấy dòng `[Chat RAG] pgvector direct returned X rows...`.

### Test Summary and Quiz
1. Thử tạo Summary và Quiz cho 1 file. Đảm bảo mọi thứ tạo thành công bình thường. (Vì chúng không hề dính dáng đến Vector hay Semantic search).

## 12. Common Errors and How to Debug

| Symptom | Likely Cause | How to Fix / Check |
| :--- | :--- | :--- |
| API trả về 500, log Spring báo "Connection refused" khi gọi /embed-query | Python AI service bị sập hoặc sai port. | Check xem `uvicorn main:app` có đang chạy ở 8000 không. |
| Spring Boot lỗi "Operator does not exist: vector <=> vector" | DB chưa bật extension `pgvector`. | Chạy `CREATE EXTENSION IF NOT EXISTS vector;` trong schema. |
| Spring Boot log báo "pgvector searchByEmbedding failed: ... syntax error" | Truyền sai định dạng vector literal từ mảng float. | Kiểm tra thuật toán format chuỗi `[0.1,0.2...]` trong Java. |
| ChatAI trả lời "Mình không tìm thấy đủ thông tin..." nhưng tài liệu CÓ chứa từ đó | Embeddings trống, document chưa PROCESSED, hoặc DB pgvector lỗi cấu hình. | Check DB xem `document_chunk_embeddings` của `documentId` đó có data không. |
| Lỗi "dim=X != 384" (Dimension mismatch) | Đổi model sentence-transformers sang model khác khác chiều. | Giữ nguyên model `paraphrase-multilingual-MiniLM-L12-v2` cho cả lúc upload và search. |
| Python văng lỗi `google.api_core.exceptions.InvalidArgument` khi ChatAI | Thiếu API Key Gemini. | Kiểm tra file `ai-service/.env` biến `GEMINI_API_KEY`. |

## 13. Final Summary

- **What changed**: Trách nhiệm thực thi pgvector query đã được chuyển từ Python sang Spring Boot (`PgvectorSearchService`). Python chỉ cung cấp endpoint nhẹ là `/embed-query` để lấy vector.
- **Why it is better**: Tối ưu tốc độ, loại bỏ hoàn toàn các callback HTTP chéo cánh, giải quyết dứt điểm rủi ro Deadlock cho ChatAI. Flow dữ liệu bây giờ hoàn toàn là luồng tuyến tính một chiều (Frontend → Spring Boot → [Python for Vector] → Spring DB → [Python for LLM]).
- **What is still TODO**:
  - Dọn dẹp hẳn code Pinecone (sau khi team QA xác nhận pgvector ổn định).
  - Khắc phục bảo mật `userId` trong Controller.
- **What to test first**: Thử upload 1 file tiếng Việt, và đặt 1 câu hỏi có sử dụng tính năng Chat AI. Cảm nhận độ mượt và đọc các log sinh ra.
