import httpx
import re
import logging
from urllib.parse import urljoin, urlparse
from services.ai_service import get_gemini_response

logger = logging.getLogger(__name__)

async def scrape_website(url: str) -> dict:
    """
    Scrapes a target website URL to extract title, description, keywords,
    a text snippet of its contents, and a potential brand logo image.
    """
    if not url or not (url.startswith("http://") or url.startswith("https://")):
        return {
            "title": "",
            "description": "",
            "keywords": "",
            "logo": "",
            "text": ""
        }

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
    }

    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            
        if response.status_code != 200:
            logger.warning(f"[Scraper] HTTP {response.status_code} for {url}")
            return {
                "title": "",
                "description": "",
                "keywords": "",
                "logo": "",
                "text": ""
            }

        html = response.text
        
        # 1. Title Extraction
        title = ""
        title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        if title_match:
            title = title_match.group(1).strip()

        # 2. Meta Tags Extraction
        description = ""
        desc_match = re.search(r'<meta\s+[^>]*name=["\']description["\'][^>]*content=["\'](.*?)["\']', html, re.IGNORECASE)
        if not desc_match:
            desc_match = re.search(r'<meta\s+[^>]*content=["\'](.*?)["\']\s+[^>]*name=["\']description["\']', html, re.IGNORECASE)
        if not desc_match:
            # Try OpenGraph og:description
            desc_match = re.search(r'<meta\s+[^>]*property=["\']og:description["\'][^>]*content=["\'](.*?)["\']', html, re.IGNORECASE)
        if desc_match:
            description = desc_match.group(1).strip()

        keywords = ""
        keys_match = re.search(r'<meta\s+[^>]*name=["\']keywords["\'][^>]*content=["\'](.*?)["\']', html, re.IGNORECASE)
        if keys_match:
            keywords = keys_match.group(1).strip()

        # 3. Logo URL Extraction
        logo = ""
        # Strategy A: Check shortcut icons / apple touch icons
        icons = re.findall(r'<link\s+[^>]*rel=["\'](?:shortcut\s+)?icon["\'][^>]*href=["\'](.*?)["\']', html, re.IGNORECASE)
        if not icons:
            icons = re.findall(r'<link\s+[^>]*href=["\'](.*?)["\']\s+[^>]*rel=["\'](?:shortcut\s+)?icon["\']', html, re.IGNORECASE)
        if not icons:
            icons = re.findall(r'<link\s+[^>]*rel=["\']apple-touch-icon["\'][^>]*href=["\'](.*?)["\']', html, re.IGNORECASE)
            
        for icon_path in icons:
            if any(ext in icon_path.lower() for ext in [".png", ".jpg", ".jpeg", ".svg"]):
                logo = urljoin(url, icon_path)
                break

        # Strategy B: OpenGraph Image (often contains a logo or brand representation)
        if not logo:
            og_match = re.search(r'<meta\s+[^>]*property=["\']og:image["\'][^>]*content=["\'](.*?)["\']', html, re.IGNORECASE)
            if og_match:
                logo = urljoin(url, og_match.group(1).strip())

        # Strategy C: Main Image tag containing 'logo' or 'brand' in class, id, or src
        if not logo:
            img_tags = re.findall(r'<img\s+([^>]*src=["\']([^"\']+)["\'][^>]*)>', html, re.IGNORECASE)
            for attrs, src in img_tags:
                attrs_lower = attrs.lower()
                if "logo" in attrs_lower or "brand" in attrs_lower:
                    logo = urljoin(url, src)
                    break
            
            # Fallback to first image containing 'logo' in filename
            if not logo:
                for _, src in img_tags:
                    if "logo" in src.lower():
                        logo = urljoin(url, src)
                        break

        # 4. Visible Text Content
        # Remove scripts, styles, HTML comments, and tags
        text = html
        text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()

        return {
            "title": title[:200],
            "description": description[:300],
            "keywords": keywords[:300],
            "logo": logo,
            "text": text[:3000]  # First 3k chars is plenty for Gemini to grasp the brand
        }

    except Exception as e:
        logger.error(f"[Scraper] Exception occurred scraping {url}: {e}")
        return {
            "title": "",
            "description": "",
            "keywords": "",
            "logo": "",
            "text": ""
        }


