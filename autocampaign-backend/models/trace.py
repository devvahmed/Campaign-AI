from pydantic import BaseModel
from typing import List, Optional

class TraceLog(BaseModel):
    job_id: str
    agent: str
    timestamp: str
    workplan: str
    tool_calls: List[str]
    reasoning: str
    decision: str
    confidence: float
    latency_ms: int
    output_summary: str
