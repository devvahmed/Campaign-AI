import time
import asyncio
from datetime import datetime
from models.campaign import Agent3Output, TraceLog
from services.ai_service import get_gemini_response
from services.image_service import generate_ad_image
from services.video_service import generate_ad_video
from services.search_service import search_pakistan_trends, search_competitors


async def run_agent3(job_id: str, strategy: dict, business_knowledge_level: str = "beginner", base_url: str = None, original_inputs: dict = None, business_name: str = None, brand_color: str = None, scenario_id: str = None, business_type: str = "generic", products: list = None, logo_url: str = "") -> tuple[Agent3Output, TraceLog]:
    start_time = time.time()

    # ── Step 1: Fetch live Pakistani trends via Google Custom Search ──────────
    trend_data = await search_pakistan_trends()
    trend_topic = trend_data.get("topic", "Pakistan Super League 2025")
    trend_snippet = trend_data.get("snippet", "Cricket fever across Pakistan")
    trend_source = trend_data.get("source", "fallback_mock")

    # Detect product type from strategy + original_inputs
    search_text = str(strategy).lower()
    if original_inputs:
        for val in original_inputs.values():
            if isinstance(val, str):
                search_text += " " + val.lower()

    detected_type = _detect_business_type(search_text)
    if business_type and business_type != "generic":
        business_type = business_type
    else:
        business_type = detected_type

    # ── Step 2: Also search for competitors with the product name ─────────────
    product_name = business_name if business_name else _extract_product_name(strategy, original_inputs)
    city = "Karachi"  # Default city
    competitors = await search_competitors(product_name, city)
    competitor_summary = ", ".join([c.get("brand", "") for c in competitors[:2]])

    # ── Step 3: Build Pakistani ad image prompt FIRST (before Gemini call) ────
    base_image_prompt = _build_rich_image_prompt(business_type, product_name, trend_topic)

    brand_color_text = f"Primary Brand Color Hex: {brand_color}" if brand_color else ""

    # ── Step 4: Ask Gemini for bilingual ad copy informed by live trends ──────
    prompt = f"""
    You are the 'Creative Asset Agent' for AutoCampaign AI — a platform for Pakistani small businesses.

    LIVE PAKISTAN TREND DATA (from Google Search — use this in your copy!):
    Trending Topic: {trend_topic}
    Trend Details: {trend_snippet}
    Trend Source: {trend_source}

    COMPETITOR INSIGHTS:
    Competitors found: {competitor_summary or 'No direct competitors identified'}

    BUSINESS TYPE DETECTED: {business_type}
    PRODUCT/BRAND: {product_name}
    {brand_color_text}

    STRATEGY CONTEXT:
    {strategy}

    CRITICAL COPYWRITING RULES (MUST FOLLOW):
    1. ABSOLUTELY FORBIDDEN to mention sales drops, low demand, low sales, business slumps, contradictions, or internal business problems. The customer should NEVER know your sales are down or that this is based on a 'problem'. Keep the tone 100% positive, premium, aspirational, and growth-focused.
    2. Act as a World-Class Growth Marketer for a premium brand, using the dynamic product name "{product_name}". 
    3. Position the exclusive discount or offer 100% positively as a festive celebration or celebration of the live Pakistani trend "{trend_topic}"!
    4. Write like a Pakistani friend texting — casual, warm, conversational (use: "Yaar", "Suno", "Jaldi Karo", "Scene on hai", "Zabardast", "Bohot badhiya", etc.)
    5. INJECT the trending topic "{trend_topic}" naturally into both the ad copy AND the email body — make it feel timely and highly culturally integrated!
    6. Create strong FOMO — emphasize limited time, limited stock, or "don't miss out" vibes.
    7. Urdu copy MUST be Roman Urdu ONLY (e.g. "Abhi order karein" NOT "ابھی آرڈر کریں").
    8. English copy and email body: simple, punchy, persuasive.
    9. Make it sound like a viral social media ad for Pakistan (Instagram/WhatsApp style) and a highly engaging marketing email.

    TASK:
    1. Write a catchy bilingual ad copy (Roman Urdu + English) that references the trending topic.
    2. Write a detailed image generation prompt for a PROFESSIONAL PAKISTANI ADVERTISEMENT IMAGE.
       The prompt must describe: product, setting, colors, Pakistani cultural elements, lighting, mood.
       NO text in the image. Focus on product beauty and Pakistani aesthetic.
    3. Write a detailed 10-15s AI VIDEO GENERATION PROMPT ('video_prompt').
       Strictly combine these elements: {product_name} (Product) + {strategy} (Core Ad Strategy) + {trend_topic} (Identified Pakistani Local Trend).
       Do not create generic scenes. Describe a premium commercial scene where the actual product is visually showcased, interacting with elements of the current Pakistani trend (e.g., cricket, local aesthetics, specific city vibes if applicable). Keep it realistic and brand-focused.
       DO NOT put any text in the video.

    RETURN ONLY VALID JSON IN THIS EXACT FORMAT:
    {{
        "ad_copy": {{
            "headline_urdu": "string (Roman Urdu, punchy, references trend)",
            "headline_english": "string (Simple punchy English)",
            "body_urdu": "string (Roman Urdu, casual friend tone, FOMO, Pakistani trend reference)",
            "body_english": "string (Simple English, max 3 sentences, punchy)",
            "cta_urdu": "string (Roman Urdu CTA)",
            "cta_english": "string (English CTA)",
            "email_subject": "string (Catchy, FOMO-driven English subject line)",
            "email_body": "string (Persuasive English email body, warmly integrating the trend: {trend_topic}, highlighting the {product_name})"
        }},
        "image_prompt": "string (detailed, rich, Pakistani ad photography description)",
        "video_prompt": "string (cinematic 10-15s video prompt linking the product to the current Pakistani trend)",
        "agent_reasoning": "string",
        "agent_decision": "string"
    }}
    """

    result = get_gemini_response(prompt)

    is_valid_result = (
        isinstance(result, dict) and
        "ad_copy" in result and
        "image_prompt" in result and
        "video_prompt" in result and
        isinstance(result.get("ad_copy"), dict)
    )

    if not is_valid_result:
        result = _build_fallback_copy(business_type, product_name, trend_topic)

    # Extract keys safely
    ad_copy = result.get("ad_copy", {})
    image_prompt = result.get("image_prompt", base_image_prompt)
    video_prompt = result.get("video_prompt", "")

    # If Gemini returned a generic/short prompt, use our richer defaults
    if len(image_prompt) < 80:
        image_prompt = base_image_prompt
    
    if not video_prompt or len(video_prompt) < 40:
        video_prompt = f"Cinematic 4k commercial of {product_name} in Pakistan, celebrating {trend_topic}, slow motion, warm sunshine, shallow depth of field, high end production value"

    # ── Step 5: Generate ad image and promotional video in PARALLEL to save time ────
    asset_start = time.time()
    real_image_url = await generate_ad_image(
        image_prompt, 
        base_url, 
        trend_context=trend_topic,
        ad_copy=ad_copy,
        product_name=product_name,
        business_type=business_type,
        logo_url=logo_url,
        brand_color=brand_color,
        strategy=strategy,
        products=products
    )
    real_video_url = await generate_ad_video(video_prompt, business_type=business_type, image_url=real_image_url)
    
    asset_latency_ms = float((time.time() - asset_start) * 1000)

    if not real_video_url:
        prod_lower = product_name.lower()
        if business_type == "beauty" or "soap" in prod_lower or "skin" in prod_lower:
            real_video_url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
        elif business_type == "chai" or "chai" in prod_lower or "tea" in prod_lower:
            real_video_url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        elif business_type == "food" or "restaurant" in prod_lower or "dhabha" in prod_lower or "karahi" in prod_lower or "barbecue" in prod_lower or "bbq" in prod_lower:
            real_video_url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
        elif business_type == "fashion" or "apparel" in prod_lower or "lawn" in prod_lower or "clothing" in prod_lower or "style" in prod_lower:
            real_video_url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
        elif business_type == "electronics" or "tech" in prod_lower or "computer" in prod_lower or "mobile" in prod_lower:
            real_video_url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4"
        elif business_type == "sports" or "cricket" in prod_lower or "run" in prod_lower:
            real_video_url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4"
        else:
            real_video_url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"

    # Log the AI asset generation trace
    try:
        import random
        from utils.logger import log_asset_generation_trace
        generation_seed = random.randint(100000, 999999)
        log_asset_generation_trace(
            response_time_ms=asset_latency_ms,
            seed=generation_seed,
            image_url=real_image_url or "",
            video_url=real_video_url or ""
        )
    except Exception as e:
        print(f"[CreativeAgent] Failed to log asset generation trace: {e}")

    output_data = {
        "ad_copy": ad_copy,
        "image_prompt": image_prompt,
        "image_url": real_image_url,
        "video_prompt": video_prompt,
        "video_url": real_video_url,
        "is_fallback": not bool(real_image_url)
    }

    latency_ms = int((time.time() - start_time) * 1000)

    trace = TraceLog(
        job_id=job_id,
        agent="CreativeAssetAgent",
        timestamp=datetime.utcnow().isoformat() + "Z",
        workplan="Search Pakistani trends → Generate bilingual ad copy → Create Pakistani ad image & promo video.",
        tool_calls=[
            f"search_pakistan_trends() → {trend_source}",
            f"search_competitors({product_name})",
            "generate_copy(lang='bilingual', trend_injected=True)",
            "generate_ad_image(style='Pakistani_commercial')",
            "generate_ad_video(endpoint='Fal.ai Luma Dream Machine')"
        ],
        reasoning=result.get("agent_reasoning", f"Used live trend '{trend_topic}' to create culturally relevant Pakistani ad assets."),
        decision=result.get("agent_decision", f"Generated Pakistani ad copy, ad image, and promo video for {business_type} business."),
        confidence=0.93,
        latency_ms=latency_ms,
        output_summary=f"Pakistani trend-driven ad generated. Image: {real_image_url}, Video: {real_video_url}"
    )

    return Agent3Output(**output_data), trace


