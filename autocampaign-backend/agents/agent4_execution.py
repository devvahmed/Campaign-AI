import time
from datetime import datetime
from models.campaign import Agent4Output, ExecutionStep, TraceLog

async def run_agent4(job_id: str, budget: float, strategy: dict) -> tuple[Agent4Output, TraceLog]:
    start_time = time.time()
    
    workplan = "Simulate execution of action chain. Trigger deliberate failure on SMS and demonstrate recovery via WhatsApp."
    tool_calls = ["execute_actions()", "send_sms()", "send_whatsapp_fallback()"]
    
    execution_steps = []
    actions = strategy.get("action_chain", [])
    total_cost = 0
    
    if not actions:
        # Fallback if strategy is empty
        actions = [{"name": "Launch Discount Campaign", "budget_required": 10000.0, "is_feasible": True}]
        
    for action in actions:
        if isinstance(action, dict):
            is_feasible = action.get("is_feasible", False)
            action_name = action.get("name", "Unknown Action")
            budget_req = action.get("budget_required", 0)
        else:
            is_feasible = action.is_feasible
            action_name = action.name
            budget_req = action.budget_required

        if not is_feasible:
            continue
            
        # Simulate SMS failure & WhatsApp recovery for the demo
        if "Launch" in action_name or "Notify" in action_name or "communicate" in action_name.lower():
            # Failure simulation
            execution_steps.append(ExecutionStep(
                step=f"{action_name} (SMS API)",
                status="FAILED",
                latency_ms=2005,
                message="SMS Gateway Timeout (504)"
            ))
            # Recovery simulation
            execution_steps.append(ExecutionStep(
                step=f"{action_name} (WhatsApp Fallback)",
                status="RECOVERED",
                latency_ms=450,
                message="Delivered successfully via WhatsApp API."
            ))
            total_cost += budget_req
        else:
            # Normal success
            execution_steps.append(ExecutionStep(
                step=action_name,
                status="SUCCESS",
                latency_ms=1100,
                message="Action completed."
            ))
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
    
    output = Agent4Output(
        status="COMPLETED_WITH_RECOVERY",
        execution_steps=execution_steps,
        final_message=f"Campaign executed successfully. Total cost: PKR {total_cost}"
    )
    
    return output, trace

