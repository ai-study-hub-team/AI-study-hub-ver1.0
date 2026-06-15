from pydantic import BaseModel
from typing import List, Optional

class SummaryChunk(BaseModel):
    chunkIndex: int
    chunkText: str
    textLength: Optional[int] = None

class SummaryRequest(BaseModel):
    documentId: int
    documentTitle: Optional[str] = None
    summaryType: str = "DETAILED"
    totalChunks: Optional[int] = None
    totalTextLength: Optional[int] = None
    chunks: List[SummaryChunk]

class SummaryResponse(BaseModel):
    summaryText: str
