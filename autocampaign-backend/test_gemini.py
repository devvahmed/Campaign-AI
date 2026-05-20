import os
import asyncio
from dotenv import load_dotenv
load_dotenv()

from services.ai_service import get_gemini_response

def test():
    print("API Key:", os.getenv("GEMINI_API_KEY"))
    prompt = "Return a valid JSON with a single key 'message' saying 'Hello from Gemini'."
    res = get_gemini_response(prompt)
    print("Response:", res)

if __name__ == "__main__":
    test()
