from models.campaign import Agent2ContradictionOutput, Agent3StrategyOutput, ActionStep, RoiPrediction, Constraints, TraceLog
from typing import Tuple
import datetime

def run_agent3(job_id: str, agent2_data: Agent2ContradictionOutput, budget: float) -> Tuple[Agent3StrategyOutput, TraceLog]:
    """
    Agent 3: Strategy + Constraints
    Attaches budget, time, and resource constraints. Rejects/modifies infeasible actions.
    """
    
    constraints = Constraints(
        budget_limit=budget,
        time_limit_days=14,
        resources_available=["social_media_team", "graphic_designer", "sms_gateway"]
    )
    
    # Mock constraint-based decision making
    # Proposing an expensive TV ad that gets rejected, and a feasible social campaign that gets approved
    
    output = Agent3StrategyOutput(
        root_cause=agent2_data.unified_truth_summary,
        action_chain=[
            ActionStep(
                name="Targeted Social Media Meme Campaign",
                description="Launch a high-engagement social media campaign addressing delivery delays with humor to rebuild trust.",
                budget_required=3000.0,
                urgency="high",
                is_feasible=True
            ),
            ActionStep(
                name="SMS Apology & Discount Code",
                description="Send a 15% discount code via SMS to all affected customers.",
                budget_required=500.0,
                urgency="high",
                is_feasible=True
            )
        ],
        roi_prediction=RoiPrediction(low=2.5, mid=4.0, high=6.2),
        constraints_applied=constraints,
        rejected_actions=[
            "National TV Commercial (Rejected: Exceeds budget limit by 500%)",
            "Influencer Meetup Event (Rejected: Exceeds time limit of 14 days to organize)"
        ]
    )
    
    trace = TraceLog(
        agent_name="Agent 3: Strategy + Constraints",
        decision_summary=f"Applied budget constraint of ${budget}. Rejected TV Commercial and Influencer Meetup. Approved Social Campaign and SMS Apology.",
        timestamp=datetime.datetime.now().isoformat(),
        metadata={"job_id": job_id, "budget": budget, "rejected_count": 2}
    )
    
    return output, trace
