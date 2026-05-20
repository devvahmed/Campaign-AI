import httpx
import os
from duckduckgo_search import DDGS

GOOGLE_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY")
SEARCH_ENGINE_ID = os.getenv("GOOGLE_SEARCH_ENGINE_ID")


async def search_competitors(product_name: str, city: str) -> list:
    """Live competitor brands dhundho Pakistan mein via Google Custom Search"""
    query = f"{product_name} brand Pakistan {city} discount offer 2025"

    if not GOOGLE_API_KEY or not SEARCH_ENGINE_ID:
        return _fallback_competitors(product_name)

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/customsearch/v1",
                params={
                    "key": GOOGLE_API_KEY,
                    "cx": SEARCH_ENGINE_ID,
                    "q": query,
                    "num": 5,
                    "gl": "pk",
                    "hl": "en"
                },
                timeout=10.0
            )

        if response.status_code != 200:
            print(f"[SearchService] Competitors search HTTP {response.status_code}")
            return _fallback_competitors(product_name)

        results = response.json().get("items", [])
        competitors = []

        for item in results[:3]:
            competitors.append({
                "brand": item.get("title", "").split("-")[0].strip()[:50],
                "snippet": item.get("snippet", ""),
                "url": item.get("link", ""),
                "source": "live_search"
            })

        return competitors if competitors else _fallback_competitors(product_name)

    except Exception as e:
        print(f"[SearchService] Competitors search error: {e}")
        return _fallback_competitors(product_name)


async def search_pakistan_trends() -> dict:
    """
    Pakistan mein aaj kya viral/trending hai — fetched from Google Custom Search.
    Searches multiple trend signals and returns the most relevant.
    """
    queries = [
        "Pakistan viral trending topic today 2025",
        "Pakistan social media trend this week",
        "Pakistan trending news event today"
    ]

    if not GOOGLE_API_KEY or not SEARCH_ENGINE_ID:
        print("[SearchService] No API keys — using fallback trends")
        return _fallback_trend()

    for query in queries:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://www.googleapis.com/customsearch/v1",
                    params={
                        "key": GOOGLE_API_KEY,
                        "cx": SEARCH_ENGINE_ID,
                        "q": query,
                        "num": 3,
                        "gl": "pk",
                        "hl": "en",
                        "dateRestrict": "d7"   # last 7 days
                    },
                    timeout=10.0
                )

            if response.status_code != 200:
                print(f"[SearchService] Trend search HTTP {response.status_code} for query: {query}")
                continue

            items = response.json().get("items", [])
            if not items:
                continue

            top = items[0]
            topic = top.get("title", "").strip()
            snippet = top.get("snippet", "").strip()

            if topic and len(topic) > 5:
                print(f"[SearchService] Live trend found: {topic}")
                return {
                    "topic": topic[:120],
                    "snippet": snippet[:300],
                    "source": "live_search",
                    "how_to_use": ""
                }

        except Exception as e:
            print(f"[SearchService] Trend search error for '{query}': {e}")
            continue

    print("[SearchService] All trend queries failed — using fallback")
    return _fallback_trend()


async def search_pakistan_ad_trends(business_type: str) -> dict:
    """
    Search for current Pakistani advertising trends specific to a business type.
    E.g., food ads trends, fashion ad trends in Pakistan 2025.
    """
    query = f"Pakistan {business_type} advertisement marketing trend 2025"

    if not GOOGLE_API_KEY or not SEARCH_ENGINE_ID:
        return {"trend": "", "source": "fallback"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/customsearch/v1",
                params={
                    "key": GOOGLE_API_KEY,
                    "cx": SEARCH_ENGINE_ID,
                    "q": query,
                    "num": 3,
                    "gl": "pk",
                    "hl": "en"
                },
                timeout=8.0
            )

        if response.status_code != 200:
            return {"trend": "", "source": "error"}

        items = response.json().get("items", [])
        if not items:
            return {"trend": "", "source": "no_results"}

        top = items[0]
        return {
            "trend": top.get("snippet", "")[:200],
            "title": top.get("title", "")[:100],
            "source": "live_search"
        }

    except Exception as e:
        print(f"[SearchService] Ad trend search error: {e}")
        return {"trend": "", "source": "error"}


# ── Fallbacks — API fail ho to ye use ho ──────────────────────────────────────

def _fallback_competitors(product_name: str) -> list:
    return [
        {
            "brand": f"{product_name} Competitor A",
            "snippet": "Currently running 20% discount campaign in Pakistan",
            "url": "",
            "source": "fallback_mock"
        },
        {
            "brand": f"{product_name} Competitor B",
            "snippet": "Free delivery offer active across major cities",
            "url": "",
            "source": "fallback_mock"
        }
    ]


def _fallback_trend() -> dict:
    """Smart fallback based on dynamic market trajectory"""
    return {
        "topic": "Current Local Market Momentum",
        "snippet": "Local markets are experiencing high digital engagement with a surge in localized social commerce.",
        "source": "fallback_market",
        "how_to_use": "Leverage dynamic personalized content to capture shifting consumer attention."
    }


