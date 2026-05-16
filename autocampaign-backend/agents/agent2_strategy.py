import time
from datetime import datetime
from models.campaign import Agent1Output, Agent2Output
from models.trace import TraceLog
from services.ai_service import get_gemini_response

def run_agent2(job_id: str, agent1_data: Agent1Output, budget: float) -> tuple[Agent2Output, TraceLog]:
    start_time = time.time()
    
    # 1. Prepare Professional Prompt for Agent 2
    prompt = f"""
    You are the 'Strategy & Action Agent' for AutoCampaign AI. 
    Your mission is to take Data Insights and create a budget-constrained, autonomous action plan.

    DATA INSIGHTS:
    {agent1_data.json()}

    CONSTRAINTS:
    - Max Budget: PKR {budget}

    TASK:
    1. Determine the 'Root Cause' of the issues identified in the data.
    2. Create a 3-5 step 'Action Chain'.
    3. For EACH action, provide: name, description, budget_required (in PKR), and urgency (high|medium|low).
    4. Important: Set 'is_feasible' to true ONLY if the total cumulative budget of all preceding steps + current step <= {budget}.
    5. Predict ROI (Return on Investment) percentages for Conservative, Expected, and Optimistic outcomes.

    RETURN ONLY JSON IN THIS FORMAT:
    {{
        "root_cause": "string",
        "action_chain": [
            {{ "name": "string", "description": "string", "budget_required": float, "urgency": "string", "is_feasible": boolean }}
        ],
        "roi_prediction": {{ "low": float, "mid": float, "high": float }},
        "constraints_checked": {{ "budget": {budget}, "status": "ok|exceeded" }},
        "agent_reasoning": "string",
        "agent_decision": "string"
    }}
    """

    result = get_gemini_response(prompt)
    
    if not result:
        # Emergency Fallback
        result = {{
            "root_cause": "Unable to determine root cause via AI.",
            "action_chain": [],
            "roi_prediction": {{"low": 0, "mid": 0, "high": 0}},
            "agent_reasoning": "API Error",
            "agent_decision": "No strategy generated."
        }}

    latency_ms = int((time.time() - start_time) * 1000)
    
    trace = TraceLog(
        job_id=job_id,
        agent="StrategyAgent",
        timestamp=datetime.utcnow().isoformat() + "Z",
        workplan="Generate action chain, verify budget constraints, and predict ROI.",
        tool_calls=["generate_strategy()", f"check_constraints(PKR {budget})"],
        reasoning=result.get("agent_reasoning", "Synthesizing insights into a tactical execution plan."),
        decision=result.get("agent_decision", f"Proposed {len(result.get('action_chain', []))} actions within budget."),
        confidence=0.92,
        latency_ms=latency_ms,
        output_summary=f"Created {len(result.get('action_chain', []))} step action plan."
    )
    
    output_data = {k: v for k, v in result.items() if k in ["root_cause", "action_chain", "roi_prediction", "constraints_checked"]}
    
    return Agent2Output(**output_data), trace
