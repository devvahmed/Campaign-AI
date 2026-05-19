from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class InputData(BaseModel):
    csv_sales_data: str = Field(..., description="📊 CSV Sales Numbers")
    pdf_report: str = Field(..., description="📄 PDF Business Report")
    news_text: str = Field(..., description="📰 News / Competitor Activity")
    social_posts: str = Field(..., description="💬 Social Posts / Customer Feedback")
    web_url: str = Field(..., description="🔗 Live Web Content URL")

class AnalyzeRequest(BaseModel):
    job_id: str
    budget: float = 15000.0
    inputs: InputData
    business_knowledge_level: str = "beginner"
    business_name: Optional[str] = None
    brand_color: Optional[str] = None

class UserRegisterRequest(BaseModel):
    email: str
    password: str
    business_name: str
    website_url: str
    apply_brand_theme: bool = True

class UserLoginRequest(BaseModel):
    email: str
    password: str

class Anomaly(BaseModel):
    metric: str
    description: str
    severity: str

class TemporalTrend(BaseModel):
    metric: str
    trend: str
    description: str
    values: List[float]

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

class CompetitorAnalysis(BaseModel):
    brand: str
    snippet: str
    url: str
    source: str

class TrendIntegration(BaseModel):
    topic: str
    snippet: str
    source: str
    how_to_use: str

class Agent1Output(BaseModel):
    insights: List[Anomaly]
    contradictions: List[Contradiction]
    credibility_scores: List[CredibilityScore]
    temporal_trends: List[TemporalTrend]
    competitor_analysis: List[CompetitorAnalysis]
    trend_integration: TrendIntegration

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

class Agent2Output(BaseModel):
    root_cause: str
    action_chain: List[ActionStep]
    roi_prediction: RoiPrediction
    constraints_checked: Dict[str, Any]

class AdCopy(BaseModel):
    headline_urdu: str
    headline_english: str
    body_urdu: str
    body_english: str
    cta_urdu: str
    cta_english: str
    email_subject: str
    email_body: str

class Agent3Output(BaseModel):
    ad_copy: AdCopy
    image_prompt: str
    image_url: str
    is_fallback: bool
    video_url: Optional[str] = None
    video_prompt: Optional[str] = None

class ExecutionStep(BaseModel):
    step: str
    status: str
    latency_ms: int
    message: str

class Agent4Output(BaseModel):
    status: str
    execution_steps: List[ExecutionStep]
    final_message: str

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

class StrategyResponse(BaseModel):
    job_id: str
    agent1_data: Agent1Output
    agent2_strategy: Agent2Output
    agent3_creative: Agent3Output

