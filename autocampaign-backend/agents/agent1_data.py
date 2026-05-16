from models.campaign import InputData, Agent1IngestionOutput, Anomaly, TemporalTrend, TraceLog
from typing import Tuple
import datetime

def run_agent1(job_id: str, inputs: InputData) -> Tuple[Agent1IngestionOutput, TraceLog]:
    """
    Agent 1: Multi-Source Ingestion
    Processes 5 distinct input sources: CSV/JSON, PDF Report, Website Article, Table Dashboard, Mock Feed.
    Performs Temporal Analysis and filters noise.
    """
    
    # In a real scenario, this would use Gemini API to analyze all 5 inputs.
    # We are returning mock data here as requested.
    
    output = Agent1IngestionOutput(
        anomalies=[
            Anomaly(
                metric="Competitor Pricing",
                description="Competitor 'BrandX' dropped prices by 15% across all tables and feeds.",
                severity="high"
            )
        ],
        temporal_trends=[
            TemporalTrend(
                metric="Sales Volume",
                trend="accelerating down",
                description="Sales have been consistently dropping for 3 months — accelerating trend observed from PDF reports and CSV data.",
                values=[1200, 950, 600]
            )
        ],
        filtered_noise_points=12 # 12 irrelevant data points ignored
    )
    
    trace = TraceLog(
        agent_name="Agent 1: Multi-Source Ingestion",
        decision_summary="Successfully processed 5 sources (CSV, PDF, Web, Table, Feed). Filtered 12 noise points. Detected accelerating downward trend in sales.",
        timestamp=datetime.datetime.now().isoformat(),
        metadata={"job_id": job_id, "sources_processed": 5}
    )
    
    return output, trace