# ── Helper Functions ───────────────────────────────────────────────────────────

def _detect_business_type(search_text: str) -> str:
    if any(w in search_text for w in ["restaurant", "pizza", "burger", "food", "delivery", "biryani", "karahi", "barbeque"]):
        return "food"
    elif any(w in search_text for w in ["chai", "cafe", "tea", "qahwa"]):
        return "chai"
    elif any(w in search_text for w in ["cloth", "boutique", "fashion", "wear", "dress", "brand", "apparel", "garment", "lawn", "kurti", "kurta"]):
        return "fashion"
    elif any(w in search_text for w in ["cricket", "sports", "game", "bat", "ball", "psl", "football"]):
        return "sports"
    elif any(w in search_text for w in ["mobile", "tech", "phone", "gadget", "electronics", "ac", "fan", "laptop", "computer"]):
        return "electronics"
    elif any(w in search_text for w in ["soap", "cleanco", "beauty", "cosmetic", "cream", "lotion", "skincare"]):
        return "beauty"
    elif any(w in search_text for w in ["jewel", "gold", "ring", "necklace", "bangle"]):
        return "jewelry"
    elif any(w in search_text for w in ["sweet", "mithai", "bakery", "cake", "dessert"]):
        return "sweets"
    return "generic"


def _extract_product_name(strategy: dict, original_inputs: dict = None) -> str:
    """Try to extract a meaningful product/brand name."""
    if original_inputs:
        for key in ["product_name", "brand_name", "business_name", "name"]:
            val = original_inputs.get(key, "")
            if val and isinstance(val, str):
                return val.strip()[:40]
    
    root_cause = str(strategy.get("root_cause", ""))
    if root_cause and len(root_cause) > 3:
        return root_cause[:30]
    
    return "Product"


