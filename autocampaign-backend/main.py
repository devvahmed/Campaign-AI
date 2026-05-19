import os
import json
import uuid
import hashlib
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

load_dotenv()

from models.campaign import AnalyzeRequest, StrategyResponse, ExecutionStep, UserRegisterRequest, UserLoginRequest
from agents.agent1_data import run_agent1
from agents.agent2_strategy import run_agent2
from agents.agent3_creative import run_agent3
from agents.agent4_execution import run_agent4
from services.email_service import send_campaign_email
from services.ai_service import get_gemini_response

TRACE_DIR = Path("traces")
TRACE_DIR.mkdir(exist_ok=True)

# ── Local JSON User Database Initialization ─────────────────────────────────
USERS_FILE = Path("users.json")
if not USERS_FILE.exists():
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump({}, f)

def load_users() -> dict:
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def save_users(users: dict):
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2, ensure_ascii=False)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def analyze_website_brand(website_url: str, business_name: str) -> dict:
    prompt = f"""
    You are a professional brand strategist and designer.
    Analyze the following brand details and deduce:
    1. A beautiful, premium primary brand color Hex Code (e.g. #FF5500 for spicy food, #0066FF for technology, #10B981 for organic/finance, #8B5CF6 for modern creative, etc.). Avoid generic bright red/blue/green. Use a harmonious, premium-looking color.
    2. A brief brand persona string (e.g., "Sleek & Professional Tech", "Spicy & Friendly Local Eatery", "Warm & Aspirational Creative Hub").

    Brand Details:
    - Business Name: {business_name}
    - Website URL: {website_url}

    Return ONLY a valid JSON object in this exact format:
    {{
        "brand_color": "Hex Code (e.g., #0066FF)",
        "brand_persona": "Persona Description"
    }}
    """
    
    result = get_gemini_response(prompt)
    if not result or "brand_color" not in result:
        return {
            "brand_color": "#0088FF",
            "brand_persona": "Friendly & Modern Business"
        }
    return result


class GenerateAssetsRequest(BaseModel):
    job_id: str
    strategy: Dict[str, Any]
    business_knowledge_level: str = "beginner"

class ApproveRequest(BaseModel):
    job_id: str
    budget: float
    strategy: Dict[str, Any]
    customerLeads: Optional[List[str]] = None
    ad_copy: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    business_name: Optional[str] = None
    brand_color: Optional[str] = None

app = FastAPI(title="AutoCampaign AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Path("generated_images").mkdir(exist_ok=True)
app.mount("/generated_images", StaticFiles(directory="generated_images"), name="images")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "AutoCampaign AI Backend"}

trace_store = {}
inputs_store = {}

def save_trace(job_id: str, trace_data: list):
    filepath = TRACE_DIR / f"{job_id}.json"
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(trace_data, f, indent=2, ensure_ascii=False)

def log_trace(store: dict, job_id: str, trace):
    if job_id not in store:
        store[job_id] = []
    store[job_id].append(trace.dict())
    save_trace(job_id, store[job_id])

# ── Authentication Endpoints ──────────────────────────────────────────────────

@app.post("/api/auth/register")
def register_user(request: UserRegisterRequest):
    users = load_users()
    email = request.email.strip().lower()
    
    if email in users:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Default premium baseline colors used when the user opts out
    DEFAULT_BRAND_COLOR = "#0A84FF"
    DEFAULT_BRAND_PERSONA = "Sleek & Professional AI Platform"
        
    if request.apply_brand_theme:
        brand_context = analyze_website_brand(request.website_url, request.business_name)
        brand_color = brand_context.get("brand_color", DEFAULT_BRAND_COLOR)
        brand_persona = brand_context.get("brand_persona", DEFAULT_BRAND_PERSONA)
    else:
        brand_color = DEFAULT_BRAND_COLOR
        brand_persona = DEFAULT_BRAND_PERSONA
    
    users[email] = {
        "email": email,
        "password_hash": hash_password(request.password),
        "business_name": request.business_name,
        "website_url": request.website_url,
        "brand_color": brand_color,
        "brand_persona": brand_persona,
        "apply_brand_theme": request.apply_brand_theme
    }
    
    save_users(users)
    
    return {
        "status": "success",
        "user": {
            "email": email,
            "business_name": request.business_name,
            "website_url": request.website_url,
            "brand_color": brand_color,
            "brand_persona": brand_persona,
            "apply_brand_theme": request.apply_brand_theme
        }
    }

