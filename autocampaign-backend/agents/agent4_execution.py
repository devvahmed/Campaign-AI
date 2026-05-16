import time
from datetime import datetime
from models.trace import TraceLog

def run_agent4(job_id: str, budget: float, strategy: dict) -> tuple[dict, TraceLog]:
    start_time = time.time()
    
    workplan = "Simulate execution of action chain. Trigger deliberate failure on SMS and demonstrate recovery via WhatsApp."
    tool_calls = ["execute_actions()", "send_sms()", "send_whatsapp_fallback()"]
    
    execution_log = []
    
    actions = strategy.get("action_chain", [])
    total_cost = 0
    
    for action in actions:
        if not action.get("is_feasible"):
            continue # Skip infeasible actions
            
        action_name = action.get("name")
        budget_req = action.get("budget_required", 0)
        
        # Simulate SMS failure & WhatsApp recovery for the demo
        if "Notify" in action_name or "communicate" in action_name.lower():
            # Failure simulation
            execution_log.append({
                "action": action_name + " (SMS)",
                "status": "FAILED",
                "latency_ms": 2005,
                "error": "SMS Gateway Timeout (504)",
                "cost": 0
            })
            # Recovery simulation
            execution_log.append({
                "action": action_name + " (WhatsApp Fallback)",
                "status": "RECOVERED",
                "latency_ms": 450,
                "error": None,
                "cost": 50
            })
            total_cost += 50
        else:
            # Normal success
            execution_log.append({
                "action": action_name,
                "status": "SUCCESS",
                "latency_ms": 1100,
                "error": None,
                "cost": budget_req
            })
            total_cost += budget_req
            
    reasoning = "Executed all feasible actions. SMS notification failed due to timeout, successfully rolled back and triggered WhatsApp fallback."
    decision = "Campaign successfully executed with 1 automatic recovery."
    
    latency_ms = int((time.time() - start_time) * 1000) + 4200
    
    trace = TraceLog(
        job_id=job_id,
        agent="ExecutionAgent",
        timestamp=datetime.utcnow().isoformat() + "Z",
        workplan=workplan,
        tool_calls=tool_calls,
        reasoning=reasoning,
        decision=decision,
        confidence=0.99,
        latency_ms=latency_ms,
        output_summary="Execution complete. SMS failed -> WhatsApp succeeded."
    )
    
    result = {
        "execution_log": execution_log,
        "total_cost": total_cost,
        "final_status": "COMPLETED_WITH_RECOVERY"
    }
    
    return result, trace