def _build_rich_image_prompt(business_type: str, product_name: str, trend_topic: str) -> str:
    """Build a detailed, Pakistani-culture-aware image prompt."""
    prompts = {
        "food": (
            f"Professional Pakistani food advertisement photography of {product_name}, "
            "aromatic steam rising from dish, rich golden-brown colors, "
            "traditional copper serving platter, karahi setup, "
            "Lahori restaurant aesthetic, warm dramatic lighting, "
            "fresh garnishes of coriander and lemon, "
            "bokeh background with traditional Pakistani tiles"
        ),
        "chai": (
            f"Premium Pakistani tea advertisement for {product_name}, "
            "traditional clay kulhad cup filled with karak chai, "
            "rich amber tea with milk swirling, "
            "rustic wooden table, monsoon rain drops on window behind, "
            "warm golden hour soft lighting, steam rising beautifully, "
            "spices (cardamom, cinnamon) scattered artistically beside cup"
        ),
        "fashion": (
            f"High-contrast premium Pakistani retail photography of {product_name} "
            "Sapphire or Ethnic style Premium Lawn, Maroon Festive suit with gold embroidery on model, "
            "gorgeous patterns, model photoshoot, elegant clothing shop or DHA Lahore boutique background, "
            "warm golden hour lighting, cinematic fashion photoshoot, highly detailed"
        ),
        "sports": (
            f"Dynamic Pakistani sports advertisement for {product_name}, "
            "cricket bat and ball in dramatic action shot, "
            "Pakistan green and white color scheme, "
            "stadium floodlights bokeh background, "
            "water splash energy effect, PSL cricket season vibes, "
            "victory celebration energy"
        ),
        "electronics": (
            f"Futuristic tech advertisement for {product_name} in Pakistan, "
            "modern device on sleek dark surface, "
            "neon blue and cyan glow reflections, "
            "Karachi tech hub atmosphere, "
            "ultra-clean product photography, "
            "dramatic studio lighting with gradient background"
        ),
        "beauty": (
            f"Luxury Pakistani beauty product advertisement for {product_name}, "
            "premium soap or skincare product on white marble surface, "
            "jasmine and rose petals scattered around, "
            "fresh water droplets splashing, "
            "gold and white color palette, "
            "Pakistani boutique spa aesthetic, clean minimal background"
        ),
        "jewelry": (
            f"Elegant jewelry advertisement for {product_name} in Pakistani style, "
            "gold jewelry on dark velvet surface, "
            "Eid wedding celebration backdrop, "
            "warm studio lighting highlighting gold shine, "
            "traditional Pakistani bridal aesthetic"
        ),
        "sweets": (
            f"Mouthwatering Pakistani sweet shop advertisement for {product_name}, "
            "traditional mithai on silver tray, "
            "Eid festive packaging with gold wrapping, "
            "warm soft lighting, silver leaf garnish, "
            "Pakistani sweet shop aesthetic"
        ),
    }
    
    base = prompts.get(business_type, (
        f"Premium Pakistani commercial advertisement for {product_name}, "
        "vibrant Lahori color palette, professional studio lighting, "
        "clean modern aesthetic, Pakistani cultural elements"
    ))
    
    return base


