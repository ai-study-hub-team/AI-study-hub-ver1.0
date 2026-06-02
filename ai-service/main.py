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
        
        if not os.path.exists(request.filePath):
            logger.error(f"File not found: {request.filePath}")
            return {
                "documentId": request.documentId,
                "status": "FAILED",
                "message": "File not found"
            }
            
        text = extract_text(request.filePath, request.fileType)
        text_length = len(text)
        preview_text = text[:500]
        
        logger.info(f"Extracted {text_length} characters from document ID: {request.documentId}")
        logger.info(f"Preview: {preview_text}")
        
        return {
            "documentId": request.documentId,
            "status": "PROCESSED",
            "message": "Text extracted successfully",
            "textLength": text_length,
            "previewText": preview_text
        }
    except Exception as e:
        logger.error(f"Error processing document ID {request.documentId}: {str(e)}")
        return {
            "documentId": request.documentId,
            "status": "FAILED",
            "message": f"Extraction error: {str(e)}"
        }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
