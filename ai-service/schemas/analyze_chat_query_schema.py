from pydantic import BaseModel
from typing import List, Optional


class HistoryMessage(BaseModel):
    role: str
    content: str


class AnalyzeChatQueryRequest(BaseModel):
    """Request from Spring Boot to /analyze-chat-query (Chat Planner)."""
    question: str
    history: Optional[List[HistoryMessage]] = []
    hasDocuments: bool = False
    documentCount: int = 0


class AnalyzeChatQueryResponse(BaseModel):
    """Structured intent plan returned by the Chat Planner."""
    intent: str
    rewrittenQuestion: str
    retrievalStrategy: str
    searchQueries: List[str]
    needsRetrieval: bool
    confidence: float
