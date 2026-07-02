# Upload and Reprocess Embedding Fix Notes

## 1. Root Cause of Missing Embeddings

The bug where documents became `PROCESSED` despite missing `pgvector` embeddings was caused by two critical flaws in the old flow:

1. **Spring Boot aggressive cleanup (The main culprit)**: Inside `AiIntegrationService.saveChunks()`, Spring Boot was calling `pgvectorSearchService.deleteEmbeddingsByDocumentId(documentId)`. However, `saveChunks()` is executed **after** the Python AI service has already finished processing and inserting the new embeddings. Thus, Python successfully created and saved the embeddings, and then Spring Boot immediately deleted them!
2. **Python error swallowing**: Inside `main.py`, the vector storage step was treated as "best-effort." If `pgvector_store.upsert_document_chunks()` threw an error or failed to save vectors, `main.py` would still return `{"status": "PROCESSED"}` to Spring Boot as if nothing went wrong.

## 2. Old Broken Flow

1. User calls upload or reprocess.
2. Spring Boot sets document status to `PROCESSING`.
3. Spring Boot calls Python `/process-document`.
4. Python extracts text, chunks it, and creates embeddings.
5. Python deletes old embeddings and inserts new ones into `pgvector`.
6. Python ignores any vector insertion errors and always returns `PROCESSED`.
7. Spring Boot receives the response and calls `saveChunks()`.
8. Spring Boot saves chunks into `document_chunks`.
9. **Spring Boot deletes all pgvector embeddings for this document.** (Bug!)
10. Spring Boot sets status to `PROCESSED` without verifying if embeddings actually exist.

## 3. New Corrected Flow

1. User calls upload or reprocess.
2. Spring Boot sets document status to `PROCESSING`.
3. Spring Boot calls Python `/process-document`.
4. Python extracts text, chunks it, and creates embeddings.
5. Python deletes old embeddings and inserts new ones into `pgvector`.
6. **If vector storage fails**, Python immediately returns `FAILED` with a `vectorError` message.
7. Spring Boot receives the response. If Python returned `FAILED`, Spring Boot marks the document as `FAILED`.
8. If Python returned `PROCESSED`, Spring Boot saves chunks into `document_chunks` (the rogue deletion has been removed).
9. **Verification**: Spring Boot calls `countEmbeddingsByDocumentId()` to check the actual number of embeddings stored in `pgvector`.
10. **Validation**: 
    - If `chunk_count <= 0`, mark as `FAILED`.
    - If `embedding_count != chunk_count`, mark as `FAILED` (e.g., "Embedding count mismatch: expected 25 but found 0").
    - If counts match exactly, mark as `PROCESSED`.

## 4. Files Changed

| File | Changes Made |
| :--- | :--- |
| `ai-service/main.py` | Added `if not vector_stored: return FAILED` check inside `/process-document` endpoint. It now properly propagates vector storage errors. |
| `AiIntegrationService.java` | Removed `pgvectorSearchService.deleteEmbeddingsByDocumentId()` from `saveChunks()`. Added rigorous embedding count verification in `processDocument()` before finalizing the `PROCESSED` state. |

*(Note: `PgvectorSearchService.java` already had `countEmbeddingsByDocumentId()`, so no changes were needed there).*

## 5. Status Rules

A document will now only reach `PROCESSED` status when:
1. File exists and text extraction succeeds.
2. Text is successfully chunked (`chunk_count > 0`).
3. Embeddings are generated successfully in Python.
4. Embeddings are upserted into `document_chunk_embeddings` successfully.
5. Chunks are saved into `document_chunks` in the relational database.
6. The exact number of embeddings matches the exact number of chunks.

If **any** step fails, the document will remain at or become `FAILED` with a clear `processErrorMessage`.

## 6. How to Verify Manually

1. Upload or reprocess a document.
2. Open your database client and run:
```sql
-- Check document status and chunk count metadata
SELECT id, title, process_status, process_error_message, chunk_count
FROM documents
ORDER BY id DESC;

-- Verify actual text chunks saved
SELECT document_id, COUNT(*) AS chunk_count
FROM document_chunks
WHERE document_id = <document_id>
GROUP BY document_id;

-- Verify pgvector embeddings exist and count matches
SELECT document_id, COUNT(*) AS embedding_count
FROM document_chunk_embeddings
WHERE document_id = <document_id>
GROUP BY document_id;
```
3. Test a failure scenario: Stop the pgvector Docker container, then try uploading. The document should end up as `FAILED` with a database connection error message.

## 7. Confirmation
- The backend compiles successfully. (`mvnw.cmd clean compile` passed).
- The Chat AI flow and Semantic Search flow were untouched and remain functional.