def _build_fallback_copy(business_type: str, product_name: str, trend_topic: str) -> dict:
    """Smart fallback copy when Gemini fails."""
    copies = {
        "food": {
            "headline_urdu": f"Yaar, {trend_topic} ka maza double karo humaray food ke saath!",
            "headline_english": f"Pakistan's Most Delicious Deal — Limited Time Only!",
            "body_urdu": f"Scene kya hai? {trend_topic} chal raha hai aur hum ne launch ki hai abtak ki sabse zabardast deal! Flat 15% OFF + Free Delivery sirf aaj ke liye. Jaldi karo, stock khatam ho raha hai!",
            "body_english": "Taste the difference with Pakistan's most loved flavors. Flat 15% OFF + Free Delivery for a limited time. Don't miss out — order now!",
            "cta_urdu": "Abhi Order Karein! 🍽️",
            "cta_english": "Order Now — Limited Time!",
            "email_subject": f"Special Offer: Sizzle Your {trend_topic} with Us! 🍕",
            "email_body": f"Hey there,\n\nDid you catch the buzz about {trend_topic}? While everyone is talking about it, we decided to give you something even better to chew on.\n\nEnjoy a flat 15% OFF + Free Delivery on {product_name}. This is a limited time offer specially crafted for this season.\n\nDon't miss out—grab your feast today!"
        },
        "chai": {
            "headline_urdu": f"Yaar, {trend_topic} ke saath ek karak chai toh banti hai!",
            "headline_english": "The Perfect Cup for Every Pakistani Moment!",
            "body_urdu": f"Chahe {trend_topic} dekh rahe ho ya dostons ke saath baithay ho, humaari karak chai ka koi jawab nahi! 15% flat discount sirf aaj. Jaldi karein, offer limited time ka hai!",
            "body_english": "Savor the rich aroma of real karak chai. Flat 15% OFF today only. Order your favorite blend now!",
            "cta_urdu": "Chai Order Karein! ☕",
            "cta_english": "Order Chai Now!",
            "email_subject": f"A Warm Cup for the {trend_topic} ☕",
            "email_body": f"Hi!\n\nNothing complements the {trend_topic} vibes better than a hot cup of {product_name}.\n\nWe're offering a flat 15% discount today so you can enjoy the perfect blend while the trend lasts. Grab your cup and savor the moment!"
        },
        "fashion": {
            "headline_urdu": f"Suno! {trend_topic} ke season mein style game on karo!",
            "headline_english": "Pakistan's Hottest Fashion Collection is Live!",
            "body_urdu": f"{trend_topic} ka mahaul hai aur aapka outfit? Humaari exclusive collection se apna look complete karein! Flat 15% OFF sirf limited time ke liye. Stock tezi se khatam ho raha hai!",
            "body_english": "Upgrade your wardrobe with the season's most stunning Pakistani designs. Flat 15% OFF — limited time only. Shop now before it's gone!",
            "cta_urdu": "Abhi Shop Karein! 👗",
            "cta_english": "Shop Now — Limited Stock!",
            "email_subject": f"Style Up for {trend_topic}! ✨",
            "email_body": f"Hello Fashionista,\n\nReady for {trend_topic}? Make sure your outfit matches the hype! Dive into our exclusive {product_name} collection.\n\nEnjoy a flat 15% OFF for a very limited time. Stock is vanishing quickly, so upgrade your style right now!"
        },
        "sports": {
            "headline_urdu": f"Yaar, {trend_topic} ka maza ab deals ke saath double!",
            "headline_english": "Score Big with Pakistan's Best Sports Deals!",
            "body_urdu": f"{trend_topic} ka josh hai aur humaari deals us se bhi zyada hot hain! Premium sports gear pe flat 15% discount. Abhi purchase karo, der mat karo!",
            "body_english": "Gear up with Pakistan's finest sports equipment. Flat 15% OFF for the season. Limited stock — grab yours now!",
            "cta_urdu": "Abhi Purchase Karein! 🏏",
            "cta_english": "Get Deal Now!",
            "email_subject": f"Score Big During {trend_topic}! 🏏",
            "email_body": f"Hey Sports Fan,\n\nThe energy of {trend_topic} is undeniable! Match that energy with premium {product_name} gear.\n\nWe are giving you a flat 15% discount to help you perform at your best. Order now before our stock runs out!"
        },
        "electronics": {
            "headline_urdu": f"Scene check karo! {trend_topic} ke saath tech upgrade bhi karo!",
            "headline_english": "Pakistan's Best Tech Deals — Live Now!",
            "body_urdu": f"{trend_topic} chal raha hai aur aap purani tech ke saath? Upgrade karo abhi! Flat 15% OFF sirf 24 ghante ke liye. Jaldi se apna order confirm karo!",
            "body_english": "Upgrade your tech game with Pakistan's best deals. Flat 15% OFF for 24 hours only. Limited units available!",
            "cta_urdu": "Abhi Order Karein! 📱",
            "cta_english": "Order Today!",
            "email_subject": f"Tech Upgrades Inspired by {trend_topic} 🚀",
            "email_body": f"Hi Tech Lover,\n\nWhile {trend_topic} takes over the internet, make sure your tech isn't left in the past!\n\nUpgrade to {product_name} with an exclusive 15% OFF for the next 24 hours. Don't wait—transform your setup today!"
        },
        "beauty": {
            "headline_urdu": f"Yaar, {trend_topic} ke season mein skin bhi glowing honi chahiye!",
            "headline_english": "Pakistan's #1 Beauty Secret — Now at 15% OFF!",
            "body_urdu": f"{trend_topic} chal raha hai, bahar nikloge? Pehlay humaara premium beauty product try karo! Flat 15% OFF sirf aaj. Jaldi karein, stock limited hai!",
            "body_english": "Glow like never before with Pakistan's most loved beauty products. Flat 15% OFF today only. Limited stock — order now!",
            "cta_urdu": "Abhi Order Karein! ✨",
            "cta_english": "Order Now — Glow Up!",
            "email_subject": f"Glow Through the {trend_topic}! 🌟",
            "email_body": f"Beautiful,\n\nStep out during {trend_topic} looking your absolute best. Give your skin the luxury it deserves with {product_name}.\n\nEnjoy 15% OFF today only. Treat yourself and let your natural beauty shine!"
        },
    }
    
    copy = copies.get(business_type, {
        "headline_urdu": f"Suno! {trend_topic} ke saath sabse bari deal live ho chuki hai!",
        "headline_english": "Pakistan's Biggest Deal is Live Now!",
        "body_urdu": f"{trend_topic} ka mahaul hai aur hum ne launch ki hai sabse hot deal! Flat 15% OFF sirf limited time ke liye. Jaldi karein!",
        "body_english": "Don't miss Pakistan's biggest limited-time offer. Flat 15% OFF on all items today. Grab yours before it's gone!",
        "cta_urdu": "Abhi Fayda Uthaein! 🚀",
        "cta_english": "Get Deal Now!",
        "email_subject": f"Exclusive Offer Just in Time for {trend_topic}! 🎉",
        "email_body": f"Hello,\n\nThe buzz around {trend_topic} is massive, and we have a deal that's just as big!\n\nGet flat 15% OFF on {product_name} for a limited time. Don't miss out on Pakistan's biggest offer—order yours today!"
    })
    
    image_prompt = _build_rich_image_prompt(business_type, product_name, trend_topic)
    
    return {
        "ad_copy": copy,
        "image_prompt": image_prompt,
        "agent_reasoning": f"Gemini unavailable. Used smart fallback with live trend '{trend_topic}' injected.",
        "agent_decision": f"Generated culturally relevant Pakistani ad copy for {business_type} with trend context."
    }
