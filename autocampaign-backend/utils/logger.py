import os
import json
import datetime
import threading

TRACE_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "traces", "execution_traces.json")
lock = threading.Lock()

def _append_trace(trace_type: str, data: dict):
    """Internal helper to write a trace record atomically."""
    with lock:
        try:
            # Ensure traces directory exists
            os.makedirs(os.path.dirname(TRACE_FILE), exist_ok=True)
            
            traces = []
            if os.path.exists(TRACE_FILE):
                try:
                    with open(TRACE_FILE, "r", encoding="utf-8") as f:
                        traces = json.load(f)
                        if not isinstance(traces, list):
                            traces = []
                except Exception:
                    traces = []
                    
            record = {
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "trace_type": trace_type,
                **data
            }
            traces.append(record)
            
            with open(TRACE_FILE, "w", encoding="utf-8") as f:
                json.dump(traces, f, indent=2, ensure_ascii=False)
                
            print(f"[ExecutionTrace] Successfully logged {trace_type} trace.")
        except Exception as e:
            print(f"[ExecutionTrace] ERROR writing trace: {e}")

def log_lead_parsing_trace(file_name: str, total_count: int, validation_errors: list):
    """
    Log the exact timestamp, original file name, total count of successfully parsed target emails 
    from the uploaded CSV, and any row validation errors.
    """
    _append_trace("Lead Parsing Trace", {
        "file_name": file_name,
        "total_emails_parsed": total_count,
        "validation_errors": validation_errors or []
    })

def log_asset_generation_trace(response_time_ms: float, seed: int, image_url: str, video_url: str):
    """
    Log the precise Gemini/Stability API response time, raw generation seed, 
    and the structured image/video asset URLs successfully bound to the campaign session.
    """
    _append_trace("AI Asset Generation Trace", {
        "api_response_time_ms": response_time_ms,
        "generation_seed": seed,
        "bound_image_url": image_url,
        "bound_video_url": video_url
    })

def log_resend_dispatch_trace(recipient_email: str, status_code: int, response_payload: dict):
    """
    Log the exact dispatch timestamp for every single target email, the server return reference 
    payload, and status codes (e.g., HTTP 200 Success or Error Codes) to guarantee complete transparency.
    """
    _append_trace("Resend Dispatch Trace", {
        "recipient_email": recipient_email,
        "status_code": status_code,
        "response_payload": response_payload
    })
