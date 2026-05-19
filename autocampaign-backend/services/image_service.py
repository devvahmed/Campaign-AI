import httpx
import os
import base64
import uuid
from pathlib import Path

OUTPUT_DIR = Path("generated_images")
OUTPUT_DIR.mkdir(exist_ok=True)

SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = os.getenv("SERVER_PORT", "8000")


def _get_fal_key() -> str:
    return os.getenv("FAL_API_KEY", "")


def _get_gemini_key() -> str:
    return os.getenv("GEMINI_API_KEY", "")


def _get_base_url() -> str:
    public = os.getenv("SERVER_PUBLIC_URL", "")
    if public:
        return public.rstrip("/")
    return f"http://{SERVER_HOST}:{SERVER_PORT}"


def _get_product_theme(prompt: str, trend: str = "") -> dict:
    """Detect product type and return visual theme for the ad image."""
    p = (prompt + " " + trend).lower()

    if any(w in p for w in ["chai", "tea", "karak", "qahwa", "dhaba", "cup", "kulhad"]):
        return {
            "bg": (146, 64, 14), "bg2": (69, 26, 3), "accent": (252, 211, 77),
            "icon": "CHAI", "product": "Karak Chai",
            "tagline": "Har Ghoont Mein Sukoon", "urdu_tag": "Pakistan Ka Favorite",
        }
    elif any(w in p for w in ["food", "pizza", "burger", "biryani", "restaurant", "karahi", "tikka", "bbq", "kabab"]):
        return {
            "bg": (220, 38, 38), "bg2": (127, 29, 29), "accent": (252, 165, 165),
            "icon": "FOOD", "product": "Delicious Food",
            "tagline": "Zabardast Taste, Zabardast Deal", "urdu_tag": "Pakistan Ka #1 Taste",
        }
    elif any(w in p for w in ["cricket", "psl", "sports", "bat", "ball", "stadium"]):
        return {
            "bg": (21, 128, 61), "bg2": (20, 83, 45), "accent": (134, 239, 172),
            "icon": "SPORTS", "product": "Sports Gear",
            "tagline": "Pakistan Zindabad!", "urdu_tag": "PSL Season Deal",
        }
    elif any(w in p for w in ["fashion", "cloth", "dress", "wear", "apparel", "lawn", "kurta", "kurti", "boutique"]):
        return {
            "bg": (126, 34, 206), "bg2": (59, 7, 100), "accent": (233, 213, 255),
            "icon": "FASHION", "product": "Fashion Collection",
            "tagline": "Style Ka Naya Andaz", "urdu_tag": "Eid Collection 2025",
        }
    elif any(w in p for w in ["tech", "phone", "mobile", "gadget", "laptop", "electronics", "fan", "solar", "battery", "ac"]):
        return {
            "bg": (30, 58, 138), "bg2": (23, 37, 84), "accent": (147, 197, 253),
            "icon": "TECH", "product": "Solar Fan & Tech",
            "tagline": "Sasti Bijli, Thandi Hawa", "urdu_tag": "Karachi Summer Deal",
        }
    elif any(w in p for w in ["soap", "beauty", "skin", "cream", "lotion", "shampoo", "skincare", "cosmetic"]):
        return {
            "bg": (13, 148, 136), "bg2": (6, 78, 59), "accent": (167, 243, 208),
            "icon": "SOAP", "product": "Premium Skincare",
            "tagline": "Feel Fresh, Feel Confident", "urdu_tag": "Garmi Mein Freshness",
        }
    else:
        return {
            "bg": (30, 27, 75), "bg2": (15, 10, 46), "accent": (129, 140, 248),
            "icon": "BRAND", "product": "Premium Product",
            "tagline": "Pakistan Ka Number 1", "urdu_tag": "Exclusive Deal",
        }


