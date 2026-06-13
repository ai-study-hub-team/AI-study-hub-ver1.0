"""
schemas/chat_schema.py
──────────────────────
Pydantic models for the POST /chat endpoint.
Field names match exactly what Spring Boot's PythonChatResponse expects.
"""

from pydantic import BaseModel, field_validator
from typing import List


# ─── Request Models ───────────────────────────────────────────────────────────

class PythonMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    sessionId: str
    question: str
    documentIds: List[int]
    history: List[PythonMessage] = []

    @field_validator("question")
    @classmethod
    def question_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("question must not be empty or blank")
        return v

    @field_validator("documentIds")
    @classmethod
    def document_ids_valid(cls, v: List[int]) -> List[int]:
        if not v:
            raise ValueError("documentIds must not be empty")
        if len(v) > 5:
            raise ValueError("Cannot select more than 5 documents per question.")
        return v


# ─── Response Models ─────────────────────────────────────────────────────────

class CitationResponse(BaseModel):
    documentId: int
    chunkIndex: int
    score: float
    previewText: str


class ChatResponse(BaseModel):
    answer: str
    citations: List[CitationResponse]
