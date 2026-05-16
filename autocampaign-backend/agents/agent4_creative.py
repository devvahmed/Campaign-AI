from models.campaign import Agent4CreativeOutput, TraceLog
from typing import Dict, Any, Tuple
import datetime
import requests

def run_agent4(job_id: str, strategy: Dict[str, Any]) -> Tuple[Agent4CreativeOutput, TraceLog]:
    """
    Agent 4: Creative Generator
    Generates ad copy, compares with competitors, incorporates a Pakistani trend/meme.
    Attempts to generate a real image via a free API, falls back to hardcoded if it fails.
    """
    
    trend_used = "Awaam pareshan hai meme (Pakistani Trend)"
    competitor_comparison = "Unlike 'BrandY' and 'BrandZ' who ignore their delays, we are owning our mistakes and giving you 15% off!"
    ad_copy = f"Delivery late hui? Tension nahi lene ka! {trend_used}. {competitor_comparison} Use code SORRY15 for your next order."
    image_prompt = "A funny, slightly chaotic delivery situation in a bustling street of Lahore, vibrant colors, high quality, cinematic lighting"
    
    # Attempt to use a free, no-auth image API
    image_url = ""
    is_fallback = False
    fallback_image = "https://images.unsplash.com/photo-1616423640778-28d1b53229bd?auto=format&fit=crop&q=80&w=1000"
    
    try:
        # We use pollinations.ai for a quick free mock generation without API keys
        api_url = f"https://image.pollinations.ai/prompt/{requests.utils.quote(image_prompt)}"
        # Just check if it's reachable
        response = requests.head(api_url, timeout=3)
        if response.status_code == 200:
            image_url = api_url
        else:
            image_url = fallback_image
            is_fallback = True
    except Exception:
        image_url = fallback_image
        is_fallback = True
        
    output = Agent4CreativeOutput(
        ad_copy=ad_copy,
        competitor_comparison=competitor_comparison,
        trend_meme_used=trend_used,
        image_prompt=image_prompt,
        image_url=image_url,
        is_fallback_image=is_fallback
    )
    
    trace = TraceLog(
        agent_name="Agent 4: Creative Generator",
        decision_summary=f"Generated copy using '{trend_used}'. Image fallback status: {is_fallback}.",
        timestamp=datetime.datetime.now().isoformat(),
        metadata={"job_id": job_id, "fallback_used": is_fallback}
    )
    
    return output, trace