def _sanitize_product_name(name: str) -> str:
    """Strip special characters, trailing whitespace, and non-alphanumeric noise from product/brand names."""
    import re
    cleaned = re.sub(r'[^\w\s\-&]', '', name).strip()
    # Collapse multiple spaces
    cleaned = re.sub(r'\s+', ' ', cleaned)
    return cleaned


def _get_brand_search_context(product_name: str, business_type: str) -> str:
    """Dynamically append rich, descriptive search tags based on business name or type."""
    p_lower = product_name.lower()

    # Brand-specific overrides — match common Pakistani brand names to tailored search queries
    brand_overrides = {
        "outfitters": "high-street urban streetwear model apparel casual fashion",
        "khaadi": "pakistani lawn luxury embroidered ethnic fashion boutique",
        "sapphire": "premium pakistani lawn printed collection pret wear",
        "gul ahmed": "pakistani traditional lawn fabric prints elegant",
        "sana safinaz": "luxury bridal lawn pakistani high-end fashion",
        "ethnic": "ethnic pakistani kurta kurti embroidery festive collection",
        "j.": "modern contemporary pakistani fashion minimalist chic",
        "limelight": "affordable trendy pakistani women fashion collection",
        "bonanza": "satrangi pakistani lawn cotton summer collection",
        "pizza hut": "gourmet pizza restaurant cheesy delicious food platter",
        "dominos": "pizza fast food delivery hot cheese toppings",
        "kolachi": "pakistani fine dining restaurant seafood grill karachi",
        "saeed ghani": "herbal beauty skincare organic natural cosmetics",
        "daraz": "ecommerce online shopping gadgets deals technology",
    }

    for brand_key, context in brand_overrides.items():
        if brand_key in p_lower:
            return context

    # Business-type-based context
    type_contexts = {
        "fashion": "high-street urban fashion model luxury boutique clothing apparel",
        "food": "gourmet food platter restaurant delicious spicy cuisine",
        "chai": "karak tea cup steam cardamom warm cozy beverage",
        "beauty": "skincare cosmetic cream organic rose luxury beauty",
        "electronics": "minimalist technology gadget device phone modern sleek",
        "sports": "cricket match stadium victory action dynamic sports",
        "jewelry": "exquisite gold jewelry bridal elegant luxury",
        "sweets": "mithai sweets dessert celebration festive treats",
    }

    return type_contexts.get(business_type, "premium commercial product photography professional")


async def search_product_image(product_name: str, business_type: str = "generic", products: list = None) -> str:
    """
    Search DuckDuckGo with searchType=image for high-resolution product backdrops.
    Returns the first valid direct image URL, or "" on failure.
    """
    clean_name = _sanitize_product_name(product_name)
    brand_context = _get_brand_search_context(clean_name, business_type)
    query = f"{brand_context} high resolution"
    
    try:
        results = DDGS().images(query, max_results=1)
        if results and len(results) > 0:
            return results[0].get('image', '')
    except Exception as e:
        print(f"[SearchService] DDGS Image Search error: {e}")
        
    return ""



async def search_competitor_ads(competitor_name: str) -> list:
    """Live search competitor active ads using Google Custom Search, falling back to free keyless DuckDuckGo search if keys are missing."""
    query = f'site:facebook.com/ads/library "{competitor_name}" "active"'
    
    if GOOGLE_API_KEY and SEARCH_ENGINE_ID:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://www.googleapis.com/customsearch/v1",
                    params={
                        "key": GOOGLE_API_KEY,
                        "cx": SEARCH_ENGINE_ID,
                        "q": query,
                        "num": 3,
                        "gl": "pk",
                        "hl": "en"
                    },
                    timeout=10.0
                )

            if response.status_code == 200:
                items = response.json().get("items", [])
                if items:
                    return [{"title": item.get("title", ""), "snippet": item.get("snippet", ""), "link": item.get("link", "")} for item in items]
        except Exception as e:
            print(f"[SearchService] Google competitor ad search error for '{competitor_name}': {e}")

    # Keyless DuckDuckGo Search Fallback (100% free alternative)
    print(f"[SearchService] Running free DuckDuckGo fallback search for '{competitor_name}'")
    ddg_query = f"{competitor_name} Pakistan active sales discount promotion deals 2025"
    try:
        from duckduckgo_search import DDGS
        import asyncio
        
        def run_ddg():
            with DDGS() as ddgs:
                return list(ddgs.text(ddg_query, max_results=3))
                
        results = await asyncio.to_thread(run_ddg)
        if results:
            return [{"title": r.get("title", ""), "snippet": r.get("body", ""), "link": r.get("href", "")} for r in results]
    except Exception as e:
        print(f"[SearchService] DDG competitor ad search error for '{competitor_name}': {e}")
        
    return []
