from models.campaign import Agent1IngestionOutput, Agent2ContradictionOutput, Contradiction, CredibilityScore, TraceLog
from typing import Tuple
import datetime

def run_agent2(job_id: str, agent1_data: Agent1IngestionOutput) -> Tuple[Agent2ContradictionOutput, TraceLog]:
    """
    Agent 2: Contradiction Detector
    Identifies conflicting claims across sources, scores source credibility, and resolves conflicts.
    """
    
    # Mock contradiction detection logic
    output = Agent2ContradictionOutput(
        contradictions=[
            Contradiction(
                source_a="PDF Report",
                source_b="Social Media Feed",
                metric="Customer Sentiment",
                description="PDF report claims customer satisfaction is stable, while social media feed shows a sudden spike in complaints about delayed deliveries.",
                resolution="Social media data prioritized due to higher recency and volume of direct customer feedback."
            )
        ],
        credibility_scores=[
            CredibilityScore(source="PDF Report", score=0.75, reason="Authoritative but 2 weeks old."),
            CredibilityScore(source="Social Media Feed", score=0.95, reason="Highly recent and direct from consumers."),
            CredibilityScore(source="Competitor Website", score=0.60, reason="Potentially biased marketing material.")
        ],
        unified_truth_summary="Sales are accelerating downwards primarily due to recent delivery delays causing immediate negative sentiment on social media, contradicting older stable reports."
    )
    
    trace = TraceLog(
        agent_name="Agent 2: Contradiction Detector",
        decision_summary="Detected conflict between PDF Report and Social Media regarding sentiment. Resolved in favor of Social Media due to higher recency score (0.95).",
        timestamp=datetime.datetime.now().isoformat(),
        metadata={"job_id": job_id, "conflicts_resolved": 1}
    )
    
    return output, trace
