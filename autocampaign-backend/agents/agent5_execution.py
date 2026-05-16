from models.campaign import Agent5ExecutionOutput, TraceLog
from typing import Dict, Any, Tuple
import datetime

def run_agent5(job_id: str, budget: float, strategy: Dict[str, Any]) -> Tuple[Agent5ExecutionOutput, TraceLog]:
    """
    Agent 5: Execution + Recovery
    Executes the campaign. Simulates an SMS failure, retries twice, then falls back to WhatsApp.
    """
    
    # Simulate execution flow
    status = "completed_with_fallback"
    sms_status = "failed"
    retries = 2
    whatsapp_status = "success"
    
    final_log = f"Attempted to send SMS. Failed due to gateway timeout. Retried {retries} times. Triggered recovery protocol -> Successfully sent via WhatsApp."
    
    output = Agent5ExecutionOutput(
        status=status,
        sms_status=sms_status,
        retries_attempted=retries,
        whatsapp_fallback_status=whatsapp_status,
        final_execution_log=final_log
    )
    
    trace = TraceLog(
        agent_name="Agent 5: Execution + Recovery",
        decision_summary="SMS execution failed. 2 retries exhausted. Automatically fell back to WhatsApp API.",
        timestamp=datetime.datetime.now().isoformat(),
        metadata={"job_id": job_id, "final_status": whatsapp_status}
    )
    
    return output, trace
