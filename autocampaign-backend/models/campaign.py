from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class InputData(BaseModel):
    csv_json: str = Field(..., description="CSV or JSON dataset")
    pdf_report: str = Field(..., description="PDF or Report text extract")
    website_article: str = Field(..., description="Website or Competitor Article content")
    table_dashboard: str = Field(..., description="Table or Dashboard data snapshot")
    mock_feed: str = Field(..., description="Mock real-time JSON feed")

class AnalyzeRequest(BaseModel):
    job_id: str
    budget: float = 15000.0
    inputs: InputData

class Anomaly(BaseModel):
    metric: str
    description: str
    severity: str # "high", "medium", "low"

class TemporalTrend(BaseModel):
    metric: str
    trend: str # "accelerating up", "accelerating down", "stable"
    description: str
    values: List[float]

class Agent1IngestionOutput(BaseModel):
    anomalies: List[Anomaly]
    temporal_trends: List[TemporalTrend]
    filtered_noise_points: int

class CredibilityScore(BaseModel):
    source: str
    score: float
    reason: str

class Contradiction(BaseModel):
    source_a: str
    source_b: str
    metric: str
    description: str
    resolution: str

class Agent2ContradictionOutput(BaseModel):
    contradictions: List[Contradiction]
    credibility_scores: List[CredibilityScore]
    unified_truth_summary: str

class ActionStep(BaseModel):
    name: str
    description: str
    budget_required: float
    urgency: str
    is_feasible: bool

class RoiPrediction(BaseModel):
    low: float
    mid: float
    high: float

class Constraints(BaseModel):
    budget_limit: float
    time_limit_days: int
    resources_available: List[str]

class Agent3StrategyOutput(BaseModel):
    root_cause: str
    action_chain: List[ActionStep]
    roi_prediction: RoiPrediction
    constraints_applied: Constraints
    rejected_actions: List[str]

class Agent4CreativeOutput(BaseModel):
    ad_copy: str
    competitor_comparison: str
    trend_meme_used: str
    image_prompt: str
    image_url: str
    is_fallback_image: bool

class Agent5ExecutionOutput(BaseModel):
    status: str
    sms_status: str
    retries_attempted: int
    whatsapp_fallback_status: str
    final_execution_log: str

class TraceLog(BaseModel):
    agent_name: str
    decision_summary: str
    timestamp: str
    metadata: Dict[str, Any]

class Agent6TraceOutput(BaseModel):
    job_id: str
    logs: List[TraceLog]
    antigravity_signature: str = "Antigravity Active 🚀"

class StrategyResponse(BaseModel):
    job_id: str
    agent1_data: Agent1IngestionOutput
    agent2_contradiction: Agent2ContradictionOutput
    agent3_strategy: Agent3StrategyOutput