def _generate_pillow_ad_image(prompt: str, ad_copy: dict = None, trend: str = "", product_name: str = "Product") -> str:
    """
    Generate a beautiful Pakistani advertisement image using Pillow.
    Creates a proper PNG that React Native can load perfectly.
    """
    try:
        from PIL import Image, ImageDraw, ImageFont
        import math

        theme = _get_product_theme(prompt, trend)
        W, H = 1024, 1024

        import urllib.request
        from io import BytesIO

        # Map categories to premium high-resolution stock photos
        category_photos = {
            "chai": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=1024&q=80",
            "food": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1024&q=80",
            "sports": "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1024&q=80",
            "fashion": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1024&q=80",
            "tech": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1024&q=80",
            "soap": "https://images.unsplash.com/photo-1608248597481-496100c80836?w=1024&q=80"
        }

        # Detect the category string from theme
        cat_key = theme.get("icon", "BRAND").lower()
        bg_url = category_photos.get(cat_key, "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1024&q=80")

        # Try to download the premium photo as base canvas
        img = None
        try:
            req = urllib.request.Request(
                bg_url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            with urllib.request.urlopen(req, timeout=3.0) as response:
                img_data = response.read()
                img = Image.open(BytesIO(img_data)).convert("RGB").resize((W, H))
                print(f"[ImageService] Premium stock background loaded successfully for category: {cat_key}")
        except Exception as e:
            print(f"[ImageService] Failed to load premium stock photo background, falling back to gradient: {e}")

        # If download failed, draw our beautiful default gradient
        if not img:
            img = Image.new("RGB", (W, H), theme["bg"])
            draw = ImageDraw.Draw(img)
            bg_r, bg_g, bg_b = theme["bg"]
            bg2_r, bg2_g, bg2_b = theme["bg2"]
            for y in range(H):
                ratio = y / H
                r = int(bg_r + (bg2_r - bg_r) * ratio)
                g = int(bg_g + (bg2_g - bg_g) * ratio)
                b = int(bg_b + (bg2_b - bg_b) * ratio)
                draw.line([(0, y), (W, y)], fill=(r, g, b))
        else:
            # Apply a professional translucent deep overlay (tint)
            overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            overlay_draw = ImageDraw.Draw(overlay)
            overlay_draw.rectangle([0, 0, W, H], fill=(15, 15, 25, 130))  # Rich translucent dark tint
            img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

        draw = ImageDraw.Draw(img)
        ac = theme["accent"]  # accent color tuple

        # Draw decorative circles in background
        for radius, opacity in [(450, 25), (380, 15), (300, 10)]:
            circle_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            circle_draw = ImageDraw.Draw(circle_img)
            cx, cy = W // 2, H // 2
            circle_draw.ellipse(
                [cx - radius, cy - radius, cx + radius, cy + radius],
                outline=(*ac, opacity), width=2
            )
            img = Image.alpha_composite(img.convert("RGBA"), circle_img).convert("RGB")
            draw = ImageDraw.Draw(img)

        # Top banner
        banner_h = 70
        draw.rounded_rectangle([60, 30, W - 60, 30 + banner_h], radius=35, 
                                fill=(*ac, 40) if len(ac) == 3 else (*ac,))
        draw.rounded_rectangle([60, 30, W - 60, 30 + banner_h], radius=35, 
                                outline=ac, width=2)

        # Try to load a font, fall back to default
        try:
            # Try common font paths on Windows
            font_paths = [
                "C:/Windows/Fonts/arialbd.ttf",
                "C:/Windows/Fonts/arial.ttf",
                "C:/Windows/Fonts/calibrib.ttf",
            ]
            font_banner = None
            font_headline = None
            font_body = None
            font_cta = None
            font_badge = None
            font_emoji = None

            for fp in font_paths:
                if os.path.exists(fp):
                    font_banner = ImageFont.truetype(fp, 22)
                    font_headline = ImageFont.truetype(fp, 52)
                    font_body = ImageFont.truetype(fp, 28)
                    font_cta = ImageFont.truetype(fp, 32)
                    font_badge = ImageFont.truetype(fp, 72)
                    font_small = ImageFont.truetype(fp, 20)
                    break

            if not font_banner:
                raise Exception("No font found")

        except Exception:
            font_banner = ImageFont.load_default()
            font_headline = ImageFont.load_default()
            font_body = ImageFont.load_default()
            font_cta = ImageFont.load_default()
            font_badge = ImageFont.load_default()
            font_small = ImageFont.load_default()

        # Banner text (ASCII only for Windows compatibility)
        banner_text = "INSIGHTFLOW AI  x  PAKISTAN"
        bbox = draw.textbbox((0, 0), banner_text, font=font_banner)
        tw = bbox[2] - bbox[0]
        draw.text(((W - tw) // 2, 47), banner_text, fill=ac, font=font_banner)

        # Urdu tag below banner
        urdu_tag = theme["urdu_tag"]
        bbox2 = draw.textbbox((0, 0), urdu_tag, font=font_small)
        tw2 = bbox2[2] - bbox2[0]

        # Product icon label (ASCII safe)
        icon_text = theme.get("icon", "AD")
        try:
            icon_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 120)
        except Exception:
            icon_font = font_headline
        # Draw icon circle background
        draw.ellipse([W//2-100, 155, W//2+100, 355], fill=(*ac, 80) if False else tuple(int(c*0.4) for c in ac))
        draw.ellipse([W//2-100, 155, W//2+100, 355], outline=ac, width=3)
        icon_bbox = draw.textbbox((0, 0), icon_text, font=icon_font)
        iw, ih = icon_bbox[2]-icon_bbox[0], icon_bbox[3]-icon_bbox[1]
        draw.text((W//2 - iw//2, 255 - ih//2), icon_text, fill="white", font=icon_font)

        # Product name
        product_text = product_name.upper()
        bbox3 = draw.textbbox((0, 0), product_text, font=font_headline)
        tw3 = bbox3[2] - bbox3[0]
        draw.text(((W - tw3) // 2, 410), product_text, fill="white", font=font_headline)

        # Tagline
        tagline = theme["tagline"]
        bbox4 = draw.textbbox((0, 0), tagline, font=font_body)
        tw4 = bbox4[2] - bbox4[0]
        draw.text(((W - tw4) // 2, 480), tagline, fill=ac, font=font_body)

        # Urdu tag pill with dynamic trend hook
        trend_text = f"TREND: {trend[:30].upper()}" if trend else theme["urdu_tag"]
        bbox2 = draw.textbbox((0, 0), trend_text, font=font_small)
        tw2 = bbox2[2] - bbox2[0]

        pill_w, pill_h = tw2 + 40, 36
        pill_x = (W - pill_w) // 2
        draw.rounded_rectangle([pill_x, 530, pill_x + pill_w, 530 + pill_h], radius=18, fill=(*ac, 40))
        draw.text((pill_x + 20, 535), trend_text, fill=ac, font=font_small)

        # Discount badge circle
        badge_cx, badge_cy, badge_r = W // 2, 690, 110
        draw.ellipse([badge_cx - badge_r, badge_cy - badge_r, badge_cx + badge_r, badge_cy + badge_r], fill=ac)
        draw.text((badge_cx - 55, badge_cy - 55), "15%", fill=theme["bg2"], font=font_badge)
        try:
            font_off = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 28)
        except Exception:
            font_off = font_body
        off_bbox = draw.textbbox((0, 0), "OFF", font=font_off)
        draw.text((badge_cx - (off_bbox[2] - off_bbox[0]) // 2, badge_cy + 48), "OFF", fill=theme["bg2"], font=font_off)

        # CTA Button
        cta_text = "ABHI ORDER KAREIN!"
        if ad_copy and ad_copy.get("cta_urdu"):
            raw = ad_copy["cta_urdu"]
            # Strip non-ASCII for Windows console safety in Pillow rendering
            cta_text = raw.encode("ascii", errors="ignore").decode("ascii").strip() or "ABHI ORDER KAREIN!"

        cta_bbox = draw.textbbox((0, 0), cta_text, font=font_cta)
        cta_w = cta_bbox[2] - cta_bbox[0]
        cta_pad_h, cta_pad_v = 40, 18
        cta_x = (W - cta_w - cta_pad_h * 2) // 2
        cta_y = 840
        draw.rounded_rectangle(
            [cta_x, cta_y, cta_x + cta_w + cta_pad_h * 2, cta_y + 60 + cta_pad_v],
            radius=36, fill=ac
        )
        draw.text((cta_x + cta_pad_h, cta_y + cta_pad_v // 2 + 2), cta_text, fill=theme["bg2"], font=font_cta)

        # Bottom bar
        draw.rectangle([0, 950, W, H], fill=theme["bg2"])
        try:
            font_bottom = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 18)
        except Exception:
            font_bottom = font_small
        stars = "***** Pakistan's #1 Trusted Brand | InsightFlow AI"
        stars_bbox = draw.textbbox((0, 0), stars, font=font_bottom)
        sw = stars_bbox[2] - stars_bbox[0]
        draw.text(((W - sw) // 2, 968), stars, fill=ac, font=font_bottom)

        # Save
        filename = f"ad_{uuid.uuid4().hex[:8]}.png"
        filepath = OUTPUT_DIR / filename
        img.save(str(filepath), "PNG", quality=95)
        return filename

    except Exception as e:
        print(f"[ImageService] Pillow ad generation error: {e}")
        import traceback
        traceback.print_exc()
        return None


def _enhance_prompt_for_pakistan(prompt: str, trend_context: str = "") -> str:
    """Make the image prompt highly culturally relevant for Pakistani advertising."""
    base = prompt.strip().rstrip(".")
    p = base.lower()

    if any(w in p for w in ["soap", "beauty", "skin", "clean", "fresh"]):
        style = "Pakistani skincare advertisement, luxurious white and gold, jasmine flowers, fresh water splashes, Karachi studio setup"
    elif any(w in p for w in ["chai", "tea", "karak"]):
        style = "authentic Pakistani chai advertisement, desi clay kulhad cup, monsoon rainy window, warm amber lighting, street chai dhaba"
    elif any(w in p for w in ["food", "pizza", "burger", "biryani"]):
        style = "Pakistani food advertisement, aromatic steam rising, traditional copper serving dish, vibrant spices, Lahori street food"
    elif any(w in p for w in ["cricket", "psl", "sports"]):
        style = "Pakistan cricket advertisement, green and white colors, stadium floodlights, PSL cricket season energy"
    elif any(w in p for w in ["fashion", "cloth", "dress"]):
        style = "Pakistani lawn collection advertisement, Eid vibes, vibrant embroidery, DHA Lahore boutique, golden hour lighting"
    elif any(w in p for w in ["tech", "phone", "mobile"]):
        style = "modern Pakistani tech advertisement, futuristic neon glow, Karachi tech hub, clean dark gradient background"
    else:
        style = "premium Pakistani commercial advertisement, vibrant Lahori color palette, professional studio lighting, Pakistani cultural elements"

    trend_line = f"inspired by Pakistani trend: {trend_context[:80]}, " if trend_context else ""

    return (
        f"{base}, {style}, {trend_line}"
        "high-resolution 4K commercial ad photo, no text overlays, no watermarks, "
        "vibrant saturated colors, sharp product focus, professional commercial photography"
    )


async def generate_ad_image(imagen_prompt: str, base_url: str = None, trend_context: str = "", ad_copy: dict = None, product_name: str = "Product") -> str:
    """
    Real image generate karo.
    Try order: Stability AI -> Pillow PNG Ad (guaranteed to work)
    Returns FULL URL for React Native.
    """
    enhanced_prompt = _enhance_prompt_for_pakistan(imagen_prompt, trend_context)
    print("[ImageService] Enhanced prompt ready, starting generation...")

    fal_key = _get_fal_key()

    # 1) Try Fal.ai (fast-sdxl) to get a public cloud URL
    if fal_key:
        try:
            url = await _fal_generate_image(enhanced_prompt, fal_key)
            if url:
                print("[ImageService] SUCCESS: Fal.ai image generated and hosted at:", url)
                return url
        except Exception as e:
            print(f"[ImageService] Fal.ai generation failed: {e}")

    # 2) Generate Pillow-based Pakistani ad PNG (always works, React Native compatible)
    print("[ImageService] Generating Pillow-based Pakistani ad image...")
    filename = _generate_pillow_ad_image(imagen_prompt, ad_copy=ad_copy, trend=trend_context, product_name=product_name)
    if filename:
        if not base_url:
            base_url = _get_base_url()
        url = f"{base_url}/generated_images/{filename}"
        print(f"[ImageService] SUCCESS: Pillow ad PNG saved: {filename}")
        return url

    # 3) Absolute last resort
    fallback = _smart_placeholder(imagen_prompt)
    print("[ImageService] WARNING: Using placeholder URL.")
    return fallback



async def _fal_generate_image(prompt: str, api_key: str) -> str:
    """Fal.ai Fast SDXL image generation (returns public cloud URL)"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://queue.fal.run/fal-ai/fast-sdxl",
            headers={
                "Authorization": f"Key {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "prompt": prompt,
                "image_size": "square_hd",
                "num_inference_steps": 25,
                "num_images": 1
            }
        )
        
        if response.status_code != 200:
            print(f"[ImageService] Fal.ai HTTP {response.status_code}: {response.text[:200]}")
            return None
            
        submit_data = response.json()
        status_url = submit_data.get("status_url")
        
        if not status_url:
            # If it's a sync response
            images = submit_data.get("images", [])
            if images and "url" in images[0]:
                return images[0]["url"]
            return None
            
        import asyncio
        max_attempts = 20
        for attempt in range(max_attempts):
            await asyncio.sleep(2)
            status_response = await client.get(status_url, headers={"Authorization": f"Key {api_key}"})
            if status_response.status_code == 200:
                status_data = status_response.json()
                if status_data.get("status") == "COMPLETED":
                    images = status_data.get("images", [])
                    if images and "url" in images[0]:
                        return images[0]["url"]
                elif status_data.get("status") == "FAILED":
                    print(f"[ImageService] Fal.ai Failed: {status_data}")
                    return None
                    
        return None


def _save_image(image_b64: str, base_url: str = None) -> str:
    """Save base64 image and return full URL"""
    filename = f"ad_{uuid.uuid4().hex[:8]}.png"
    filepath = OUTPUT_DIR / filename
    with open(filepath, "wb") as f:
        f.write(base64.b64decode(image_b64))

    if not base_url:
        base_url = _get_base_url()
    return f"{base_url}/generated_images/{filename}"


def _smart_placeholder(prompt: str) -> str:
    """Final fallback — placehold.co URL"""
    if not prompt:
        return "https://placehold.co/1024x1024/1e1b4b/white.png?text=InsightFlow+AI+Ad"
    p = prompt.lower()
    if "cricket" in p or "psl" in p:
        return "https://placehold.co/1024x1024/15803d/white.png?text=Cricket+Campaign"
    elif "soap" in p or "beauty" in p:
        return "https://placehold.co/1024x1024/0d9488/white.png?text=Beauty+Ad"
    elif "food" in p or "pizza" in p:
        return "https://placehold.co/1024x1024/dc2626/white.png?text=Food+Ad"
    elif "chai" in p or "tea" in p:
        return "https://placehold.co/1024x1024/92400e/white.png?text=Chai+Ad"
    else:
        return "https://placehold.co/1024x1024/1e1b4b/white.png?text=InsightFlow+AI"
