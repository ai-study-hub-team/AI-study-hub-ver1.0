from pydantic import BaseModel
from typing import List, Optional


class ContextChunk(BaseModel):
    """A single document chunk with resolved text, sent by Spring Boot."""
    documentId: int
    documentTitle: Optional[str] = None
    chunkId: Optional[int] = None
    chunkIndex: int
    chunkText: str
    score: Optional[float] = None
    sourceLabel: Optional[str] = None


class HistoryMessage(BaseModel):
    role: str      # "USER" or "ASSISTANT"
    content: str


class GenerateAnswerRequest(BaseModel):
    """
    Request from Spring Boot to /generate-answer.
    Spring Boot has already performed semantic search and resolved chunk text.
    Python should only build the Gemini prompt and return the answer.
    """
    question: str
    rewrittenQuestion: Optional[str] = None
    intent: Optional[str] = "DOCUMENT_QA"
    history: Optional[List[HistoryMessage]] = []
    contextChunks: Optional[List[ContextChunk]] = []
    hasDocuments: Optional[bool] = True


class GenerateAnswerResponse(BaseModel):
    """Response from Python /generate-answer — just the answer string."""
    answer: str
