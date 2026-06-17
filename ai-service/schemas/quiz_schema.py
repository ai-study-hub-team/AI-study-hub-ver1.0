from pydantic import BaseModel
from typing import List, Optional

class QuizChunk(BaseModel):
    chunkIndex: int
    chunkText: str
    textLength: Optional[int] = 0

class QuizRequest(BaseModel):
    documentId: int
    documentTitle: Optional[str] = None
    questionCount: int
    difficulty: Optional[str] = "MEDIUM"
    quizType: Optional[str] = "MULTIPLE_CHOICE"
    totalChunks: int
    totalTextLength: int
    chunks: List[QuizChunk]

class QuizOption(BaseModel):
    optionText: str
    isCorrect: bool

class QuizQuestion(BaseModel):
    questionText: str
    explanation: str
    options: List[QuizOption]

class QuizResponse(BaseModel):
    title: str
    questions: List[QuizQuestion]