async def get_bulletproof_logo_url(url: str, scraped_logo: str = "") -> str:
    """
    Dynamically resolve brand domains to clean transparent logo files.
    Bypasses complex HTML meta-tag parsing and directly constructs a verified Clearbit Logo API string.
    If Clearbit returns a 404/empty response on a HEAD request, fall back immediately to Google Favicon service.
    The final output is guaranteed to never be empty.
    """
    domain = ""
    try:
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path
        if not domain and "/" in url:
            domain = url.split("//")[-1].split("/")[0]
        if domain.startswith("www."):
            domain = domain[4:]
        domain = domain.split("/")[0]
        domain = domain.strip().lower()
    except Exception:
        pass

    if not domain:
        # If absolutely no domain can be extracted, fall back to scraped_logo if present, or generic logo placeholder
        return scraped_logo or "https://logo.clearbit.com/placeholder.com"

    clearbit_url = f"https://logo.clearbit.com/{domain}"
    google_url = f"https://www.google.com/s2/favicons?sz=128&domain={domain}"

    try:
        async with httpx.AsyncClient(timeout=3.0, follow_redirects=True) as client:
            resp = await client.head(clearbit_url)
            if resp.status_code == 200:
                logger.info(f"[Scraper] Clearbit logo verified successfully for {domain}")
                return clearbit_url
            else:
                logger.warning(f"[Scraper] Clearbit HEAD check returned {resp.status_code} for {domain}")
    except Exception as e:
        logger.warning(f"[Scraper] Clearbit HEAD check failed for {domain}: {e}")

    # Fallback immediately to Google Favicon service
    try:
        async with httpx.AsyncClient(timeout=3.0, follow_redirects=True) as client:
            resp = await client.head(google_url)
            if resp.status_code == 200:
                logger.info(f"[Scraper] Google favicon verified successfully for {domain}")
                return google_url
            else:
                logger.warning(f"[Scraper] Google favicon HEAD check returned {resp.status_code} for {domain}")
    except Exception as e:
        logger.warning(f"[Scraper] Google favicon HEAD check failed for {domain}: {e}")

    # Enforce that logo_url is NEVER empty. Fall back to Google Favicon
    return google_url


