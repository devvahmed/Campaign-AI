from models.campaign import TraceLog, Agent6TraceOutput
from typing import Dict, List

def log_trace(store: Dict[str, List[Dict]], job_id: str, trace: TraceLog):
    """
    Agent 6: Trace Logger
    Helper to log agent decisions. Wraps them in the Antigravity structure.
    """
    if job_id not in store:
        store[job_id] = []
    store[job_id].append(trace.model_dump())

def format_antigravity_trace(job_id: str, raw_logs: List[Dict]) -> Agent6TraceOutput:
    """
    Formats the raw logs into the required Antigravity output structure.
    """
    logs = [TraceLog(**log) for log in raw_logs]
    return Agent6TraceOutput(
        job_id=job_id,
        logs=logs
    )
