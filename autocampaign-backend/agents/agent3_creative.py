import time
from datetime import datetime
from models.trace import TraceLog

def run_agent3(job_id: str, strategy: dict) -> tuple[dict, TraceLog]:
    start_time = time.time()
    
    workplan = "Generate ad copy in Urdu and English based on strategy. Generate image prompt for DALL-E/Imagen."
    tool_calls = ["generate_copy(lang='urdu')", "generate_copy(lang='english')", "generate_image_prompt()"]
    
    # Simulate Agent 3 logic based on the mock scenario
    # In a real app, this would use Gemini to write the copy.
    
    ad_copy = {
        "headline_urdu": "گرمیوں کی خاص سیل — 15٪ ڈسکاؤنٹ!",
        "headline_english": "Summer Special Sale — 15% OFF!",
        "body_urdu": "آپ کا پسندیدہ صابن اب اور بھی سستا۔ آج ہی آرڈر کریں اور فائدہ اٹھائیں۔",
        "body_english": "Your favorite soap just got cheaper. Order today to grab the limited time discount.",
        "cta_urdu": "ابھی خریدیں",
        "cta_english": "Shop Now"
    }
    
    image_prompt = "A high quality, vibrant promotional image of a fresh blue soap bar surrounded by water splashes, with text space, modern minimal aesthetic."
    
    # Placeholder image since we don't have a real DALL-E key setup right now
    image_url = "https://via.placeholder.com/600x400/2563EB/FFFFFF?text=AI+Generated+Ad+Image"
    
    output_data = {
        "ad_copy": ad_copy,
        "image_prompt": image_prompt,
        "image_url": image_url
    }
    
    reasoning = "Generated bilingual ad copy to match the 15% discount counter-campaign strategy."
    decision = "Created 2 headlines, 2 body texts, and generated an image placeholder."
    
    latency_ms = int((time.time() - start_time) * 1000) + 3500 # Fake latency for creative generation
    
    trace = TraceLog(
        job_id=job_id,
        agent="CreativeAssetAgent",
        timestamp=datetime.utcnow().isoformat() + "Z",
        workplan=workplan,
        tool_calls=tool_calls,
        reasoning=reasoning,
        decision=decision,
        confidence=0.91,
        latency_ms=latency_ms,
        output_summary="Generated English/Urdu ad copy and image placeholder."
    )
    
    return output_data, trace
