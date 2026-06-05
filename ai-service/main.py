from fastapi import FastAPI, Request
from pydantic import BaseModel
import uvicorn
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ai-service")

app = FastAPI(title="AI Document Processing Service")

class DocumentRequest(BaseModel):
    documentId: int
    fileName: str
    originalFileName: str
    filePath: str
    fileType: str

@app.post("/process-document")
async def process_document(request: DocumentRequest):
    logger.info(f"Received request to process document ID: {request.documentId}")
    logger.info(f"File Name: {request.fileName}")
    logger.info(f"Original File Name: {request.originalFileName}")
    logger.info(f"File Path: {request.filePath}")
    logger.info(f"File Type: {request.fileType}")
    
    try:
        import os
        from text_extractor import extract_text
        from text_chunker import chunk_text
        
        received_path = request.filePath
        abs_file_path = os.path.abspath(received_path)
        logger.info(f"Received file path: {received_path}")
        logger.info(f"Resolved absolute path: {abs_file_path}")
        
        file_exists = os.path.exists(abs_file_path)
        logger.info(f"File exists: {file_exists}")
        
        if not file_exists:
            logger.error(f"File not found: {abs_file_path}")
            return {
                "documentId": request.documentId,
                "status": "FAILED",
                "message": "File not found"
            }
            
        text = extract_text(abs_file_path, request.fileType)
        text_length = len(text)
        preview_text = text[:500]
        
        chunks = chunk_text(text)
        chunk_count = len(chunks)
        preview_chunks = chunks[:3]
        
        logger.info(f"Extracted {text_length} characters from document ID: {request.documentId}")
        logger.info(f"Created {chunk_count} chunks")
        if preview_chunks:
            logger.info(f"First chunk preview: {preview_chunks[0]['chunkText'][:100]}...")
        else:
            logger.info("Preview: " + preview_text)
            
        return {
            "documentId": request.documentId,
            "status": "PROCESSED",
            "message": "Text extracted and chunked successfully",
            "textLength": text_length,
            "chunkCount": chunk_count,
            "previewText": preview_text,
            "previewChunks": preview_chunks,
            "chunks": chunks
        }
    except Exception as e:
        logger.error(f"Error processing document ID {request.documentId}: {str(e)}")
        return {
            "documentId": request.documentId,
            "status": "FAILED",
            "message": f"Extraction/chunking error: {str(e)}"
        }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
