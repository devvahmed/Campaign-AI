import httpx
import os

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
    """Smart fallback based on Pakistani seasonal/cultural events 2025"""
    import datetime
    month = datetime.datetime.now().month

    if month in [3, 4]:  # March-April = PSL + Eid season
        return {
            "topic": "PSL 2025 — Pakistan Super League Cricket Season",
            "snippet": "PSL 10 is in full swing! Pakistan cricket fever is at its peak with sold-out stadiums across Karachi, Lahore, and Rawalpindi.",
            "source": "fallback_seasonal",
            "how_to_use": "Reference PSL excitement in ad copy for maximum engagement"
        }
    elif month in [5, 6]:  # May-June = Summer + Eid
        return {
            "topic": "Garmi ka Mausam — Pakistan Summer Season 2025",
            "snippet": "Pakistan is entering peak summer with temperatures soaring. Cooling products, beverages, and light clothing are trending heavily.",
            "source": "fallback_seasonal",
            "how_to_use": "Use summer heat as a pain point that your product solves"
        }
    elif month in [9, 10, 11]:  # Sept-Nov = Wedding season
        return {
            "topic": "Shadi Season — Pakistani Wedding Season 2025",
            "snippet": "Pakistan's peak wedding season is here! Mehndi, baraat, and walima events are trending across all major cities.",
            "source": "fallback_seasonal",
            "how_to_use": "Connect your product to wedding/celebration needs"
        }
    elif month == 12 or month == 1:  # Winter
        return {
            "topic": "Sardi ka Mausam — Pakistan Winter 2025",
            "snippet": "Winter is here in Pakistan! Warm beverages, shawls, and indoor activities are trending across social media.",
            "source": "fallback_seasonal",
            "how_to_use": "Reference winter comfort and warmth in your ad"
        }
    else:
        return {
            "topic": "Pakistan Independence Day Spirit — Azaadi Festival",
            "snippet": "Pakistani patriotism is running high with Azaadi celebrations and national pride trending on social media.",
            "source": "fallback_seasonal",
            "how_to_use": "Use Pakistan pride and patriotism to connect emotionally"
        }
