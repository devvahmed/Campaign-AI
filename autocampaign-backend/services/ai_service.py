import os
import google.generativeai as genai
import json
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_gemini_response(prompt: str, response_mime_type: str = "application/json") -> dict:
    """Helper to get a structured JSON response from Gemini."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not found in environment.")
        return {}

    try:
        genai.configure(api_key=api_key)
        # Use gemini-1.5-flash for speed and reliability in JSON mode
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        generation_config = {
            "temperature": 0.2,
            "top_p": 0.95,
            "top_k": 64,
            "max_output_tokens": 8192,
            "response_mime_type": response_mime_type,
        }

        response = model.generate_content(prompt, generation_config=generation_config)
        
        if response_mime_type == "application/json":
            try:
                return json.loads(response.text)
            except json.JSONDecodeError:
                logger.error(f"Failed to decode JSON response: {response.text}")
                return {}
        return {"text": response.text}
    except Exception as e:
        logger.error(f"Error calling Gemini API: {str(e)}")
        return {}
