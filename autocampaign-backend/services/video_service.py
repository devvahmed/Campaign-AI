import os
import asyncio
import httpx
import logging

logger = logging.getLogger(__name__)

FAL_SUBMIT_URL = "https://queue.fal.run/fal-ai/luma-dream-machine"

def _get_fal_key() -> str:
    """Helper to retrieve the FAL_API_KEY from environment."""
    return os.getenv("FAL_API_KEY", "").strip()

async def generate_ad_video(video_prompt: str) -> str:
    """
    Generate a dynamic 10-15s promotional video using Luma Dream Machine on Fal.ai.
    Uses Fal's Async Queue API: Submits a job, polls until completion, and returns the direct video MP4 URL.
    """
    fal_key = _get_fal_key()
    if not fal_key:
        logger.warning("[VideoService] FAL_API_KEY is not configured in the environment. Skipping video generation.")
        return ""

    headers = {
        "Authorization": f"Key {fal_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "prompt": video_prompt,
        "aspect_ratio": "16:9",
        "loop": False
    }

    logger.info(f"[VideoService] Submitting video job to Fal.ai with prompt: '{video_prompt[:120]}...'")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. Submit job to the Fal Queue
            response = await client.post(FAL_SUBMIT_URL, headers=headers, json=payload)
            if response.status_code != 200:
                logger.error(f"[VideoService] Submission failed with status {response.status_code}: {response.text}")
                return ""
            
            submit_data = response.json()
            request_id = submit_data.get("request_id")
            status_url = submit_data.get("status_url")
            
            if not request_id or not status_url:
                logger.error(f"[VideoService] Did not receive request_id or status_url in response: {submit_data}")
                return ""
                
            logger.info(f"[VideoService] Job submitted successfully. Request ID: {request_id}. Polling for completion...")

            # 2. Poll the status URL until completed or failed (max 3 minutes / 36 attempts)
            max_attempts = 36
            attempt = 0
            
            while attempt < max_attempts:
                await asyncio.sleep(5)
                attempt += 1
                
                status_response = await client.get(status_url, headers=headers)
                if status_response.status_code != 200:
                    logger.warning(f"[VideoService] Polling failed on attempt {attempt}: HTTP {status_response.status_code}")
                    continue
                    
                status_data = status_response.json()
                status = status_data.get("status")
                logger.info(f"[VideoService] Polling attempt {attempt}/{max_attempts}: Status is '{status}'")
                
                if status == "COMPLETED":
                    # Extract final video URL
                    video_info = status_data.get("video")
                    if video_info and isinstance(video_info, dict) and "url" in video_info:
                        video_url = video_info["url"]
                        logger.info(f"[VideoService] Success! Generated Video URL: {video_url}")
                        return video_url
                        
                    # Fallback to response_url or scanning data
                    response_url = status_data.get("response_url")
                    if response_url:
                        res_resp = await client.get(response_url, headers=headers)
                        if res_resp.status_code == 200:
                            res_data = res_resp.json()
                            vid_url = res_data.get("video", {}).get("url")
                            if vid_url:
                                logger.info(f"[VideoService] Success (via response_url)! Generated Video URL: {vid_url}")
                                return vid_url
                    
                    # Try scanning the raw response for any video key/value
                    for key in ["video", "outputs", "output"]:
                        val = status_data.get(key)
                        if isinstance(val, dict) and "url" in val:
                            logger.info(f"[VideoService] Success (via scan)! Generated Video URL: {val['url']}")
                            return val["url"]
                            
                    logger.error(f"[VideoService] Job marked COMPLETED but could not extract video URL: {status_data}")
                    return ""
                    
                elif status == "FAILED":
                    logger.error(f"[VideoService] Fal.ai video generation failed: {status_data.get('logs') or 'No logs available'}")
                    return ""
                    
            logger.warning("[VideoService] Video generation timed out after 3 minutes.")
            return ""

    except Exception as e:
        logger.error(f"[VideoService] Error during video generation flow: {e}", exc_info=True)
        return ""
