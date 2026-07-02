from pydantic import BaseModel
from typing import List


class EmbedQueryRequest(BaseModel):
    text: str


class EmbedQueryResponse(BaseModel):
    embedding: List[float]
    dimension: int
    model: str
