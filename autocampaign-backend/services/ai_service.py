import os
import google.generativeai as genai
import json
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_gemini_response(prompt: str, response_mime_type: str = "text/plain") -> dict:
    """Helper to get a structured JSON response from Gemini, with robust markdown stripping
    and automatic sequential model fallback to handle free-tier rate limits or quota exhausts.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not found in environment.")
        return {}

    try:
        genai.configure(api_key=api_key)
    except Exception as e:
        logger.error(f"Error configuring Google GenAI: {e}")
        return {}

    # Sequential models to try in order of capability/tier to bypass quota exhausts
    models_to_try = [
        "gemini-2.5-flash", 
        "gemini-1.5-flash", 
        "gemini-1.5-pro", 
        "gemini-2.0-flash-exp"
    ]
    
    last_error = None
    for model_name in models_to_try:
        try:
            logger.info(f"[Gemini] Attempting generation with model: {model_name}")
            model = genai.GenerativeModel(model_name)
            
            generation_config = {
                "temperature": 0.25,
                "top_p": 0.95,
                "top_k": 64,
                "max_output_tokens": 8192,
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
                data = json.loads(text)
                logger.info(f"[Gemini] Successfully retrieved valid JSON using model: {model_name}")
                return data
            except json.JSONDecodeError:
                logger.error(f"[Gemini] JSON Decode failed for model {model_name}. Response: {text}")
                return {"text": text}
                
        except Exception as e:
            last_error = e
            logger.warning(f"[Gemini] Model '{model_name}' failed or returned quota error: {e}")
            continue
            
    logger.error(f"[Gemini] All fallback models failed or exhausted. Last error: {last_error}")
    return {}


def analyze_competitors_live_with_gemini(
    business_name: str,
    business_type: str,
    competitor_a: str,
    competitor_b: str,
    snippets_a: list,
    snippets_b: list,
    products: list = None,
) -> dict:
    """
    Synthesize competitor search snippets using Gemini to construct structured, elite strategic insights.
    The AI is directed to generate McKinsey/BCG-grade, highly profitable, easy-to-understand counter-strategies
    that any non-business shopkeeper can immediately grasp and execute.
    Strictly forbids lazy, margin-killing flat discounts.
    Fully dynamic — works for any business type based on actual product list.
    """
    prod_str = ", ".join(products) if products else "the business's core product catalog"

    prompt = f"""
    You are an Elite Growth Strategy Consultant operating at McKinsey / BCG level, specializing in the Pakistani retail market.

    YOUR CLIENT:
    Business Name: "{business_name}"
    Industry / Niche: {business_type}
    Registered Products / Services: {prod_str}

    COMPETITOR INTELLIGENCE:
    - Competitor A: {competitor_a}
      Live Ad / Promotion Snippets: {json.dumps(snippets_a, ensure_ascii=False)}
    - Competitor B: {competitor_b}
      Live Ad / Promotion Snippets: {json.dumps(snippets_b, ensure_ascii=False)}

    YOUR MISSION:
    Analyze these competitor moves and construct a master-level counter-strategy for "{business_name}".

    MANDATORY RULES FOR "ai_counter_insight":
    1. ✅ Write it so a simple shopkeeper (non-MBA, non-business background) can instantly understand and act on it.
    2. ✅ Make it concise (3-4 punchy sentences max), highly professional, and immediately actionable.
    3. ✅ It MUST be specific to {business_name}'s actual products: {prod_str} — no generic advice.
    4. ✅ Recommend HIGH-MARGIN growth plays ONLY:
       - Value-added bundles (combine {prod_str} with a complementary low-cost add-on)
       - AOV (Average Order Value) threshold rewards (e.g. free upgrade on orders above a target value)
       - Premium positioning (sell quality, speed, experience — not price)
       - Loyalty upgrades (stamp cards, repeat customer rewards)
    5. 🚫 STRICTLY FORBIDDEN: Never suggest flat percentage discounts ("X% off", "buy one get one", "flat sale").
       These are margin-destroying moves that commoditize the brand — recommend VALUE instead.
    6. ✅ Keep the tone elite and confident — like a trusted business advisor, not a salesperson.
    7. ✅ Localize to Pakistan (Karachi, Lahore, Islamabad, DHA, Gulberg, Clifton) where relevant.

    Return EXACTLY a structured JSON payload with these keys:
    {{
      "competitorA": {{
        "name": "{competitor_a}",
        "active_deal": "Specific active promotion or campaign headline for {competitor_a}",
        "impact": "How this affects {business_name}'s customer base or geographic hubs"
      }},
      "competitorB": {{
        "name": "{competitor_b}",
        "active_deal": "Specific active promotion or campaign headline for {competitor_b}",
        "impact": "How this affects {business_name}'s customer base or geographic hubs"
      }},
      "ai_counter_insight": "⚡ [3-4 sentence high-margin counter-strategy for {business_name} referencing their specific products ({prod_str}). No flat discounts. Easy to understand. Immediately actionable.]"
    }}
    """

    result = get_gemini_response(prompt, "application/json")

    if not isinstance(result, dict) or "competitorA" not in result or "competitorB" not in result or "ai_counter_insight" not in result:
        logger.warning("Gemini returned invalid schema for competitors. Falling back to local engine.")
        return {}

    return result

