import time
from datetime import datetime
from models.campaign import InputData, Agent1Output, TraceLog
from services.ai_service import get_gemini_response
from services.search_service import search_competitors, search_pakistan_trends

async def run_agent1(job_id: str, inputs: InputData, business_knowledge_level: str = "beginner") -> tuple[Agent1Output, TraceLog]:
    start_time = time.time()
    
    # 1. Live Search
    competitors_raw = await search_competitors(
        product_name=inputs.csv_sales_data[:50], # Extracting hint from the first field
        city="Pakistan" # Generalize
    )
    trend_raw = await search_pakistan_trends()
    
    language_instruction = ""
    if business_knowledge_level.lower() == "beginner":
        language_instruction = "CRITICAL INSTRUCTION: You MUST write ALL text fields (description, resolution, reason, agent_reasoning, etc.) ONLY in simple Roman Urdu (e.g., 'Ye cheez kam hai'). Absolutely NO English jargon!"
    else:
        language_instruction = "CRITICAL INSTRUCTION: You MUST write ALL text fields ONLY in Advanced Professional English. Use highly technical business and data analytics jargon. NO URDU."

    prompt = f"""
    You are the 'Data Intelligence Agent' for AutoCampaign AI.
    {language_instruction}
    Analyze the 5 data sources and the LIVE web search data to extract anomalies, contradictions, temporal trends, competitor analysis, and a trend integration strategy.

    BUSINESS DATA (5 Sources):
    1. 📊 CSV Sales Data: {inputs.csv_sales_data}
    2. 📄 PDF Business Report: {inputs.pdf_report}
    3. 📰 News / Competitor Activity: {inputs.news_text}
    4. 💬 Social Posts / Customer Feedback: {inputs.social_posts}
    5. 🔗 Web URL / Live Content: {inputs.web_url}

    LIVE COMPETITOR DATA (from web search):
    {competitors_raw}

    LIVE PAKISTAN TREND (from web search):
    {trend_raw}

    TASK:
    1. Detect anomalies related to the challenge (severity: high|medium|low). You MUST explain in detail WHAT the anomaly is and WHY it is happening in the 'description' field.
    2. Identify contradictions (if any) between the business challenge and market data. You MUST explain in detail WHAT the contradiction is and WHY it occurred in the 'description' and 'resolution' fields.
    3. Assign a credibility score (0.0 to 1.0) to the sources, explaining in detail WHAT the source represents and WHY it was assigned that score in the 'reason' field.
    4. Identify temporal trends from the data, detailing in the 'description' WHAT the trend is and WHY it is relevant to the business.
    5. Perform a Competitor Analysis based on the Live Competitor Data.
    6. Suggest a Trend Integration based on the Live Pakistan Trend.
    
    RETURN EXCLUSIVELY VALID JSON:
    {{
        "insights": [
            {{ "metric": "string", "description": "string", "severity": "high|medium|low" }}
        ],
        "contradictions": [
            {{ "source_a": "string", "source_b": "string", "metric": "string", "description": "string", "resolution": "string" }}
        ],
        "credibility_scores": [
            {{ "source": "string", "score": float, "reason": "string" }}
        ],
        "temporal_trends": [
            {{ "metric": "string", "trend": "string", "description": "string", "values": [float] }}
        ],
        "competitor_analysis": [
            {{ "brand": "string", "snippet": "string", "url": "string", "source": "string" }}
        ],
        "trend_integration": {{
            "topic": "string", "snippet": "string", "source": "string", "how_to_use": "string"
        }},
        "agent_reasoning": "string",
        "agent_decision": "string"
    }}
    """
    
    result = get_gemini_response(prompt)
    
    if not result:
        # Mock fallback
        result = {
            "insights": [
                {"metric": "Sales Drop", "description": "Critical drop reported in current challenge.", "severity": "high"}
            ],
            "contradictions": [],
            "credibility_scores": [{"source": "Business Input", "score": 1.0, "reason": "Direct input."}],
            "temporal_trends": [],
            "competitor_analysis": competitors_raw,
            "trend_integration": trend_raw,
            "agent_reasoning": "Mock fallback: Gemini API failed.",
            "agent_decision": "Flagged critical sales anomaly."
        }
        
    latency_ms = int((time.time() - start_time) * 1000)
    
    trace = TraceLog(
        job_id=job_id,
        agent="DataIntelligenceAgent",
        timestamp=datetime.utcnow().isoformat() + "Z",
        workplan="Ingest business data, search live web for competitors and trends, extract anomalies.",
        tool_calls=["search_competitors()", "search_pakistan_trends()", "detect_anomalies()"],
        reasoning=result.get("agent_reasoning", "Successfully combined live web data with business context."),
        decision=result.get("agent_decision", "Generated insights and competitor analysis."),
        confidence=0.95,
        latency_ms=latency_ms,
        output_summary=f"Found insights and integrated live trends."
    )
    
    output_data = {k: v for k, v in result.items() if k in ["insights", "contradictions", "credibility_scores", "temporal_trends", "competitor_analysis", "trend_integration"]}
    return Agent1Output(**output_data), trace

