from pydantic import BaseModel
from typing import List, Optional
from schemas.usage_schema import UsageResponse


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
    """
    Structured intent plan returned by the Chat Planner.

    The `usage` field carries Gemini token counts for the planner Gemini call.
    It is Optional so that the fallback (no Gemini call) path can safely
    return None, and Spring Boot must treat None as zero tokens.
    """
    intent: str
    rewrittenQuestion: str
    retrievalStrategy: str
    searchQueries: List[str]
    needsRetrieval: bool
    confidence: float
    # Token usage from the planner's Gemini call (None when using safe fallback)
    usage: Optional[UsageResponse] = None