async def explore_brand_website(url: str, business_name: str) -> dict:
    """
    Crawls a brand's website, extracts semantic metadata, and uses Gemini
    to deduce brand colors, persona, industry category, product keywords,
    and a verified brand logo image.
    """
    logger.info(f"[Scraper] Exploring website: '{url}' for brand '{business_name}'...")
    
    scraped = await scrape_website(url)
    
    title = scraped.get("title", "")
    desc = scraped.get("description", "")
    keys = scraped.get("keywords", "")
    logo = scraped.get("logo", "")
    text = scraped.get("text", "")
    
    prompt = f"""
    You are a professional brand identity strategist and market researcher.
    We successfully crawled the homepage of the business "{business_name}" (URL: {url}).
    Here is the scraped metadata and page content:
    - Scraped Title: {title}
    - Scraped Description: {desc}
    - Scraped Keywords: {keys}
    - Scraped Extracted Text: {text[:2000]}
    - Found Logo Candidate URL: {logo}

    Based on this data, deduce the brand identity with high accuracy:
    1. brand_color: A beautiful, premium primary brand color Hex Code (e.g. HSL tailored high-end colors like #FF5500 for spicy food, #7E22CE or #6B2737 for ethnic style/apparel, #10B981 for wellness, #0B132B for modern technology). Avoid cheap basic colors.
    2. brand_persona: A brief description of the brand identity (e.g. "Sleek & Professional Creative Hub", "Culturally Rich & Curated Elegance").
    3. business_type: The EXACT category of this business. Choose ONLY one of these strings: "fashion", "food", "chai", "sports", "electronics", "beauty", "jewelry", "sweets", "generic".
    4. products: A list of 4-6 principal keywords/products that this brand sells (e.g. ["lawn", "kurta", "kurti", "dresses", "pret", "unstitched"] for a clothing brand like Ethnic). Keep them simple, short, single-word or short phrases.
    5. logo_url: The verified brand logo URL. If we found a logo candidate above "{logo}" and it is a valid image URL, return it. If it is relative or invalid, resolve it to an absolute URL or suggest the best possible favicon/logo URL, otherwise return null.

    Return EXCLUSIVELY a valid JSON object in this exact format:
    {{
        "brand_color": "Hex Code",
        "brand_persona": "Persona Description",
        "business_type": "one of the categories listed above",
        "products": ["prod1", "prod2", "prod3", "prod4"],
        "logo_url": "valid absolute URL or null"
    }}
    """
    
    result = get_gemini_response(prompt)
    
    # ── Robust Double-Layer Brand Logo Extraction ───────────────────
    final_logo = await get_bulletproof_logo_url(url, logo)

    is_valid = (
        isinstance(result, dict) and 
        "brand_color" in result and 
        "brand_persona" in result and 
        "business_type" in result and
        "products" in result
    )
    
    if is_valid:
        logger.info(f"[Scraper] Gemini successfully analyzed brand identity: {result}")
        result["logo_url"] = final_logo if final_logo else result.get("logo_url", "")
        return result

    # ── Robust Local Fallback (Gemini rate-limited or offline) ────────────────
    logger.warning("[Scraper] Gemini analysis unavailable — applying local rule-based classification")
    
    search_space = (title + " " + desc + " " + keys + " " + text + " " + business_name).lower()
    
    # 1. Rule-based Category detection
    if any(w in search_space for w in ["cloth", "boutique", "fashion", "wear", "dress", "brand", "apparel", "garment", "lawn", "kurti", "kurta", "shalwar", "kameez", "unstitched", "pret"]):
        b_type = "fashion"
        b_color = "#6B2737"  # Elegant ethnic plum/maroon
        b_persona = "Culturally Rich & Curated Fashion"
        b_products = ["lawn", "kurta", "kurti", "dresses", "unstitched", "pret"]
    elif any(w in search_space for w in ["restaurant", "pizza", "burger", "food", "delivery", "biryani", "karahi", "kabab", "tikka", "bbq", "diner", "cuisine"]):
        b_type = "food"
        b_color = "#2E4F4F"  # Deduced pizza green
        b_persona = "Spicy & Friendly Culinary Experience"
        b_products = ["karahi", "biryani", "kababs", "burgers", "platters"]
    elif any(w in search_space for w in ["chai", "cafe", "tea", "qahwa", "karak"]):
        b_type = "chai"
        b_color = "#92400e"  # Karak amber brown
        b_persona = "Traditional & Relaxing Desi Chai Hub"
        b_products = ["karak chai", "doodh patti", "paratha", "samosas", "green tea"]
    elif any(w in search_space for w in ["soap", "beauty", "cosmetic", "cream", "lotion", "skincare", "shampoo", "glow"]):
        b_type = "beauty"
        b_color = "#0D9488"  # Fresh teal
        b_persona = "Premium & Refreshing Skincare Secrets"
        b_products = ["cleanser", "glowing cream", "soap", "lotion", "serum"]
    elif any(w in search_space for w in ["mobile", "tech", "phone", "gadget", "electronics", "ac", "fan", "solar", "battery", "laptop", "computer"]):
        b_type = "electronics"
        b_color = "#1E3A88"  # Sleek blue tech
        b_persona = "Sleek & Innovative Tech Solutions"
        b_products = ["mobiles", "gadgets", "laptops", "accessories", "appliances"]
    elif any(w in search_space for w in ["sports", "cricket", "game", "bat", "ball", "psl", "football", "fitness"]):
        b_type = "sports"
        b_color = "#15803D"  # PSL Green
        b_persona = "High-Energy & Professional Sports Gear"
        b_products = ["cricket bats", "balls", "sports kits", "shoes", "fitness gear"]
    elif any(w in search_space for w in ["jewel", "gold", "ring", "necklace", "bangle", "silver"]):
        b_type = "jewelry"
        b_color = "#B59410"  # Golden amber
        b_persona = "Exquisite & Timeless Luxury Jewelry"
        b_products = ["rings", "necklaces", "bangles", "earrings", "sets"]
    elif any(w in search_space for w in ["sweet", "mithai", "bakery", "cake", "dessert", "halwa"]):
        b_type = "sweets"
        b_color = "#D97706"  # Golden sweet
        b_persona = "Rich & Celebration-Ready Desi Sweets"
        b_products = ["mithai", "cakes", "halwa", "bakery products", "sweets"]
    else:
        b_type = "generic"
        b_color = "#0A84FF"  # Baseline blue
        b_persona = "Friendly & Modern Quality Brand"
        b_products = ["premium product", "special offer", "exclusive deal"]

    fallback_result = {
        "brand_color": b_color,
        "brand_persona": b_persona,
        "business_type": b_type,
        "products": b_products,
        "logo_url": final_logo
    }
    
    logger.info(f"[Scraper] Fallback brand identity constructed: {fallback_result}")
    return fallback_result
