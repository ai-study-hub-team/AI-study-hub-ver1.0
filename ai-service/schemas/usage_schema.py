"""
schemas/usage_schema.py
──────────────────────
Reusable Pydantic model for Gemini token usage metadata.
Used by Chat, Summary, and Quiz responses.
"""

from pydantic import BaseModel


class UsageResponse(BaseModel):
    promptTokens: int = 0
    completionTokens: int = 0
    totalTokens: int = 0