@app.post("/api/auth/login")
def login_user(request: UserLoginRequest):
    users = load_users()
    email = request.email.strip().lower()
    
    if email not in users:
        raise HTTPException(status_code=400, detail="Invalid email or password")
        
    user_record = users[email]
    if user_record["password_hash"] != hash_password(request.password):
        raise HTTPException(status_code=400, detail="Invalid email or password")
        
    return {
        "status": "success",
        "user": {
            "email": email,
            "business_name": user_record["business_name"],
            "website_url": user_record["website_url"],
            "brand_color": user_record["brand_color"],
            "brand_persona": user_record["brand_persona"],
            "apply_brand_theme": user_record.get("apply_brand_theme", True)
        }
    }

# ── Dynamic Pipeline Core Endpoints ───────────────────────────────────────────

@app.post("/api/analyze", response_model=StrategyResponse)
async def analyze_data(request: AnalyzeRequest, req: Request):
    inputs_store[request.job_id] = request.inputs.model_dump()
    
    if request.job_id not in trace_store:
        trace_store[request.job_id] = []
        
    # Agent 1: Data Intelligence
    agent1_out, trace1 = await run_agent1(request.job_id, request.inputs, request.business_knowledge_level)
    log_trace(trace_store, request.job_id, trace1)
    
    # Agent 2: Strategy
    agent2_out, trace2 = await run_agent2(request.job_id, agent1_out, request.budget, request.business_knowledge_level)
    log_trace(trace_store, request.job_id, trace2)
    
    # Agent 3: Creative Assets
    base_url = str(req.base_url).rstrip("/")
    agent3_out, trace3 = await run_agent3(
        request.job_id, 
        agent2_out.model_dump(), 
        request.business_knowledge_level, 
        base_url, 
        inputs_store[request.job_id],
        business_name=request.business_name,
        brand_color=request.brand_color
    )
    log_trace(trace_store, request.job_id, trace3)
    
    return StrategyResponse(
        job_id=request.job_id,
        agent1_data=agent1_out,
        agent2_strategy=agent2_out,
        agent3_creative=agent3_out
    )

@app.post("/api/approve")
async def approve_campaign(request: ApproveRequest):
    execution_out, trace4 = await run_agent4(request.job_id, request.budget, request.strategy)
    
    if request.customerLeads and request.ad_copy and request.image_url:
        subject = request.ad_copy.get('email_subject', '🚀 Your AI Campaign Assets are Ready!')
        ad_text = request.ad_copy.get('email_body', f"{request.ad_copy.get('headline_english', '')}\n\n{request.ad_copy.get('body_english', '')}")
        
        import asyncio
        tasks = [
            send_campaign_email(
                to_email=email,
                subject=subject,
                ad_text=ad_text,
                image_url=request.image_url,
                video_url=request.video_url or "",
                brand_color=request.brand_color or "#0088ff",
                business_name=request.business_name or "AutoCampaign Premium Hub"
            )
            for email in request.customerLeads
        ]
        
        results = await asyncio.gather(*tasks)
        success_count = sum(1 for r in results if r)
        total_leads = len(request.customerLeads)
        
        status = "Success" if success_count == total_leads else "Partial Success" if success_count > 0 else "Failed"
        execution_out.execution_steps.append(ExecutionStep(
            step="Bulk Email Dispatch (Resend)",
            status=status,
            latency_ms=1500,
            message=f"Successfully dispatched to {success_count} out of {total_leads} leads"
        ))
        trace4.tool_calls.append(f"bulk_send_campaign_email(leads={total_leads})")
        trace4.output_summary += f" | Bulk Email Dispatch: {status} ({success_count}/{total_leads})"
        
    log_trace(trace_store, request.job_id, trace4)
    return execution_out


@app.get("/api/scenarios")
def get_scenarios():
    scenarios = []
    mock_dir = "mock_data"
    if os.path.exists(mock_dir):
        for f in os.listdir(mock_dir):
            if f.endswith(".json"):
                with open(os.path.join(mock_dir, f), "r") as file:
                    data = json.load(file)
                    scenarios.append({"id": data.get("scenario_id"), "name": data.get("name")})
    return {"scenarios": scenarios}

@app.post("/api/load-scenario/{scenario_id}")
def load_scenario(scenario_id: str):
    mock_dir = "mock_data"
    if os.path.exists(mock_dir):
        for f in os.listdir(mock_dir):
            if f.endswith(".json"):
                with open(os.path.join(mock_dir, f), "r", encoding="utf-8") as file:
                    data = json.load(file)
                    if data.get("scenario_id") == scenario_id:
                        return data
    raise HTTPException(status_code=404, detail="Scenario not found")

@app.get("/api/trace/{job_id}")
def get_trace(job_id: str):
    if job_id not in trace_store:
        raise HTTPException(status_code=404, detail="Trace not found")
    return {"job_id": job_id, "logs": trace_store[job_id]}
