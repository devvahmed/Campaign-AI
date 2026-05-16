import os
import json
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models.campaign import AnalyzeRequest, StrategyResponse
from agents.agent1_data import run_agent1
from agents.agent2_contradiction import run_agent2
from agents.agent3_strategy import run_agent3
from agents.agent4_creative import run_agent4
from agents.agent5_execution import run_agent5
from agents.agent6_trace import log_trace
from pydantic import BaseModel
from typing import Dict, Any

class GenerateAssetsRequest(BaseModel):
    job_id: str
    strategy: Dict[str, Any]

class ApproveRequest(BaseModel):
    job_id: str
    budget: float
    strategy: Dict[str, Any]

load_dotenv()

app = FastAPI(title="AutoCampaign AI Backend")

# Allow all CORS for hackathon simplicity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for trace logs
trace_store = {}

@app.post("/api/analyze", response_model=StrategyResponse)
def analyze_data(request: AnalyzeRequest):
    if request.job_id not in trace_store:
        trace_store[request.job_id] = []
        
    # Agent 1: Multi-Source Ingestion
    agent1_out, trace1 = run_agent1(request.job_id, request.inputs)
    log_trace(trace_store, request.job_id, trace1)
    
    # Agent 2: Contradiction Detector
    agent2_out, trace2 = run_agent2(request.job_id, agent1_out)
    log_trace(trace_store, request.job_id, trace2)
    
    # Agent 3: Strategy + Constraints
    agent3_out, trace3 = run_agent3(request.job_id, agent2_out, request.budget)
    log_trace(trace_store, request.job_id, trace3)
    
    return StrategyResponse(
        job_id=request.job_id,
        agent1_data=agent1_out,
        agent2_contradiction=agent2_out,
        agent3_strategy=agent3_out
    )

@app.post("/api/generate-assets")
def generate_assets(request: GenerateAssetsRequest):
    # Agent 4: Creative Generator
    assets_out, trace4 = run_agent4(request.job_id, request.strategy)
    log_trace(trace_store, request.job_id, trace4)
    return assets_out

@app.post("/api/approve")
def approve_campaign(request: ApproveRequest):
    # Agent 5: Execution + Recovery
    execution_out, trace5 = run_agent5(request.job_id, request.budget, request.strategy)
    log_trace(trace_store, request.job_id, trace5)
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
                with open(os.path.join(mock_dir, f), "r") as file:
                    data = json.load(file)
                    if data.get("scenario_id") == scenario_id:
                        return data
    raise HTTPException(status_code=404, detail="Scenario not found")

@app.get("/api/trace/{job_id}")
def get_trace(job_id: str):
    if job_id not in trace_store:
        raise HTTPException(status_code=404, detail="Trace not found")
    # Format the raw logs into Antigravity structure
    from agents.agent6_trace import format_antigravity_trace
    return format_antigravity_trace(job_id, trace_store[job_id])
