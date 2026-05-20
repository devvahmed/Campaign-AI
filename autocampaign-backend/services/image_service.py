import httpx
import os
import base64
import uuid
from pathlib import Path

OUTPUT_DIR = Path("generated_images")
OUTPUT_DIR.mkdir(exist_ok=True)

import socket

SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = os.getenv("SERVER_PORT", "8000")


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def _get_fal_key() -> str:
    return os.getenv("FAL_API_KEY", "")


def _get_gemini_key() -> str:
    return os.getenv("GEMINI_API_KEY", "")


def _get_base_url() -> str:
    return os.getenv("SERVER_PUBLIC_URL", "http://localhost:8000").rstrip("/")


def _get_product_theme(prompt: str, trend: str = "", business_type: str = "generic") -> dict:
    """Detect product type and return visual theme for the ad image."""
    b_type = business_type.lower() if business_type else "generic"

    if b_type == "chai":
        return {
            "bg": (146, 64, 14), "bg2": (69, 26, 3), "accent": (252, 211, 77),
            "icon": "CHAI", "product": "Karak Chai",
            "tagline": "Har Ghoont Mein Sukoon", "urdu_tag": "Pakistan Ka Favorite",
        }
    elif b_type == "food":
        return {
            "bg": (194, 59, 34), "bg2": (127, 29, 29), "accent": (252, 211, 77),
            "icon": "FOOD", "product": "Delicious Food",
            "tagline": "Zabardast Taste, Zabardast Deal", "urdu_tag": "Pakistan Ka #1 Taste",
        }
    elif b_type == "sports":
        return {
            "bg": (21, 128, 61), "bg2": (20, 83, 45), "accent": (134, 239, 172),
            "icon": "SPORTS", "product": "Sports Gear",
            "tagline": "Pakistan Zindabad!", "urdu_tag": "PSL Season Deal",
        }
    elif b_type == "fashion":
        return {
            "bg": (107, 39, 55), "bg2": (69, 10, 20), "accent": (212, 175, 55),
            "icon": "FASHION", "product": "Fashion Collection",
            "tagline": "Style Ka Naya Andaz", "urdu_tag": "Eid Collection 2025",
        }
    elif b_type == "electronics":
        return {
            "bg": (30, 58, 138), "bg2": (23, 37, 84), "accent": (147, 197, 253),
            "icon": "TECH", "product": "Solar Fan & Tech",
            "tagline": "Sasti Bijli, Thandi Hawa", "urdu_tag": "Karachi Summer Deal",
        }
    elif b_type == "beauty":
        return {
            "bg": (13, 148, 136), "bg2": (6, 78, 59), "accent": (167, 243, 208),
            "icon": "SOAP", "product": "Premium Skincare",
            "tagline": "Feel Fresh, Feel Confident", "urdu_tag": "Garmi Mein Freshness",
        }
    elif b_type == "jewelry":
        return {
            "bg": (181, 148, 16), "bg2": (90, 70, 5), "accent": (254, 240, 138),
            "icon": "JEWELRY", "product": "Luxury Jewelry",
            "tagline": "Timeless & Exquisite", "urdu_tag": "Luxury Selection",
        }
    elif b_type == "sweets":
        return {
            "bg": (217, 119, 6), "bg2": (120, 53, 4), "accent": (253, 230, 138),
            "icon": "SWEETS", "product": "Mithai Delight",
            "tagline": "Celebration Sweets", "urdu_tag": "Eid Sweet Deals",
        }

    # Fallback to rule-based keyword search on prompt ONLY (exclude trend to avoid contamination)
    p = prompt.lower()

    if any(w in p for w in ["chai", "tea", "karak", "qahwa", "kulhad"]):
        return {
            "bg": (146, 64, 14), "bg2": (69, 26, 3), "accent": (252, 211, 77),
            "icon": "CHAI", "product": "Karak Chai",
            "tagline": "Har Ghoont Mein Sukoon", "urdu_tag": "Pakistan Ka Favorite",
        }
    elif any(w in p for w in ["food", "pizza", "burger", "biryani", "restaurant", "karahi", "tikka", "bbq", "kabab"]):
        return {
            "bg": (194, 59, 34), "bg2": (127, 29, 29), "accent": (252, 211, 77),
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
            "bg": (107, 39, 55), "bg2": (69, 10, 20), "accent": (212, 175, 55),
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
    elif any(w in p for w in ["jewel", "gold", "ring", "necklace", "bangle"]):
        return {
            "bg": (181, 148, 16), "bg2": (90, 70, 5), "accent": (254, 240, 138),
            "icon": "JEWELRY", "product": "Luxury Jewelry",
            "tagline": "Timeless & Exquisite", "urdu_tag": "Luxury Selection",
        }
    elif any(w in p for w in ["sweet", "mithai", "bakery", "cake", "dessert"]):
        return {
            "bg": (217, 119, 6), "bg2": (120, 53, 4), "accent": (253, 230, 138),
            "icon": "SWEETS", "product": "Mithai Delight",
            "tagline": "Celebration Sweets", "urdu_tag": "Eid Sweet Deals",
        }
    else:
        return {
            "bg": (30, 27, 75), "bg2": (15, 10, 46), "accent": (129, 140, 248),
            "icon": "BRAND", "product": "Premium Product",
            "tagline": "Pakistan Ka Number 1", "urdu_tag": "Exclusive Deal",
        }



def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    if not hex_str:
        return (30, 58, 138)  # default deep blue
    hex_str = hex_str.lstrip('#')
    try:
        if len(hex_str) == 3:
            hex_str = ''.join([c*2 for c in hex_str])
        return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))
    except Exception:
        return (30, 58, 138)

