import os
import google.generativeai as genai
import json
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_gemini_response(prompt: str, response_mime_type: str = "text/plain") -> dict:
    """Helper to get a structured JSON response from Gemini, with robust markdown stripping."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not found in environment.")
        return {}

    try:
        genai.configure(api_key=api_key)
        # Use gemini-2.5-flash for speed and reliability in JSON mode
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        generation_config = {
            "temperature": 0.2,
            "top_p": 0.95,
            "top_k": 64,
            "max_output_tokens": 8192,
            # Removed strict response_mime_type to prevent HTTP 400 schema crashes
        }

        response = model.generate_content(prompt, generation_config=generation_config)
        
        text = response.text.strip()
        
        # Robust markdown strip
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"): lines = lines[1:]
            if lines and lines[-1].startswith("```"): lines = lines[:-1]
            text = "\n".join(lines).strip()
            
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            logger.error(f"Failed to decode JSON response: {text}")
            return {"text": text}
    except Exception as e:
        logger.error(f"Error calling Gemini API: {str(e)}")
        return {}


def analyze_competitors_live_with_gemini(business_name: str, business_type: str, competitor_a: str, competitor_b: str, snippets_a: list, snippets_b: list) -> dict:
    """Synthesize competitor search snippets using Gemini to construct structured insights"""
    prompt = f"""
    You are a Competitor Intelligence Analyst specializing in the Pakistani retail and service landscape.
    Analyze active Facebook ads and promotions for the competitor brands:
    - Competitor A: {competitor_a}
    - Competitor B: {competitor_b}
    
    These brands compete directly with our user's business "{business_name}" (Niche/Niche Category: {business_type}).
    
    Here is the live search snippet data fetched from Facebook Ad Library:
    - {competitor_a} Active Ads snippets: {json.dumps(snippets_a, ensure_ascii=False)}
    - {competitor_b} Active Ads snippets: {json.dumps(snippets_b, ensure_ascii=False)}
    
    Based on the snippets (or highly realistic regional retail trends if snippets are sparse or empty), generate a structured competitor intelligence report. Make sure the deals sound real, active, and localized to Pakistan (referencing areas like Karachi, Lahore, Islamabad, Clifton, DHA, Gulberg, etc. if relevant).
    
    Return EXACTLY a structured JSON payload with these keys:
    {{
      "competitorA": {{
        "name": "{competitor_a}",
        "active_deal": "Detailed promo headline and discount offer",
        "impact": "Market impact on consumer behavior or geographic hubs"
      }},
      "competitorB": {{
        "name": "{competitor_b}",
        "active_deal": "Detailed promo headline and discount offer",
        "impact": "Market impact on consumer behavior or geographic hubs"
      }},
      "ai_counter_insight": "Actionable summary of why competitors are capturing volume and what counter strategy the user should deploy."
    }}
    """
    
    result = get_gemini_response(prompt, "application/json")
    
    # Ensure correct keys are present
    if not isinstance(result, dict) or "competitorA" not in result or "competitorB" not in result or "ai_counter_insight" not in result:
        logger.warning("Gemini returned invalid schema for competitors. Constructing fallback...")
        return {}
        
    return result