def draw_spaced_text(draw, text, y, font, fill, center_x, spacing=8):
    # Calculate total width with spacing
    total_w = 0
    char_widths = []
    for c in text:
        bbox = draw.textbbox((0, 0), c, font=font)
        w = bbox[2] - bbox[0]
        char_widths.append(w)
    total_w = sum(char_widths) + spacing * (len(text) - 1)
    
    # Start x
    start_x = center_x - total_w // 2
    curr_x = start_x
    for i, c in enumerate(text):
        draw.text((curr_x, y), c, fill=fill, font=font)
        curr_x += char_widths[i] + spacing

def wrap_text(draw, text, font, max_width):
    words = text.split()
    lines = []
    curr_line = []
    for w in words:
        curr_line.append(w)
        # check width
        bbox = draw.textbbox((0,0), " ".join(curr_line), font=font)
        w_width = bbox[2] - bbox[0]
        if w_width > max_width:
            curr_line.pop()
            lines.append(" ".join(curr_line))
            curr_line = [w]
    if curr_line:
        lines.append(" ".join(curr_line))
    return lines

def _generate_pillow_ad_image(prompt: str, ad_copy: dict = None, trend: str = "", product_name: str = "Product", custom_bg_url: str = None, business_type: str = "generic", logo_url: str = "", brand_color: str = "") -> str:
    """
    Generate a stunning, premium vertical split-screen Pakistani advertisement image using Pillow.
    Left: Beautiful photoshoot image cropped to fit (550x1024).
    Right: Solid brand/category background with luxury spaced serif typography.
    """
    try:
        from PIL import Image, ImageDraw, ImageFont
        import math
        import urllib.request
        from io import BytesIO

        theme = _get_product_theme(prompt, trend, business_type)
        W, H = 1024, 1024
        
        # Split screen setup
        split_x = 550
        right_w = W - split_x  # 474 pixels
        center_right_x = split_x + (right_w // 2)  # 787

        # 1) Parse Colors
        brand_rgb = hex_to_rgb(brand_color) if brand_color else theme["bg"]
        gold_color = (212, 175, 55)  # Premium metallic gold #D4AF37
        white_color = (255, 255, 255)

        # 2) Download Stock Image for Left Panel
        # Use the dynamically resolved custom_bg_url (from live Unsplash search) as the primary backdrop.
        # Falls back to a single high-res generic commercial photo if no custom URL was resolved.
        GENERIC_FALLBACK_BG = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1024&q=80"
        bg_url = custom_bg_url if custom_bg_url else GENERIC_FALLBACK_BG

        left_img = None
        try:
            print(f"[ImageService] Downloading backdrop for left panel: {bg_url}")
            req = urllib.request.Request(
                bg_url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            with urllib.request.urlopen(req, timeout=3.0) as response:
                img_data = response.read()
                downloaded = Image.open(BytesIO(img_data)).convert("RGB")
                
                # Aspect-ratio center-crop for left panel (550x1024)
                img_w, img_h = downloaded.size
                scale = max(split_x / img_w, H / img_h)
                new_w = int(img_w * scale)
                new_h = int(img_h * scale)
                resized_img = downloaded.resize((new_w, new_h), Image.Resampling.LANCZOS)
                
                crop_x = (new_w - split_x) // 2
                crop_y = (new_h - H) // 2
                left_img = resized_img.crop((crop_x, crop_y, crop_x + split_x, crop_y + H))
                print("[ImageService] Successfully cropped left panel backdrop.")
        except Exception as e:
            print(f"[ImageService] Left panel background load failed: {e}")

        # Create master canvas
        master = Image.new("RGB", (W, H), brand_rgb)
        draw = ImageDraw.Draw(master)

        # Paste left image if available
        if left_img:
            master.paste(left_img, (0, 0))
        else:
            # Draw gradient on left panel as backup
            bg_r, bg_g, bg_b = theme["bg"]
            bg2_r, bg2_g, bg2_b = theme["bg2"]
            for y in range(H):
                ratio = y / H
                r = int(bg_r + (bg2_r - bg_r) * ratio)
                g = int(bg_g + (bg2_g - bg_g) * ratio)
                b = int(bg_b + (bg2_b - bg_b) * ratio)
                draw.line([(0, y), (split_x, y)], fill=(r, g, b))
                
        # Draw gold vertical separator line (2px wide)
        draw.line([(split_x, 0), (split_x, H)], fill=gold_color, width=2)
        draw.line([(split_x + 1, 0), (split_x + 1, H)], fill=gold_color, width=1)

        # 3) Load Fonts
        try:
            font_paths = [
                "C:/Windows/Fonts/georgiab.ttf",
                "C:/Windows/Fonts/georgia.ttf",
                "C:/Windows/Fonts/timesbd.ttf",
                "C:/Windows/Fonts/times.ttf",
                "C:/Windows/Fonts/arialbd.ttf",
                "C:/Windows/Fonts/arial.ttf"
            ]
            font_serif_lg = None
            font_serif_md = None
            font_sans_xb = None
            font_sans_lg = None
            font_sans_md = None
            font_sans_sm = None

            # Serif (Georgia/Times) for elegant/luxury branding
            for fp in ["C:/Windows/Fonts/georgiab.ttf", "C:/Windows/Fonts/georgia.ttf", "C:/Windows/Fonts/timesbd.ttf", "C:/Windows/Fonts/times.ttf"]:
                if os.path.exists(fp):
                    font_serif_lg = ImageFont.truetype(fp, 38)
                    font_serif_md = ImageFont.truetype(fp, 26)
                    break
            
            # Sans (Arial) for clean typography/discounts
            for fp in ["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf"]:
                if os.path.exists(fp):
                    font_sans_xb = ImageFont.truetype(fp, 78)  # Huge bold SALE
                    font_sans_lg = ImageFont.truetype(fp, 32)  # Discount text
                    font_sans_md = ImageFont.truetype(fp, 22)  # Tags
                    font_sans_sm = ImageFont.truetype(fp, 15)  # Details
                    break

            if not font_serif_lg:
                # Default fallbacks
                font_serif_lg = ImageFont.load_default()
                font_serif_md = ImageFont.load_default()
            if not font_sans_xb:
                font_sans_xb = ImageFont.load_default()
                font_sans_lg = ImageFont.load_default()
                font_sans_md = ImageFont.load_default()
                font_sans_sm = ImageFont.load_default()

        except Exception:
            font_serif_lg = ImageFont.load_default()
            font_serif_md = ImageFont.load_default()
            font_sans_xb = ImageFont.load_default()
            font_sans_lg = ImageFont.load_default()
            font_sans_md = ImageFont.load_default()
            font_sans_sm = ImageFont.load_default()

        # 4) Dynamic Brand Logo Retrieval from Active User Session
        # Read logo_url directly from traces/users.json matching the product/business name
        dynamic_logo_url = logo_url
        if not dynamic_logo_url and product_name:
            try:
                users_json_path = Path("traces/users.json")
                if users_json_path.exists():
                    import json as _json
                    with open(users_json_path, "r", encoding="utf-8") as uf:
                        all_users = _json.load(uf)
                    for user_data in all_users.values():
                        user_bname = user_data.get("business_name", "").lower()
                        if user_bname and (user_bname in product_name.lower() or product_name.lower() in user_bname):
                            dynamic_logo_url = user_data.get("logo_url", "")
                            if dynamic_logo_url:
                                print(f"[ImageService] Resolved dynamic logo from users.json: {dynamic_logo_url}")
                            break
            except Exception as ule:
                print(f"[ImageService] Failed to read users.json for logo: {ule}")

        logo_drawn = False
        if dynamic_logo_url:
            try:
                print(f"[ImageService] Superimposing brand logo on right panel: {dynamic_logo_url}")
                logo_req = urllib.request.Request(
                    dynamic_logo_url, 
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                )
                with urllib.request.urlopen(logo_req, timeout=3.0) as logo_res:
                    logo_img = Image.open(BytesIO(logo_res.read()))
                    
                    # Resize logo to fit inside white pill
                    logo_img.thumbnail((160, 60), Image.Resampling.LANCZOS)
                    logo_rgba = logo_img.convert("RGBA")
                    lw, lh = logo_rgba.size
                    
                    # Draw elegant white pill container
                    pill_w, pill_h = 200, 76
                    pill_x1 = center_right_x - (pill_w // 2)
                    pill_y1 = 60
                    draw.rounded_rectangle([pill_x1, pill_y1, pill_x1 + pill_w, pill_y1 + pill_h], radius=12, fill="white")
                    
                    # Center logo inside pill
                    paste_x = pill_x1 + (pill_w - lw) // 2
                    paste_y = pill_y1 + (pill_h - lh) // 2
                    
                    master.paste(logo_rgba, (paste_x, paste_y), logo_rgba)
                    logo_drawn = True
                    draw = ImageDraw.Draw(master)  # Reinitialize draw after paste
                    print("[ImageService] Successfully superimposed brand logo in right panel.")
            except Exception as le:
                print(f"[ImageService] Could not superimpose logo: {le}")

        # Draw premium serif uppercase spaced Brand Name
        brand_text = product_name.upper()
        if len(brand_text) > 16:
            brand_text = brand_text.split()[0]
        
        if logo_drawn:
            draw_spaced_text(draw, brand_text, 155, font_serif_lg, white_color, center_right_x, spacing=10)
        else:
            draw_spaced_text(draw, brand_text, 80, font_serif_lg, white_color, center_right_x, spacing=10)

        # 5) Main Campaign Word (e.g. SALE, EID DEAL, NEW ARRIVALS)
        headline = ad_copy.get("headline_english", "SALE").upper() if ad_copy else "SALE"
        campaign_word = "SALE"
        if "NEW" in headline or "ARRIVAL" in headline or "SEASON" in headline:
            campaign_word = "NEW SEASON"
        elif "EID" in headline:
            campaign_word = "EID DEAL"
        elif "SUMMER" in headline:
            campaign_word = "SUMMER SALE"
        elif "WINTER" in headline:
            campaign_word = "WINTER SALE"
        else:
            words = [w for w in headline.split() if w]
            if words:
                campaign_word = " ".join(words[:2])
                if len(campaign_word) > 15:
                    campaign_word = words[0]
        
        # Centered giant SALE text
        bbox_sale = draw.textbbox((0, 0), campaign_word, font=font_sans_xb)
        sale_w = bbox_sale[2] - bbox_sale[0]
        # Adjust font size dynamically if text is long
        active_font = font_sans_xb
        if len(campaign_word) > 6:
            active_font = font_serif_lg
            bbox_sale = draw.textbbox((0, 0), campaign_word, font=active_font)
            sale_w = bbox_sale[2] - bbox_sale[0]

        # Shift down to 215 if logo is drawn, else keep at 190
        sale_y = 215 if logo_drawn else 190
        draw.text((center_right_x - sale_w // 2, sale_y), campaign_word, fill=white_color, font=active_font)

        # Thin gold horizontal divider
        draw.line([(center_right_x - 120, 290), (center_right_x + 120, 290)], fill=gold_color, width=2)

        # 6) White Discount Banner Card
        discount_val = "15% OFF"
        if ad_copy:
            body_text = (ad_copy.get("body_english", "") + " " + ad_copy.get("headline_english", "")).lower()
            import re
            match = re.search(r"(\d+%\s*off)", body_text)
            if match:
                discount_val = match.group(1).upper()
            else:
                match_flat = re.search(r"(flat\s*\d+%)", body_text)
                if match_flat:
                    discount_val = match_flat.group(1).upper() + " OFF"
                else:
                    match_pct = re.search(r"(\d+%)", body_text)
                    if match_pct:
                        discount_val = match_pct.group(1).upper() + " OFF"

        card_w, card_h = 360, 68
        card_x1 = center_right_x - (card_w // 2)
        card_y1 = 330
        draw.rounded_rectangle([card_x1, card_y1, card_x1 + card_w, card_y1 + card_h], radius=6, fill="white")

        # Text inside white banner in brand color
        bbox_disc = draw.textbbox((0, 0), discount_val, font=font_sans_lg)
        disc_w = bbox_disc[2] - bbox_disc[0]
        disc_h = bbox_disc[3] - bbox_disc[1]
        draw.text((center_right_x - disc_w // 2, card_y1 + (card_h - disc_h) // 2 - 3), 
                  discount_val, fill=brand_rgb, font=font_sans_lg)

        # 7) Collection Sub-Tagline Spaced out
        tagline_raw = theme.get("tagline", "READY TO WEAR").upper()
        if ad_copy and ad_copy.get("headline_urdu"):
            tagline_raw = ad_copy["headline_urdu"].upper()
            # Strip emojis / non-ascii
            tagline_raw = tagline_raw.encode("ascii", errors="ignore").decode("ascii").strip()
            
        if not tagline_raw or len(tagline_raw) < 3:
            tagline_raw = "READY TO WEAR"
            
        if len(tagline_raw) > 20:
            tagline_raw = tagline_raw[:20]
            
        draw_spaced_text(draw, tagline_raw, 440, font_sans_md, gold_color, center_right_x, spacing=6)

        # 8) Brand Strategy Body Text (wrapped cleanly)
        desc_text = ad_copy.get("body_english", theme.get("tagline")) if ad_copy else theme.get("tagline")
        lines = wrap_text(draw, desc_text, font_sans_sm, max_width=380)
        
        y_cursor = 500
        for line in lines[:4]:
            bbox_l = draw.textbbox((0, 0), line, font=font_sans_sm)
            lw = bbox_l[2] - bbox_l[0]
            draw.text((center_right_x - lw // 2, y_cursor), line, fill=white_color, font=font_sans_sm)
            y_cursor += 28

        # 9) Premium CTA Button
        cta_text = "SHOP NOW"
        if ad_copy:
            if ad_copy.get("cta_urdu"):
                cta_text = ad_copy["cta_urdu"].upper()
                cta_text = cta_text.encode("ascii", errors="ignore").decode("ascii").strip()
            elif ad_copy.get("cta_english"):
                cta_text = ad_copy["cta_english"].upper()

        if len(cta_text) > 16:
            cta_text = cta_text[:16]

        btn_w, btn_h = 320, 60
        btn_x1 = center_right_x - (btn_w // 2)
        btn_y1 = 660
        
        # Gold filled button
        draw.rounded_rectangle([btn_x1, btn_y1, btn_x1 + btn_w, btn_y1 + btn_h], radius=30, fill=gold_color)
        
        bbox_cta = draw.textbbox((0, 0), cta_text, font=font_sans_md)
        cta_w = bbox_cta[2] - bbox_cta[0]
        cta_h = bbox_cta[3] - bbox_cta[1]
        # Text in brand background color
        draw.text((center_right_x - cta_w // 2, btn_y1 + (btn_h - cta_h) // 2 - 2), 
                  cta_text, fill=brand_rgb, font=font_sans_md)

        # 10) Fine Footer Details
        detail_line1 = "ends 3rd dec | shop online & in-stores"
        if trend:
            detail_line1 = f"inspired by trend: {trend[:24].lower()}"
        bbox_det = draw.textbbox((0, 0), detail_line1.upper(), font=font_sans_sm)
        det_w = bbox_det[2] - bbox_det[0]
        draw.text((center_right_x - det_w // 2, 780), detail_line1.upper(), fill=white_color, font=font_sans_sm)

        detail_line2 = "🇵🇰 Pakistan Trend-Driven Campaign | InsightFlow AI"
        bbox_det2 = draw.textbbox((0, 0), detail_line2, font=font_sans_sm)
        det_w2 = bbox_det2[2] - bbox_det2[0]
        draw.text((center_right_x - det_w2 // 2, 820), detail_line2, fill=gold_color, font=font_sans_sm)

        # Save
        filename = f"ad_{uuid.uuid4().hex[:8]}.png"
        filepath = OUTPUT_DIR / filename
        master.save(str(filepath), "PNG", quality=95)
        print(f"[ImageService] SUCCESS: Beautiful split card saved: {filename}")
        return filename

    except Exception as e:
        print(f"[ImageService] Pillow ad generation error: {e}")
        import traceback
        traceback.print_exc()
        return None


def _enhance_prompt_for_pakistan(prompt: str, trend_context: str = "", product_name: str = "", strategy: dict = None, ad_copy: dict = None) -> str:
    """Make the image prompt highly culturally relevant and dynamically adapted to the strategy."""
    base = prompt.strip().rstrip(".")
    
    # Extract dynamic elements
    core_theme = strategy.get("core_theme", "") if strategy else ""
    target_category = strategy.get("target_category", "") if strategy else ""
    headline = ad_copy.get("headline_english", "") if ad_copy else ""
    
    theme_injection = f"Core Theme: {core_theme}, Target Category: {target_category}." if core_theme else ""
    copy_injection = f"Headline Inspiration: {headline}." if headline else ""
    trend_line = f"inspired by Pakistani trend: {trend_context[:80]}, " if trend_context else ""

    style = f"Professional elite {target_category} advertisement, {core_theme} aesthetic, highly detailed commercial photography setup, studio lighting, premium visual execution, culturally relevant Pakistani elements"

    return (
        f"{base}. {theme_injection} {copy_injection} {style}, {trend_line}"
        "high-resolution 4K commercial ad photo, no text overlays, no watermarks, "
        "vibrant saturated colors, sharp product focus"
    )


async def generate_ad_image(imagen_prompt: str, base_url: str = None, trend_context: str = "", ad_copy: dict = None, product_name: str = "Product", business_type: str = "generic", logo_url: str = "", brand_color: str = "", strategy: dict = None, products: list = None) -> str:
    """
    Real image generate karo using free Pollinations AI.
    Returns FULL URL for React Native.
    """
    import urllib.parse
    import random
    
    # Resolve business_name and products
    b_name = product_name if product_name else "Premium Brand"
    
    # Format products list or string
    p_str = ""
    if products:
        if isinstance(products, list):
            p_str = ", ".join(products)
        else:
            p_str = str(products)
    else:
        # Fallback: parse from imagen_prompt or business_type
        if business_type and business_type != "generic":
            p_str = f"premium {business_type} products"
        else:
            p_str = "exquisite products"
            
    b_color = brand_color if brand_color else "#0A84FF"
    
    # Force the specific high-end graphic design layout requested by user
    custom_prompt = (
        f"A professional commercial social media ad banner for {b_name}. "
        f"In the center, a cinematic premium studio photography of {p_str}. "
        f"Modern corporate graphic design layout, bold promotional typography overlay that displays the core deal, "
        f"utilizing a strict {b_color} color palette scheme with elegant clean borders, studio lighting, hyper-realistic, 8k resolution, "
        f"trending on Behance, fashion/food lookbook aesthetic."
    )
    
    print(f"[ImageService] Custom Pollinations Prompt: {custom_prompt}")
    
    encoded_prompt = urllib.parse.quote(custom_prompt)
    seed = random.randint(1, 999999)
    image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=512&nologo=true&seed={seed}"
    
    print(f"[ImageService] Free Pollinations Image generated: {image_url}")
    return image_url




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
