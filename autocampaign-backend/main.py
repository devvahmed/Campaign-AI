import os
import json
import uuid
import hashlib
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

load_dotenv()

from models.campaign import AnalyzeRequest, StrategyResponse, ExecutionStep, UserRegisterRequest, UserLoginRequest
from agents.agent1_data import run_agent1
from agents.agent2_strategy import run_agent2
from agents.agent3_creative import run_agent3
from agents.agent4_execution import run_agent4
from services.email_service import send_campaign_email
from services.ai_service import get_gemini_response

TRACE_DIR = Path("traces")
TRACE_DIR.mkdir(exist_ok=True)

# ── Local JSON User Database Initialization ─────────────────────────────────
USERS_FILE = Path("traces/users.json")
OLD_USERS_FILE = Path("users.json")

# Ensure traces directory exists
Path("traces").mkdir(exist_ok=True)

# Migrate old users.json to traces/users.json if the latter doesn't exist
if not USERS_FILE.exists():
    if OLD_USERS_FILE.exists():
        try:
            import shutil
            shutil.copy(OLD_USERS_FILE, USERS_FILE)
            print("[main] Successfully migrated users.json to traces/users.json")
        except Exception as e:
            print(f"[main] Migration failed: {e}")
            with open(USERS_FILE, "w", encoding="utf-8") as f:
                json.dump({}, f)
    else:
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f)

def load_users() -> dict:
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def save_users(users: dict):
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2, ensure_ascii=False)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

async def analyze_website_brand(website_url: str, business_name: str) -> dict:
    from services.scraper_service import explore_brand_website
    try:
        return await explore_brand_website(website_url, business_name)
    except Exception as e:
        print(f"[main] Error during website brand analysis: {e}")
        return {
            "brand_color": "#0088FF",
            "brand_persona": "Friendly & Modern Business",
            "business_type": "generic",
            "products": ["premium product", "special offer", "exclusive deal"],
            "logo_url": ""
        }


class GenerateAssetsRequest(BaseModel):
    job_id: str
    strategy: Dict[str, Any]
    business_knowledge_level: str = "beginner"

class ApproveRequest(BaseModel):
    job_id: str
    budget: float
    strategy: Dict[str, Any]
    customerLeads: Optional[List[str]] = None
    ad_copy: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    business_name: Optional[str] = None
    brand_color: Optional[str] = None
    website_url: Optional[str] = None

app = FastAPI(title="AutoCampaign AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Path("generated_images").mkdir(exist_ok=True)
app.mount("/generated_images", StaticFiles(directory="generated_images"), name="images")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "AutoCampaign AI Backend"}

trace_store = {}
inputs_store = {}

def save_trace(job_id: str, trace_data: list):
    filepath = TRACE_DIR / f"{job_id}.json"
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(trace_data, f, indent=2, ensure_ascii=False)

def log_trace(store: dict, job_id: str, trace):
    if job_id not in store:
        store[job_id] = []
    store[job_id].append(trace.dict())
    save_trace(job_id, store[job_id])

# ── Authentication Endpoints ──────────────────────────────────────────────────

@app.post("/api/auth/register")
async def register_user(request: UserRegisterRequest):
    users = load_users()
    email = request.email.strip().lower()
    
    if email in users:
        raise HTTPException(status_code=409, detail=f"An account with {email} already exists. Please sign in instead.")
    

    # Pre-normalize website_url to ensure it has a proper scheme (defaulting to https://)
    website_url = request.website_url.strip() if request.website_url else ""
    if website_url and not (website_url.startswith("http://") or website_url.startswith("https://")):
        website_url = "https://" + website_url

    # Default premium baseline colors used when the user opts out
    DEFAULT_BRAND_COLOR = "#0A84FF"
    DEFAULT_BRAND_PERSONA = "Sleek & Professional AI Platform"
    DEFAULT_BUSINESS_TYPE = "generic"
    DEFAULT_PRODUCTS = ["premium product", "special offer", "exclusive deal"]
    DEFAULT_LOGO_URL = ""
        
    # Parse requested products
    user_products_list = []
    if request.products:
        user_products_list = [p.strip() for p in request.products.replace("/", ",").replace(";", ",").split(",") if p.strip()]

    if request.apply_brand_theme:
        brand_context = await analyze_website_brand(website_url, request.business_name)
        brand_color = brand_context.get("brand_color", DEFAULT_BRAND_COLOR)
        brand_persona = brand_context.get("brand_persona", DEFAULT_BRAND_PERSONA)
        business_type = request.business_type if request.business_type and request.business_type != "generic" else brand_context.get("business_type", DEFAULT_BUSINESS_TYPE)
        
        # Merge products
        scraped_products = brand_context.get("products", DEFAULT_PRODUCTS)
        products = user_products_list if user_products_list else ([request.business_type] if request.business_type and request.business_type != "generic" else scraped_products)
        logo_url = brand_context.get("logo_url", DEFAULT_LOGO_URL)
        
        # Double check logo_url is not empty/null by forcing custom bulletproof resolve
        if not logo_url and website_url:
            from services.scraper_service import get_bulletproof_logo_url
            logo_url = await get_bulletproof_logo_url(website_url)
    else:
        brand_color = DEFAULT_BRAND_COLOR
        brand_persona = DEFAULT_BRAND_PERSONA
        business_type = request.business_type if request.business_type and request.business_type != "generic" else DEFAULT_BUSINESS_TYPE
        products = user_products_list if user_products_list else ([request.business_type] if request.business_type and request.business_type != "generic" else DEFAULT_PRODUCTS)
        logo_url = DEFAULT_LOGO_URL
    
    users[email] = {
        "email": email,
        "password_hash": hash_password(request.password),
        "business_name": request.business_name,
        "website_url": website_url,
        "brand_color": brand_color,
        "brand_persona": brand_persona,
        "business_type": business_type,
        "products": products,
        "logo_url": logo_url,
        "apply_brand_theme": request.apply_brand_theme
    }
    
    save_users(users)
    
    return {
        "status": "success",
        "user": {
            "email": email,
            "business_name": request.business_name,
            "website_url": website_url,
            "brand_color": brand_color,
            "brand_persona": brand_persona,
            "business_type": business_type,
            "products": products,
            "logo_url": logo_url,
            "apply_brand_theme": request.apply_brand_theme
        }
    }

@app.post("/api/auth/login")
def login_user(request: UserLoginRequest):
    users = load_users()
    email = request.email.strip().lower()
    
    if email not in users:
        raise HTTPException(status_code=400, detail="Invalid email or password")
        
    user_record = users[email]
    if user_record["password_hash"] != hash_password(request.password):
        raise HTTPException(status_code=400, detail="Invalid email or password")
        
    return {
        "status": "success",
        "user": {
            "email": email,
            "business_name": user_record["business_name"],
            "website_url": user_record["website_url"],
            "brand_color": user_record["brand_color"],
            "brand_persona": user_record["brand_persona"],
            "business_type": user_record.get("business_type", "generic"),
            "products": user_record.get("products", []),
            "logo_url": user_record.get("logo_url", ""),
            "apply_brand_theme": user_record.get("apply_brand_theme", True)
        }
    }

# ── Dynamic Pipeline Core Endpoints ───────────────────────────────────────────

@app.post("/api/analyze", response_model=StrategyResponse)
async def analyze_data(request: AnalyzeRequest, req: Request):
    inputs_store[request.job_id] = request.inputs.model_dump()
    
    if request.job_id not in trace_store:
        trace_store[request.job_id] = []

    # 1. Load brand details from registered user if any
    users = load_users()
    matched_user = None
    if request.business_name:
        for u in users.values():
            if u.get("business_name", "").lower() == request.business_name.lower():
                matched_user = u
                break

    brand_color = request.brand_color
    brand_persona = None
    business_type = "generic"
    products = []
    logo_url = ""

    if matched_user:
        brand_color = brand_color or matched_user.get("brand_color")
        brand_persona = matched_user.get("brand_persona")
        business_type = matched_user.get("business_type", "generic")
        products = matched_user.get("products", [])
        logo_url = matched_user.get("logo_url", "")

    # 2. Live Website Crawl during campaign run
    live_context = {}
    if request.inputs.web_url and request.inputs.web_url.startswith("http"):
        try:
            from services.scraper_service import explore_brand_website
            # Explore the campaign landing page live!
            live_context = await explore_brand_website(request.inputs.web_url, request.business_name or "Brand")
        except Exception as e:
            print(f"[main] Live campaign website explore failed: {e}")

    if live_context:
        brand_color = brand_color or live_context.get("brand_color")
        brand_persona = brand_persona or live_context.get("brand_persona")
        if live_context.get("business_type") and live_context.get("business_type") != "generic":
            business_type = live_context.get("business_type")
        if live_context.get("products"):
            products = live_context.get("products")
        if live_context.get("logo_url"):
            logo_url = live_context.get("logo_url")

    # If still not populated, set premium default
    if not brand_color:
        brand_color = "#0A84FF"

    # Agent 1: Data Intelligence
    agent1_out, trace1 = await run_agent1(
        request.job_id, 
        request.inputs, 
        request.business_knowledge_level,
        scenario_id=request.scenario_id,
        business_name=request.business_name,
        business_type=business_type,
        products=products
    )
    log_trace(trace_store, request.job_id, trace1)
    
    # Agent 2: Strategy
    agent2_out, trace2 = await run_agent2(
        request.job_id, 
        agent1_out, 
        request.budget, 
        request.business_knowledge_level,
        scenario_id=request.scenario_id,
        business_name=request.business_name,
        business_type=business_type,
        products=products
    )
    log_trace(trace_store, request.job_id, trace2)
    
    # Agent 3: Creative Assets
    base_url = str(req.base_url).rstrip("/")
    agent3_out, trace3 = await run_agent3(
        request.job_id, 
        agent2_out.model_dump(), 
        request.business_knowledge_level, 
        base_url, 
        inputs_store[request.job_id],
        business_name=request.business_name,
        brand_color=brand_color,
        scenario_id=request.scenario_id,
        business_type=business_type,
        products=products,
        logo_url=logo_url
    )
    log_trace(trace_store, request.job_id, trace3)
    
    return StrategyResponse(
        job_id=request.job_id,
        agent1_data=agent1_out,
        agent2_strategy=agent2_out,
        agent3_creative=agent3_out
    )

async def send_campaign_emails_bg(
    job_id: str, 
    customer_leads: list, 
    ad_copy: dict, 
    image_url: str, 
    video_url: str, 
    brand_color: str, 
    business_name: str, 
    website_url: str,
    trace4_initial: Any
):
    print(f"[main] Starting background email dispatch for job {job_id}...")
    subject = ad_copy.get('email_subject', '🚀 Your AI Campaign Assets are Ready!')
    ad_text = ad_copy.get('email_body', f"{ad_copy.get('headline_english', '')}\n\n{ad_copy.get('body_english', '')}")
    
    # Retrieve the registered brand's logo from users.json via name lookup
    users = load_users()
    logo_url = ""
    if business_name:
        for u in users.values():
            if u.get("business_name", "").lower() == business_name.lower():
                logo_url = u.get("logo_url", "")
                break

    import asyncio
    tasks = [
        send_campaign_email(
            to_email=email,
            subject=subject,
            ad_text=ad_text,
            image_url=image_url,
            video_url=video_url or "",
            brand_color=brand_color or "#0088ff",
            business_name=business_name or "AutoCampaign Premium Hub",
            website_url=website_url,
            logo_url=logo_url
        )
        for email in customer_leads
    ]
    
    results = await asyncio.gather(*tasks)
    success_count = sum(1 for r in results if r)
    total_leads = len(customer_leads)
    
    status = "Success" if success_count == total_leads else "Partial Success" if success_count > 0 else "Failed"
    
    # Update Agent 4 step and append tool call / log update
    trace4_initial.tool_calls.append(f"bulk_send_campaign_email_bg(leads={total_leads}) -> {status}")
    trace4_initial.output_summary += f" | Bulk Email Dispatch: {status} ({success_count}/{total_leads})"
    
    log_trace(trace_store, job_id, trace4_initial)
    print(f"[main] Finished background email dispatch for job {job_id}. Status: {status}")


@app.post("/api/approve")
async def approve_campaign(request: Request, background_tasks: BackgroundTasks):
    """
    Unified approve endpoint supporting both JSON and multipart/form-data (with CSV upload).
    - JSON: Standard campaign approval flow.
    - Multipart: Parses form fields + CSV file containing customer emails for bulk dispatch.
    """
    content_type = request.headers.get("content-type", "")

    # ── Multipart/form-data path (CSV file upload) ───────────────────────
    if "multipart/form-data" in content_type:
        form = await request.form()

        job_id = str(form.get("job_id", ""))
        budget = float(form.get("budget", 0))
        strategy_raw = str(form.get("strategy", "{}"))
        try:
            strategy = json.loads(strategy_raw)
        except Exception:
            strategy = {}

        ad_copy_raw = str(form.get("ad_copy", "{}"))
        try:
            ad_copy = json.loads(ad_copy_raw)
        except Exception:
            ad_copy = None

        image_url = str(form.get("image_url", "")) or None
        video_url = str(form.get("video_url", "")) or None
        business_name = str(form.get("business_name", "")) or None
        brand_color = str(form.get("brand_color", "")) or None
        website_url = str(form.get("website_url", "")) or None

        # Parse CSV file for customer emails
        customer_leads = []
        csv_file = form.get("file")
        if csv_file and hasattr(csv_file, "read"):
            try:
                import csv
                import io
                from utils.logger import log_lead_parsing_trace
                file_bytes = await csv_file.read()
                file_text = file_bytes.decode("utf-8", errors="ignore")
                reader = csv.reader(io.StringIO(file_text))
                validation_errors = []
                row_idx = 0
                for row in reader:
                    row_idx += 1
                    row_has_email = False
                    for cell in row:
                        cell = cell.strip()
                        if not cell:
                            continue
                        if "@" in cell and "." in cell:
                            customer_leads.append(cell)
                            row_has_email = True
                        else:
                            if any(x in cell for x in ["@", ".", "com", "net", "org"]) or len(cell) > 5:
                                validation_errors.append(f"Row {row_idx}: cell '{cell[:20]}' does not look like a valid email.")
                    if not row_has_email and any(row):
                        validation_errors.append(f"Row {row_idx}: No valid email found in row.")
                
                # Log parsing trace
                log_lead_parsing_trace(
                    file_name=getattr(csv_file, "filename", "uploaded_leads.csv") or "uploaded_leads.csv",
                    total_count=len(customer_leads),
                    validation_errors=validation_errors
                )
                print(f"[main] Parsed {len(customer_leads)} emails from uploaded CSV with {len(validation_errors)} warnings.")
            except Exception as csv_err:
                print(f"[main] CSV parsing error: {csv_err}")
                try:
                    from utils.logger import log_lead_parsing_trace
                    log_lead_parsing_trace(
                        file_name=getattr(csv_file, "filename", "uploaded_leads.csv") or "uploaded_leads.csv",
                        total_count=0,
                        validation_errors=[f"Critical CSV error: {str(csv_err)}"]
                    )
                except Exception:
                    pass

        # Build a pseudo-request object for downstream logic
        approve_data = ApproveRequest(
            job_id=job_id,
            budget=budget,
            strategy=strategy,
            customerLeads=customer_leads if customer_leads else None,
            ad_copy=ad_copy,
            image_url=image_url,
            video_url=video_url,
            business_name=business_name,
            brand_color=brand_color,
            website_url=website_url,
        )
    else:
        # ── Standard JSON path ───────────────────────────────────────────
        body = await request.json()
        approve_data = ApproveRequest(**body)

    # ── Shared execution logic ───────────────────────────────────────────
    execution_out, trace4 = await run_agent4(approve_data.job_id, approve_data.budget, approve_data.strategy)

    execution_log = []
    total_cost = 0.0

    for step in execution_out.execution_steps:
        cost = 0.0
        if "SMS" in step.step:
            cost = approve_data.budget * 0.15
        elif "WhatsApp" in step.step:
            cost = approve_data.budget * 0.25
        elif "Email" in step.step or "Resend" in step.step:
            cost = approve_data.budget * 0.20
        else:
            cost = approve_data.budget * 0.40

        execution_log.append({
            "action": step.step,
            "status": step.status,
            "cost": cost,
            "latency_ms": step.latency_ms,
            "error": step.message if step.status == "FAILED" else None
        })
        total_cost += cost

    if approve_data.customerLeads and approve_data.ad_copy and approve_data.image_url:
        total_leads = len(approve_data.customerLeads)

        email_cost = approve_data.budget * 0.20
        execution_log.append({
            "action": "Bulk Email Dispatch (Resend)",
            "status": "SUCCESS",
            "cost": email_cost,
            "latency_ms": 10,
            "error": None
        })
        total_cost += email_cost

        execution_out.execution_steps.append(ExecutionStep(
            step="Bulk Email Dispatch (Resend)",
            status="Scheduled",
            latency_ms=10,
            message=f"Dispatching campaign emails to {total_leads} customer leads asynchronously..."
        ))

        background_tasks.add_task(
            send_campaign_emails_bg,
            approve_data.job_id,
            approve_data.customerLeads,
            approve_data.ad_copy,
            approve_data.image_url,
            approve_data.video_url,
            approve_data.brand_color,
            approve_data.business_name,
            approve_data.website_url,
            trace4
        )
    else:
        log_trace(trace_store, approve_data.job_id, trace4)

    return {
        "status": "processing",
        "job_id": approve_data.job_id,
        "final_status": execution_out.status,
        "execution_steps": [s.dict() for s in execution_out.execution_steps],
        "final_message": execution_out.final_message,
        "execution_log": execution_log,
        "total_cost": total_cost
    }


# ── Curated Local Brands & Competitors Database ──────────────────────────────
PAKISTANI_BRANDS_DATABASE = {
    "food": {
        "pizza": {
            "brands": ["Broadway Pizza", "Domino's", "Pizza Hut", "14th Street Pizza"],
            "colors": {"broadway pizza": "#C0392B", "domino's": "#006491", "pizza hut": "#E4002B", "14th street pizza": "#F2A900"},
            "deals": {
                "broadway pizza": "Flat 30% OFF on all Large Pizzas!",
                "domino's": "Double Melt Deal: 2 Medium Pizzas for Rs. 1899",
                "pizza hut": "Midweek Madness: Flat 40% OFF on takeaway",
                "14th street pizza": "20-Inch Monster Slice Combo with Drinks"
            }
        },
        "burger": {
            "brands": ["KFC", "McDonald's", "Burger Lab", "Burger o' Clock", "Hardees"],
            "colors": {"kfc": "#E4002B", "mcdonald's": "#FFC72C", "burger lab": "#000000", "burger o' clock": "#D35400", "hardees": "#FFC72C"},
            "deals": {
                "kfc": "KFC Krunch Family Bucket: 9 Pcs Chicken + Drinks for Rs. 2450",
                "mcdonald's": "McValue Share Box: 2 McCrispy + 2 Fries + 2 Drinks Rs. 1650",
                "burger lab": "Buy 1 Get 1 FREE on Big Bang Burgers!",
                "burger o' clock": "Flat 25% OFF on Premium Burger range",
                "hardees": "Famous Star Burger Combo with Unlimited Drink refills"
            }
        },
        "desi": {
            "brands": ["Kababjees", "Kolachi", "Lal Qila", "Bar.B.Q Tonight", "Salt'n Pepper"],
            "colors": {"kababjees": "#A32C2C", "kolachi": "#2C3E50", "lal qila": "#8B0000", "bar.b.q tonight": "#1C2833", "salt'n pepper": "#D35400"},
            "deals": {
                "kababjees": "Dine-in Platter Deal: Handi, Kabab, Tikka & Naan for 4 Persons Rs. 4999",
                "kolachi": "Sajji & Mutton Karahi Special Discount Offer",
                "lal qila": "Royal Dinner Buffet with 80+ Desi & Continental Dishes Rs. 2950",
                "bar.b.q tonight": "Special Family Barbecue Platter: 20% OFF",
                "salt'n pepper": "Flat 15% OFF on Sunday Lunch Buffet"
            }
        },
        "dessert": {
            "brands": ["Soft Swirl", "Alpine Gelato", "Chaman Ice Cream", "Lal's Chocolate", "Baskin Robbins"],
            "colors": {"soft swirl": "#FF69B4", "alpine gelato": "#5D8AA8", "chaman ice cream": "#FF8C00", "lal's chocolate": "#4A2711", "baskin robbins": "#FF69B4"},
            "deals": {
                "soft swirl": "Buy 1 Get 1 Free on Waffle Cones!",
                "alpine gelato": "Double Scoop Waffle Bowl at Rs. 450 Only",
                "chaman ice cream": "Special Pistachio Kulfi Pack discount",
                "lal's chocolate": "Luxury Gift Box 20% OFF for celebrations",
                "baskin robbins": "Pink Wednesday: Flat 31% OFF on Scoops"
            }
        },
        "cafe": {
            "brands": ["Gloria Jean's Coffees", "Espresso", "Second Cup", "Butlers Chocolate Cafe"],
            "colors": {"gloria jean's coffees": "#4E3629", "espresso": "#1C1C1C", "second cup": "#800000", "butlers chocolate cafe": "#D4AF37"},
            "deals": {
                "gloria jean's coffees": "Flat 20% OFF on all Iced Lattes & Cappuccinos!",
                "espresso": "Breakfast Club Deal: Eggs, Waffles & Coffee Rs. 999",
                "second cup": "Caramel Corretto & Muffin Combo Offer",
                "butlers chocolate cafe": "Complimentary Luxury Praline with any Hot Drink"
            }
        },
        "generic": {
            "brands": ["KFC", "McDonald's", "Kababjees", "Broadway Pizza"],
            "colors": {"kfc": "#E4002B", "mcdonald's": "#FFC72C", "kababjees": "#A32C2C", "broadway pizza": "#C0392B"},
            "deals": {
                "kfc": "KFC Value Bucket: 9 Pcs Chicken + Drinks for Rs. 2450",
                "mcdonald's": "McValue Share Box Rs. 1650",
                "kababjees": "Desi Platter Deal: Rs. 4999",
                "broadway pizza": "Flat 30% OFF on all Large Pizzas!"
            }
        }
    },
    "fashion": {
        "brands": ["Khaadi", "Sapphire", "Alkaram Studio", "Limelight", "Gul Ahmed", "Sana Safinaz", "Ethnic", "Outfitters", "J.", "Bonanza Satrangi"],
        "colors": {
            "khaadi": "#6B2737", "sapphire": "#2A2A72", "alkaram studio": "#6B2737", "limelight": "#2E7D32", 
            "gul ahmed": "#0D47A1", "sana safinaz": "#880E4F", "ethnic": "#6B2737", "outfitters": "#2C3E50", 
            "j.": "#1C1C1C", "bonanza satrangi": "#AD1457"
        },
        "deals": {
            "khaadi": "Flat 30% and 50% OFF on Unstitched & Pret Summer Collections!",
            "sapphire": "Sapphire Intermix Collection: Buy 2 Get 1 FREE on Selected items!",
            "alkaram studio": "Festive Lawn Clearance Sale: Flat 40% OFF all items",
            "limelight": "Ready-to-Wear Mid-Summer Sale: Flat 30% OFF",
            "gul ahmed": "Ideas Great Summer Showdown: Up to 70% OFF!",
            "sana safinaz": "Muzlin Luxury Collection: Special 20% Discount",
            "ethnic": "Special Ethnic Pret Kurti Sale: Starting from Rs. 1850!",
            "outfitters": "Summer Clearance Fest: Up to 50% OFF Streetwear",
            "j.": "J. Fragrances & Apparel Jashn-e-Bahar: Flat 25% OFF",
            "bonanza satrangi": "Satrangi Lawn Special Volume: Flat 30% OFF"
        }
    },
    "footwear": {
        "brands": ["Stylo", "ECS", "Borjan", "Bata", "Servis", "Insignia Footwear"],
        "colors": {
            "stylo": "#E91E63", "ecs": "#4A148C", "borjan": "#795548", 
            "bata": "#D50000", "servis": "#0D47A1", "insignia footwear": "#D4AF37"
        },
        "deals": {
            "stylo": "Stylo Summer Footwear Sale: Flat 51% OFF on Heels & Sandals!",
            "ecs": "ECS Blessed Friday Sale: Flat 20% OFF on New Arrivals",
            "borjan": "Borjan Eid Collection Special: Flat 30% OFF on Men & Women shoes",
            "bata": "Bata Back to School Combo: Buy Shoes + Socks and save 15%",
            "servis": "Servis Cheetah & Sports Range Sale: Flat 25% OFF",
            "insignia footwear": "Insignia Premium Leather Handbags & Shoes: Up to 40% OFF"
        }
    },
    "beauty": {
        "brands": ["Saeed Ghani", "J. Cosmetics", "Hemani", "WB by Hemani", "Conatural"],
        "colors": {"saeed ghani": "#2E7D32", "j. cosmetics": "#880E4F", "hemani": "#1B5E20", "wb by hemani": "#33691E", "conatural": "#E91E63"},
        "deals": {
            "saeed ghani": "Organic Rose Water & Aloe Vera Combo Deal: Flat 20% OFF!",
            "j. cosmetics": "Halal Certified Makeup & Fragrances: Flat 25% OFF",
            "hemani": "Hemani Herbal Oils & Skincare Serums: Flat 15% OFF",
            "wb by hemani": "WB Wasim Badami Herbal Shampoos: Buy 2 Get 1 FREE",
            "conatural": "Organic Hair Growth Cream & Cleanser Bundle Pack 30% OFF"
        }
    },
    "electronics": {
        "brands": ["Daraz", "Telemart", "iShopping.pk", "Mega.pk"],
        "colors": {"daraz": "#FF5722", "telemart": "#0D47A1", "ishopping.pk": "#1A237E", "mega.pk": "#2E7D32"},
        "deals": {
            "daraz": "Daraz 11.11 Shopping Festival: Up to 70% OFF + Free Shipping!",
            "telemart": "Telemart Mobile Week: Extra Rs. 5000 off on Bank Cards",
            "ishopping.pk": "iShopping Electronics Bonanza: Special Warranty Deals",
            "mega.pk": "Mega Laptop Sale: Complimentary Laptop Bag with Intel Core i7"
        }
    },
    "automotive": {
        "brands": ["Toyota IMC", "Honda Atlas Cars", "Suzuki Pakistan", "Hyundai Nishat", "Kia Lucky Motors", "Changan Pakistan", "MG Motors Pakistan", "DFSK Pakistan"],
        "colors": {
            "toyota imc": "#EB0A1E", "honda atlas cars": "#CC0000", "suzuki pakistan": "#004B8D",
            "hyundai nishat": "#002C5F", "kia lucky motors": "#BB162B", "changan pakistan": "#C8102E",
            "mg motors pakistan": "#1D1D1B", "dfsk pakistan": "#00529B"
        },
        "deals": {
            "toyota imc": "Corolla Grande: Free 3-Year Extended Warranty + Free Registration!",
            "honda atlas cars": "Civic Oriel: 0% Down Payment Finance via Bank Al-Habib for 5 Years",
            "suzuki pakistan": "Alto VXR: Special Pre-Booking Price — Save Rs. 50,000 vs Showroom!",
            "hyundai nishat": "Tucson Ultimate: Complimentary 3-Year Service Package Included",
            "kia lucky motors": "Sportage AWD: Free Sunroof + Leather Seat Upgrade on Bookings This Month",
            "changan pakistan": "Alsvin Lumiere: Rs. 300,000 Off on Showroom Price — Limited Units!",
            "mg motors pakistan": "MG HS Essence: Free Panoramic Sunroof + 7-Year Warranty!",
            "dfsk pakistan": "Glory 500: Rs. 200,000 Off + Free First Service Package"
        }
    },
    "health_fitness": {
        "brands": ["GNC Pakistan", "Shredded PK", "Nutrifactor", "Herbion Pakistan", "Osi Sports", "Fitflex"],
        "colors": {
            "gnc pakistan": "#FFC107", "shredded pk": "#E53935", "nutrifactor": "#2E7D32",
            "herbion pakistan": "#1B5E20", "osi sports": "#0D47A1", "fitflex": "#FF5722"
        },
        "deals": {
            "gnc pakistan": "GNC Whey Protein Stack: Buy 2 Get 1 FREE this week!",
            "shredded pk": "Pre-Workout + Creatine Combo: Flat 20% OFF",
            "nutrifactor": "Vitamin C + Zinc Immunity Bundle: Rs. 999 Only",
            "herbion pakistan": "Herbion Naturals Supplement Range: Flat 15% OFF",
            "osi sports": "Premium Gym Equipment: EMI available at 0% markup",
            "fitflex": "Monthly Membership with Free Personal Training Session"
        }
    },
    "home_furniture": {
        "brands": ["Interwood", "Habitt", "HOME", "Gul Ahmed Home", "Dawlance", "Haier Pakistan"],
        "colors": {
            "interwood": "#3E2723", "habitt": "#BF360C", "home": "#4E342E",
            "gul ahmed home": "#0D47A1", "dawlance": "#D50000", "haier pakistan": "#1A237E"
        },
        "deals": {
            "interwood": "Interwood Bedroom Set: Up to 25% OFF on Complete Furniture Suites!",
            "habitt": "Habitt Home Décor Clearance: Flat 30% OFF on All Living Room Items",
            "home": "HOME Summer Collection: Flat 20% OFF on Curtains & Soft Furnishings",
            "gul ahmed home": "Gul Ahmed Bedsheet & Towel Combo: Buy 2 Sets Get 1 Free",
            "dawlance": "Dawlance Inverter AC: 0% Down + Free Installation This Month",
            "haier pakistan": "Haier Smart Home Package: TV + Fridge + Washing Machine Bundle"
        }
    },
    "grocery": {
        "brands": ["Imtiaz Super Market", "Carrefour Pakistan", "HKB", "Chase Value", "Metro Cash & Carry"],
        "colors": {
            "imtiaz super market": "#E53935", "carrefour pakistan": "#1565C0",
            "hkb": "#D84315", "chase value": "#2E7D32", "metro cash & carry": "#C62828"
        },
        "deals": {
            "imtiaz super market": "Imtiaz Weekend Sale: Flat 20% OFF on Fresh Produce & Bakery!",
            "carrefour pakistan": "Carrefour Price Lock: Guaranteed Lowest Grocery Prices This Week",
            "hkb": "HKB Eid Grocery Pack: Bundle Offer Save Rs. 500 on Rs. 5000 Bill",
            "chase value": "Chase Value Monthly Savers: Flat 15% OFF on All Dairy Products",
            "metro cash & carry": "Metro B2B Bulk Buy: Extra 10% OFF for Business Cardholders"
        }
    },
    "real_estate": {
        "brands": ["Zameen.com", "Bahria Town", "DHA Pakistan", "Park View City", "Graana.com"],
        "colors": {
            "zameen.com": "#E53935", "bahria town": "#1565C0", "dha pakistan": "#1B5E20",
            "park view city": "#4A148C", "graana.com": "#E65100"
        },
        "deals": {
            "zameen.com": "Zameen Expo 2025: 0% Commission on Featured Projects!",
            "bahria town": "Bahria Town New Sector Launch: Pre-Booking at 20% Below Market Rate",
            "dha pakistan": "DHA Residential Plots: Special Instalment Plans Over 5 Years",
            "park view city": "Park View Villas: Free Car Parking + Free Utilities for 2 Years",
            "graana.com": "Graana Verified Listings: Free Legal Consultation with Every Deal"
        }
    },
    "jewelry": {
        "brands": ["PC Jewellers", "Tiffany & Co Pakistan", "Sakura Jewels", "Gold Souk Pakistan", "Sarafa Bazaar"],
        "colors": {
            "pc jewellers": "#F9A825", "tiffany & co pakistan": "#00B0B9",
            "sakura jewels": "#AD1457", "gold souk pakistan": "#F57F17", "sarafa bazaar": "#6D4C41"
        },
        "deals": {
            "pc jewellers": "PC Diamond Collection: Free Ring Box + Polishing on any Gold Purchase!",
            "tiffany & co pakistan": "Tiffany Sterling Silver: Complimentary Engraving on Couple Sets",
            "sakura jewels": "Sakura Bridal Set: Up to 30% OFF on Complete Necklace Suites",
            "gold souk pakistan": "Gold Souk Seasonal Sale: Free Making Charges on All Bangles",
            "sarafa bazaar": "Sarafa Wholesale Rate: Best Gold Price Guaranteed in Pakistan"
        }
    },
    "travel": {
        "brands": ["Airblue", "PIA (Pakistan Airlines)", "Airlink", "Waada Travel", "Al-Meezan Hajj Tours"],
        "colors": {
            "airblue": "#003087", "pia (pakistan airlines)": "#006747", "airlink": "#E53935",
            "waada travel": "#FF8F00", "al-meezan hajj tours": "#2E7D32"
        },
        "deals": {
            "airblue": "Airblue Flash Seats: Karachi-Lahore from Rs. 8,999 — Book Now!",
            "pia (pakistan airlines)": "PIA Summer Package: Dubai Return Tickets from Rs. 55,000!",
            "airlink": "Airlink Domestic Pass: Fly 4 Routes for the Price of 2",
            "waada travel": "Waada Honeymoon Package: Turkey 7N/8D from Rs. 1,10,000/couple",
            "al-meezan hajj tours": "Economy Umrah Package: Rs. 1,85,000 All-Inclusive — 2025 Season"
        }
    },
    "education": {
        "brands": ["Coursera Pakistan", "Sabaq Foundation", "Iqra University", "City School Network", "Preply Pakistan"],
        "colors": {
            "coursera pakistan": "#0056D2", "sabaq foundation": "#E53935",
            "iqra university": "#1B5E20", "city school network": "#880E4F", "preply pakistan": "#311B92"
        },
        "deals": {
            "coursera pakistan": "Coursera Plus Annual: 7-Day Free Trial + 50% OFF First Month!",
            "sabaq foundation": "Sabaq Free Matric & Inter Video Lectures — 100% Free Always",
            "iqra university": "Iqra Spring Semester Admission: Merit Scholarship up to 50%",
            "city school network": "City School Early Registration: Flat Rs. 5,000 Discount on Fees",
            "preply pakistan": "Preply English Tutor: First Lesson Free with Top-Rated Tutors"
        }
    },
    "digital": {
        "brands": ["Systems Limited", "NetSol Technologies", "Gaditek", "Arbisoft", "10Pearls"],
        "colors": {
            "systems limited": "#0D47A1", "netsol technologies": "#1B5E20",
            "gaditek": "#E53935", "arbisoft": "#FF6F00", "10pearls": "#6A1B9A"
        },
        "deals": {
            "systems limited": "Systems Ltd SAP Rollout Package: Free 3-Month Post-Go-Live Support",
            "netsol technologies": "NetSol LeaseSoft: Free POC Setup + 30-Day Pilot at No Cost",
            "gaditek": "Gaditek Digital Marketing Retainer: 2 Months Free on 12-Month Contract",
            "arbisoft": "Arbisoft MVP Development: First Sprint Free for Startups",
            "10pearls": "10Pearls Product Design Sprint: Free UX Audit for New Clients"
        }
    },
    "generic": {
        "brands": ["Daraz", "Telemart", "Yayvo", "Shoppingbag.pk"],
        "colors": {"daraz": "#FF5722", "telemart": "#0D47A1", "yayvo": "#AD1457", "shoppingbag.pk": "#0E2F56"},
        "deals": {
            "daraz": "Daraz Grand Sale: Up to 50% OFF across all categories!",
            "telemart": "Flat 10% OFF on all online orders today",
            "yayvo": "Yayvo Tech Deals: Flat 15% OFF on accessories",
            "shoppingbag.pk": "Imported Goods Clearance: Flat 20% OFF"
        }
    }
}


def resolve_competitors_locally(business_name: str, business_type: str, products: list) -> dict:
    name_lower = business_name.lower().strip()
    type_lower = business_type.lower().strip() if business_type else ""
    prod_list = [p.lower().strip() for p in products] if products else []
    
    # 1. Classify Category
    category = "generic"
    sub_niche = None
    
    # ── Category keyword maps (ordered by specificity — automotive FIRST to avoid false matches) ──
    CATEGORY_KEYWORDS = [
        (
            "automotive",
            ["car", "cars", "automobile", "automotive", "motors", "motor", "vehicle", "vehicles",
             "toyota", "honda", "suzuki", "hyundai", "kia", "changan", "mg", "dfsk", "nissan",
             "sedan", "suv", "hatchback", "crossover", "electric vehicle", "ev", "petrol",
             "showroom", "dealership", "auto"]
        ),
        (
            "health_fitness",
            ["gym", "fitness", "protein", "supplement", "workout", "yoga", "sport", "activewear",
             "nutrition", "vitamin", "health", "wellness", "whey", "creatine", "preworkout"]
        ),
        (
            "home_furniture",
            ["furniture", "sofa", "bed", "mattress", "curtain", "rug", "carpet", "lamp",
             "home decor", "decor", "interior", "kitchen appliance", "refrigerator",
             "washing machine", "air conditioner", "interwood", "habitt"]
        ),
        (
            "grocery",
            ["grocery", "supermarket", "superstore", "imtiaz", "carrefour", "metro",
             "fresh produce", "dairy", "vegetables", "bakery items", "snacks", "household"]
        ),
        (
            "real_estate",
            ["property", "real estate", "plot", "plots", "apartment", "flat", "house",
             "villa", "zameen", "bahria", "dha", "housing scheme", "construction"]
        ),
        (
            "jewelry",
            ["gold", "silver", "diamond", "jewelry", "jewellery", "jewel", "ring",
             "necklace", "bracelet", "bangle", "wedding set", "bridal jewelry", "sarafa"]
        ),
        (
            "travel",
            ["travel", "tourism", "airline", "flight", "hotel", "tour", "hajj", "umrah",
             "visa", "booking", "airblue", "pia", "package", "holiday", "cruise"]
        ),
        (
            "education",
            ["school", "university", "college", "academy", "tutor", "course", "learning",
             "training", "coaching", "online course", "exam prep", "certification"]
        ),
        (
            "digital",
            ["software", "app", "saas", "digital marketing", "web dev", "web development",
             "mobile app", "it services", "cloud", "cybersecurity", "seo", "agency"]
        ),
        (
            "food",
            ["pizza", "burger", "fast food", "chicken", "biryani", "karahi", "kabab", "tikka",
             "sajji", "gelato", "ice cream", "dessert", "sweets", "bakery", "cafe",
             "coffee", "tea", "chai", "diner", "cuisine", "grill", "restaurant",
             "waffle", "kebab", "food", "kitchen", "dhaba", "canteen", "takeaway"]
        ),
        (
            "footwear",
            ["footwear", "shoes", "sandals", "slippers", "chappal", "sole", "heels",
             "boots", "sneakers", "stylo", "ecs", "borjan", "bata", "servis", "insignia"]
        ),
        (
            "fashion",
            ["lawn", "embroidered", "kurti", "kurta", "clothing", "fashion", "apparel",
             "fabric", "pret", "suit", "shirt", "jeans", "boutique", "alkaram", "khaadi",
             "limelight", "ethnic", "outfitters", "sana safinaz", "unstitched", "textile"]
        ),
        (
            "beauty",
            ["cosmetics", "beauty", "skincare", "makeup", "herbal", "perfume",
             "fragrance", "salon", "spa", "serum", "lipstick", "lotion", "shampoo", "organic"]
        ),
        (
            "electronics",
            ["electronics", "gadget", "mobiles", "computers", "laptops", "phones",
             "devices", "camera", "earphones", "smartwatch", "ishopping"]
        ),
    ]

    # Match category — first match wins
    for cat_name, keywords in CATEGORY_KEYWORDS:
        if any(kw in name_lower or kw in type_lower or any(kw in p for p in prod_list) for kw in keywords):
            category = cat_name
            break

    # Sub-niche for food only
    if category == "food":
        if "pizza" in name_lower or any("pizza" in p for p in prod_list):
            sub_niche = "pizza"
        elif any(x in name_lower for x in ["burger", "kfc", "mcdonald", "hardee", "lab"]) or any(x in p for p in prod_list for x in ["burger", "fries"]):
            sub_niche = "burger"
        elif any(x in name_lower for x in ["gelato", "ice cream", "cream", "sweets", "swirl", "chocolate", "dessert", "chaman", "sorbet"]) or any(x in p for p in prod_list for x in ["gelato", "ice cream", "cone", "cup", "scoop"]):
            sub_niche = "dessert"
        elif any(x in name_lower for x in ["cafe", "coffee", "espresso", "latte", "cappuccino", "brew"]) or any(x in p for p in prod_list for x in ["coffee", "latte"]):
            sub_niche = "cafe"
        elif any(x in name_lower for x in ["kabab", "karahi", "kolachi", "qila", "bbq", "barbecue", "grill", "tikka", "platter", "buffet", "salt"]) or any(x in p for p in prod_list for x in ["karahi", "tikka", "kabab", "biryani"]):
            sub_niche = "desi"
        else:
            sub_niche = "generic"

    if category == "food" and sub_niche:
        candidates = list(PAKISTANI_BRANDS_DATABASE["food"][sub_niche]["brands"])
    else:
        candidates = list(PAKISTANI_BRANDS_DATABASE[category]["brands"])
        
    GENERIC_STOP_WORDS = {
        "pizza", "burger", "studio", "cosmetics", "footwear", "shoes", "cafe", "coffee", 
        "restaurant", "clothes", "clothing", "fashion", "apparel", "wear", "brand", 
        "ideas", "street", "food", "kitchen", "bakery", "bakes", "sweets", "ice", 
        "cream", "gelato", "house", "shop", "store", "lounge", "grill", "barbecue", "bbq",
        "co", "ltd", "inc"
    }

    clean_candidates = []
    for brand in candidates:
        brand_norm = brand.lower().strip()
        if brand_norm in name_lower or name_lower in brand_norm:
            continue
        brand_words = [w for w in brand_norm.replace("'", "").replace(".", "").split() if len(w) > 2 and w not in GENERIC_STOP_WORDS]
        user_words = [w for w in name_lower.replace("'", "").replace(".", "").split() if len(w) > 2 and w not in GENERIC_STOP_WORDS]
        overlap = set(brand_words) & set(user_words)
        if overlap:
            continue
        clean_candidates.append(brand)
        
    if len(clean_candidates) < 2:
        extra_fallbacks = {
            "food": ["KFC", "McDonald's", "Kababjees", "Broadway Pizza"],
            "fashion": ["Khaadi", "Sapphire", "Gul Ahmed", "Limelight"],
            "footwear": ["Stylo", "ECS", "Borjan", "Bata"],
            "beauty": ["Saeed Ghani", "J. Cosmetics", "Hemani", "Conatural"],
            "electronics": ["Daraz", "Telemart", "iShopping.pk"],
            "automotive": ["Toyota IMC", "Honda Atlas Cars", "Suzuki Pakistan", "Hyundai Nishat", "Kia Lucky Motors"],
            "health_fitness": ["GNC Pakistan", "Nutrifactor", "Shredded PK", "Herbion Pakistan"],
            "home_furniture": ["Interwood", "Habitt", "Dawlance", "Haier Pakistan"],
            "grocery": ["Imtiaz Super Market", "Carrefour Pakistan", "Metro Cash & Carry"],
            "real_estate": ["Zameen.com", "Bahria Town", "DHA Pakistan"],
            "jewelry": ["PC Jewellers", "Gold Souk Pakistan", "Sakura Jewels"],
            "travel": ["Airblue", "PIA (Pakistan Airlines)", "Waada Travel"],
            "education": ["Coursera Pakistan", "Sabaq Foundation", "Iqra University"],
            "digital": ["Systems Limited", "NetSol Technologies", "Gaditek"],
            "generic": ["Daraz", "Telemart", "Yayvo", "Shoppingbag.pk"]
        }
        for fb in extra_fallbacks.get(category, extra_fallbacks["generic"]):
            if fb not in clean_candidates and fb.lower().strip() != name_lower and fb.lower().strip() not in name_lower and name_lower not in fb.lower().strip():
                clean_candidates.append(fb)
                if len(clean_candidates) >= 2:
                    break

    comp_a = clean_candidates[0]
    comp_b = clean_candidates[1]
    
    # Resolve Color — merged known brand colors
    KNOWN_COLORS = {
        # Fashion
        "alkaram": "#6B2737", "sapphire": "#2A2A72", "khaadi": "#8C1D40",
        "limelight": "#2E7D32", "gul ahmed": "#0D47A1", "ideas": "#0D47A1",
        "sana safinaz": "#880E4F", "ethnic": "#6B2737", "outfitters": "#2C3E50",
        "j.": "#1C1C1C", "junaid jamshed": "#1C1C1C", "bonanza": "#AD1457", "satrangi": "#AD1457",
        # Footwear
        "stylo": "#E91E63", "ecs": "#4A148C", "borjan": "#795548",
        "bata": "#D50000", "servis": "#0D47A1", "insignia": "#D4AF37",
        # Food
        "kababjees": "#A32C2C", "kolachi": "#2C3E50", "lal qila": "#8B0000",
        "bar.b.q tonight": "#1C2833", "salt'n pepper": "#D35400",
        "broadway": "#C0392B", "domino": "#006491", "pizza hut": "#E4002B",
        "14th street": "#F2A900", "kfc": "#E4002B", "mcdonald": "#FFC72C",
        "burger lab": "#000000", "burger o": "#D35400", "hardee": "#FFC72C",
        "soft swirl": "#FF69B4", "alpine gelato": "#5D8AA8", "chaman": "#FF8C00",
        "lal's": "#4A2711", "baskin": "#FF69B4", "gloria jean": "#4E3629",
        "espresso": "#1C1C1C", "second cup": "#800000", "butlers": "#D4AF37",
        # Beauty
        "saeed ghani": "#2E7D32", "hemani": "#1B5E20", "conatural": "#E91E63",
        # Electronics / eComm
        "daraz": "#FF5722", "telemart": "#0D47A1",
        # Automotive
        "toyota": "#EB0A1E", "honda": "#CC0000", "suzuki": "#004B8D",
        "hyundai": "#002C5F", "kia": "#BB162B", "changan": "#C8102E",
        "mg motors": "#1D1D1B", "dfsk": "#00529B",
        # Real estate
        "zameen": "#E53935", "bahria": "#1565C0", "dha": "#1B5E20",
        # Grocery
        "imtiaz": "#E53935", "carrefour": "#1565C0", "metro": "#C62828",
    }

    brand_color = None
    for brand_key, hex_code in KNOWN_COLORS.items():
        if brand_key in name_lower:
            brand_color = hex_code
            break
    if not brand_color:
        default_colors = {
            "food": "#E4002B",
            "fashion": "#6B2737",
            "footwear": "#E91E63",
            "beauty": "#2E7D32",
            "electronics": "#FF5722",
            "automotive": "#1D1D1B",
            "health_fitness": "#E53935",
            "home_furniture": "#3E2723",
            "grocery": "#E53935",
            "real_estate": "#1565C0",
            "jewelry": "#F9A825",
            "travel": "#003087",
            "education": "#0056D2",
            "digital": "#0D47A1",
            "generic": "#0A84FF"
        }
        brand_color = default_colors.get(category, "#0A84FF")

    def get_brand_deal(brand_name):
        b_norm = brand_name.lower().strip()
        # Food has nested sub-niches
        if category == "food":
            for sn in PAKISTANI_BRANDS_DATABASE["food"]:
                deals_dict = PAKISTANI_BRANDS_DATABASE["food"][sn].get("deals", {})
                for bk, deal in deals_dict.items():
                    if bk in b_norm or b_norm in bk:
                        return deal
        else:
            cat_data = PAKISTANI_BRANDS_DATABASE.get(category, {})
            deals_dict = cat_data.get("deals", {})
            for bk, deal in deals_dict.items():
                if bk in b_norm or b_norm in bk:
                    return deal
        # Smart default — no lazy discounts
        CATEGORY_DEAL_DEFAULTS = {
            "automotive": f"{brand_name}: New Model Launch — Book Now & Get Free 3-Year Extended Warranty!",
            "health_fitness": f"{brand_name}: New Supplement Stack — Free Shaker Bottle with First Order!",
            "home_furniture": f"{brand_name}: Home Makeover Sale — Free Installation & Delivery on Orders Above Rs. 50,000",
            "grocery": f"{brand_name}: Weekend Fresh Deal — Complimentary Free Home Delivery on Orders Above Rs. 3,000",
            "real_estate": f"{brand_name}: New Project Launch — 0% Agent Commission + Free Legal Consultation",
            "jewelry": f"{brand_name}: Bridal Season Special — Free Making Charges on All Gold Purchases!",
            "travel": f"{brand_name}: Exclusive Tour Package — Free Travel Insurance with Every International Booking",
            "education": f"{brand_name}: Semester Enrollment — Merit-Based Scholarship Up to 50% on Fees",
            "digital": f"{brand_name}: New Client Offer — Free Audit + First Sprint at No Cost",
            "fashion": f"{brand_name}: New Collection Launch — Free Dupatta with Every Unstitched Suit Purchase",
            "footwear": f"{brand_name}: New Season Arrivals — Free Premium Care Kit with Every Pair",
            "beauty": f"{brand_name}: Skincare Bundle — Free Travel-Sized Serum with Orders Above Rs. 2,500",
            "electronics": f"{brand_name}: Tech Bundle Deal — Free Premium Accessories with Every Device Purchase",
        }
        return CATEGORY_DEAL_DEFAULTS.get(category, f"{brand_name}: Exclusive Limited-Time Value Bundle — Premium Quality, Unbeatable Value!")


    deal_a = get_brand_deal(comp_a)
    deal_b = get_brand_deal(comp_b)
    
    return {
        "category": category,
        "sub_niche": sub_niche,
        "comp_a": comp_a,
        "comp_b": comp_b,
        "brand_color": brand_color,
        "deal_a": deal_a,
        "deal_b": deal_b
    }


def extract_deal_from_snippets(snippets: list, default_deal: str) -> str:
    """Extract active promotional deals from search snippets dynamically."""
    if not snippets:
        return default_deal
        
    import re
    keywords = [
        r"\b\d+%\s+off\b", r"\b\d+%\s+discount\b", r"flat\s+\d+%\b", r"up\s+to\s+\d+%\s+off\b",
        r"\bsale\b", r"\boffer\b", r"\bdeal\b", r"\bdiscount\b", r"\bpromo\b", r"buy\s+\d+\s+get\s+\d+\b",
        r"rs\.\s*\d+", r"free\s+delivery", r"clearance"
    ]
    
    for s in snippets:
        snippet_text = s.get("snippet", s.get("body", ""))
        if not snippet_text:
            continue
            
        found_words = []
        for kw in keywords:
            matches = re.findall(kw, snippet_text, re.IGNORECASE)
            if matches:
                found_words.extend(matches)
                
        if found_words:
            sentences = re.split(r'[.!?]', snippet_text)
            for sentence in sentences:
                if any(re.search(kw, sentence, re.IGNORECASE) for kw in keywords):
                    cleaned_sentence = sentence.strip()
                    if len(cleaned_sentence) > 10 and len(cleaned_sentence) < 90:
                        cleaned_sentence = re.sub(r"^[^a-zA-Z0-9]+|[^a-zA-Z0-9%!]+$", "", cleaned_sentence)
                        return f"Active Promotion: {cleaned_sentence}!"
                    elif len(cleaned_sentence) >= 90:
                        return f"Active Sale: {cleaned_sentence[:87]}..."
                        
    return default_deal


def generate_competitor_impact(category: str, competitor_name: str) -> str:
    impacts = {
        "food": [
            f"Heavy office footfall and dinner queues observed at {competitor_name} outlets in DHA and Gulberg.",
            f"Significant surge in {competitor_name} online delivery volumes via Foodpanda due to active deals.",
            f"Strong consumer preference shifting toward {competitor_name} due to attractive family combo pricing."
        ],
        "fashion": [
            f"High retail store footfall at premium shopping malls driven by {competitor_name} clearance sale.",
            f"Heavy online orders and rapid e-store stockouts of {competitor_name} unstitched lawn collections.",
            f"Aggressive social media influencer campaigns by {competitor_name} boosting digital pret conversions."
        ],
        "footwear": [
            f"Steep increase in customer walk-ins at {competitor_name} retail outlets for new seasonal footwear.",
            f"Strong online engagement driven by {competitor_name} flat discount promos on bridal & casual ranges.",
            f"Shift in consumer loyalty as {competitor_name} introduces aggressive warranty and exchange deals."
        ],
        "beauty": [
            f"Spike in web orders for {competitor_name} organic skincare serums and herbal combo packs.",
            f"Strong market penetration in urban centers as {competitor_name} scales up modern retail kiosks.",
            f"Heavy digital traction driven by {competitor_name} beauty collection discounts."
        ],
        "electronics": [
            f"Massive transaction surge on e-commerce platforms due to {competitor_name} bank discount partnership.",
            f"High search volume and buyer interest in {competitor_name} premium product range."
        ],
        "automotive": [
            f"Surge in showroom walk-ins as {competitor_name} launches a new limited-edition variant with free 3-year warranty.",
            f"High pre-booking demand for {competitor_name}'s latest SUV/sedan driven by 0% bank financing campaigns.",
            f"{competitor_name} digital ads dominating automotive search traffic across Karachi, Lahore & Islamabad."
        ],
        "health_fitness": [
            f"Strong social media traction for {competitor_name} fuelled by fitness influencer supplement reviews.",
            f"Rising online supplement orders from {competitor_name} due to aggressive bundle pricing campaigns."
        ],
        "home_furniture": [
            f"High footfall at {competitor_name} flagship stores driven by summer home makeover promotions.",
            f"Strong online orders for {competitor_name} home appliance bundles on bank EMI installment deals."
        ],
        "grocery": [
            f"Strong weekend shoppers shifting to {competitor_name} due to weekly fresh produce discount deals.",
            f"Rising basket sizes at {competitor_name} driven by bulk-buy and loyalty card promotions."
        ],
        "real_estate": [
            f"High inquiry volumes for {competitor_name} projects driven by 0% commission launch campaigns.",
            f"Rising digital leads for {competitor_name} residential projects via targeted social media ads."
        ],
        "jewelry": [
            f"Strong bridal season footfall at {competitor_name} driven by complimentary making-charge offers.",
            f"High social media engagement for {competitor_name} gold collection driven by wedding season campaigns."
        ],
        "travel": [
            f"Surge in flight bookings via {competitor_name} driven by flash-seat limited-time fare promotions.",
            f"Growing package tour bookings from {competitor_name} due to Umrah/holiday bundle deals."
        ],
        "education": [
            f"Strong course enrollment growth at {competitor_name} driven by scholarship and free-trial campaigns.",
            f"Rising student registrations for {competitor_name} programs due to peer referral incentives."
        ],
        "digital": [
            f"Increasing project wins by {competitor_name} driven by first-sprint-free and free-audit campaigns.",
            f"Growing retainer clients for {competitor_name} due to outcome-based pricing model promotions."
        ],
        "generic": [
            f"Significant shift in consumer footfall as {competitor_name} rolls out flat flash discount offers.",
            f"Growing digital market share due to {competitor_name} nationwide free shipping campaigns."
        ]
    }
    
    options = impacts.get(category, impacts["generic"])
    idx = sum(ord(c) for c in competitor_name) % len(options)
    return options[idx]


def _classify_insight_niche(category: str, products: list) -> dict:
    """
    Universal niche classifier for counter-insight generation.
    Works dynamically for ANY business type or product list.
    Returns bundle_idea, aov_play, and positioning_angle based on actual product signals.
    """
    all_text = (category + " " + " ".join(products or [])).lower()

    NICHE_SIGNALS = [
        {
            "signals": ["pizza", "burger", "fries", "wrap", "shawarma", "hotdog", "sandwich", "zinger"],
            "bundle_idea": "a 'Complete Meal Deal' (signature item + side + beverage at one unified premium price)",
            "aov_play": "offer a complimentary premium sauce or drink upgrade for orders above a family-size threshold",
            "angle": "complete meal value vs. competitor single-item discounts",
        },
        {
            "signals": ["karahi", "biryani", "kabab", "tikka", "bbq", "nihari", "naan", "roti", "haleem", "desi"],
            "bundle_idea": "a premium 'Family Desi Platter' featuring signature items",
            "aov_play": "add a complimentary dessert or mint lemonade pitcher for dine-in tables above a spend threshold",
            "angle": "premium home-style cooking experience vs. generic commercial discounts",
        },
        {
            "signals": ["coffee", "tea", "chai", "latte", "cappuccino", "cold brew", "smoothie", "juice", "frappe"],
            "bundle_idea": "a 'Brew & Bite' bundle (premium beverage + artisanal bakery item during off-peak hours)",
            "aov_play": "introduce a loyalty stamp card — every 5th premium drink free",
            "angle": "recurring routine and daily habit building vs. one-time discount traffic",
        },
        {
            "signals": ["ice cream", "gelato", "waffle", "cake", "dessert", "brownie", "chocolate", "sweets", "mithai"],
            "bundle_idea": "a curated 'Signature Dessert Box' (2-item mix in premium branded packaging)",
            "aov_play": "add a 'Surprise Sweet' gift upgrade for orders above a premium value threshold",
            "angle": "impulse-trigger premium gifting experience vs. simple scoop-price cuts",
        },
        {
            "signals": ["lawn", "kurta", "kurti", "dupatta", "shalwar", "kameez", "unstitched", "stitched", "fabric", "linen", "chiffon", "silk"],
            "bundle_idea": "a 'Complete Style Set' (shirt + trouser + dupatta packaged as a ready-to-wear look)",
            "aov_play": "unlock a free matching accessory for orders above a premium outfit price point",
            "angle": "curated outfit convenience vs. competitor clearance-sale price wars",
        },
        {
            "signals": ["shoe", "shoes", "sandal", "sneaker", "boot", "heel", "chappal", "slipper", "loafer"],
            "bundle_idea": "a 'Step Premium Bundle' (pair + matching bag or care kit at a unified price)",
            "aov_play": "include a free premium shoe care kit with every pair purchased above a threshold",
            "angle": "daily comfort, durability, and handcraft quality vs. generic clearance volume sales",
        },
        {
            "signals": ["serum", "moisturizer", "foundation", "lipstick", "cream", "face wash", "toner", "skincare", "makeup", "cosmetic", "beauty", "organic", "perfume"],
            "bundle_idea": "a '3-Step Glow Regimen Kit' (cleanser + serum + moisturizer in premium packaging)",
            "aov_play": "add a complimentary travel-sized product for orders exceeding a target cart value",
            "angle": "complete skincare routine investment vs. competitor single-product serum sales",
        },
        {
            "signals": ["phone", "laptop", "tablet", "earphones", "speaker", "ac", "fan", "fridge", "tv", "electronics", "gadget", "tech"],
            "bundle_idea": "a 'Tech Care Package' (device + premium accessories + extended in-store warranty)",
            "aov_play": "offer a free 6-month store warranty on every high-ticket item purchase",
            "angle": "reliability, trust, and peace of mind vs. competitor bank-partnership discount wars",
        },
        {
            "signals": ["gym", "protein", "supplement", "workout", "yoga", "sport", "activewear", "fitness"],
            "bundle_idea": "a 'Training Starter Bundle' (protein + shaker + printed workout guide)",
            "aov_play": "include a free nutrition consultation session for purchases above a premium threshold",
            "angle": "transformation outcomes and results vs. competitor supplement price-cutting",
        },
    ]

    for niche in NICHE_SIGNALS:
        if any(sig in all_text for sig in niche["signals"]):
            return niche

    # Universal fallback — works for literally any business type not in the map
    return {
        "bundle_idea": "a curated value bundle (your bestselling product + a complementary low-cost add-on)",
        "aov_play": "a premium free service upgrade or gift for orders above a high-value threshold",
        "angle": "superior quality, personalization, and local trust vs. competitor generic flash sales",
    }


def generate_counter_insight(business_name: str, category: str, comp_a: str, comp_b: str, products: list = None) -> str:
    """
    Universal, fully dynamic counter-insight generator.
    Works for ANY business type — zero hardcoded brand, category, or product references.
    Strategies are derived purely from the registered products list + category signal matching.
    """
    prod_list = products or []
    prod_str = ", ".join(prod_list) if prod_list else "your core products"

    niche = _classify_insight_niche(category, prod_list)
    bundle_idea = niche["bundle_idea"]
    aov_play = niche["aov_play"]
    angle = niche["angle"]

    return (
        f"⚡ Strategic Intelligence Report for {business_name}\n\n"
        f"While {comp_a} and {comp_b} are aggressively executing margin-draining discount campaigns, "
        f"{business_name} has a clear opportunity to outflank them with a high-margin counter-play.\n\n"
        f"🎯 RECOMMENDED MOVE — Launch {bundle_idea} built around your core offering: {prod_str}.\n\n"
        f"📈 AOV BOOSTER — {aov_play.capitalize()}. "
        f"This drives customers to self-upgrade their order size voluntarily, growing your revenue per transaction "
        f"without touching your core price points.\n\n"
        f"💡 POSITIONING ADVANTAGE — Focus all marketing communication on {angle}. "
        f"Customers who perceive {business_name} as a premium, high-value brand will never switch to a competitor "
        f"simply because they ran a discount. Build that brand loyalty now, before the next competitor promotion hits."
    )


@app.get("/api/competitors/live")
async def get_live_competitor_insights(business_name: str, business_type: Optional[str] = None):
    """Retrieve live tracking insights on closest competitors in Pakistan.
    Uses a bulletproof local vertical resolver with multi-layered fallbacks (keyless DuckDuckGo search library & curated database),
    and returns a tailored premium brand_color override.
    """
    # ── Step 1: Load registered user context ─────────────────────────────────
    users = load_users()
    matched_user = None
    for u in users.values():
        u_name = u.get("business_name", "").lower().strip()
        search_name = business_name.lower().strip()
        if u_name == search_name or search_name in u_name or u_name in search_name:
            matched_user = u
            break

    raw_type = business_type or (matched_user.get("business_type") if matched_user else "generic") or "generic"
    products = matched_user.get("products", []) if matched_user else []
    
    # ── Step 2: Run Local Specialized Matcher ─────────────────────────────────
    resolved = resolve_competitors_locally(business_name, raw_type, products)
    resolved_category = resolved["category"]
    comp_a = resolved["comp_a"]
    comp_b = resolved["comp_b"]
    brand_color = matched_user.get("brand_color") if (matched_user and matched_user.get("brand_color")) else resolved["brand_color"]
    default_deal_a = resolved["deal_a"]
    default_deal_b = resolved["deal_b"]

    print(f"[main] Resolved Category locally for '{business_name}': '{resolved_category}'")
    print(f"[main] Competitors resolved: {comp_a} vs {comp_b}")

    # ── Step 3: Live search for each competitor (uses Google custom search or free DuckDuckGo keyless scraper) ──
    from services.search_service import search_competitor_ads
    try:
        import asyncio
        snippets_a, snippets_b = await asyncio.gather(
            search_competitor_ads(comp_a),
            search_competitor_ads(comp_b)
        )
    except Exception as e:
        print(f"[main] Competitor live search error: {e}")
        snippets_a, snippets_b = [], []

    # ── Step 4: Parse active deals from live snippets ─────────────────────────
    deal_a = extract_deal_from_snippets(snippets_a, default_deal_a)
    deal_b = extract_deal_from_snippets(snippets_b, default_deal_b)

    # ── Step 5: Construct beautiful local insights structure ───────────────────
    fallback_a = {
        "name": comp_a,
        "active_deal": deal_a,
        "impact": generate_competitor_impact(resolved_category, comp_a)
    }
    fallback_b = {
        "name": comp_b,
        "active_deal": deal_b,
        "impact": generate_competitor_impact(resolved_category, comp_b)
    }
    
    insights = {}
    
    # ── Step 6: Attempt Gemini Synthesis if API credits are available ─────────
    try:
        from services.ai_service import analyze_competitors_live_with_gemini
        insights = analyze_competitors_live_with_gemini(
            business_name=business_name,
            business_type=resolved_category,
            competitor_a=comp_a,
            competitor_b=comp_b,
            snippets_a=snippets_a,
            snippets_b=snippets_b,
            products=products
        )
    except Exception as e:
        print(f"[main] Gemini live synthesis failed: {e}")
        
    # ── Step 7: Inject local fallback if Gemini was down/exhausted ───────────
    if not insights:
        insights = {
            "competitorA": fallback_a,
            "competitorB": fallback_b,
            "ai_counter_insight": generate_counter_insight(business_name, resolved_category, comp_a, comp_b, products)
        }
    else:
        # Guarantee real names & brand color from local system even if LLM hallucinated names
        if not insights.get("competitorA") or not insights["competitorA"].get("name") or "Competitor" in insights["competitorA"]["name"]:
            insights["competitorA"] = fallback_a
        if not insights.get("competitorB") or not insights["competitorB"].get("name") or "Competitor" in insights["competitorB"]["name"]:
            insights["competitorB"] = fallback_b

    # Emit the tailored brand_color directly into the payload for the frontend
    insights["brand_color"] = brand_color

    return insights


@app.get("/api/scenarios")
def get_scenarios():
    scenarios = []
    mock_dir = "mock_data"
    if os.path.exists(mock_dir):
        for f in os.listdir(mock_dir):
            if f.endswith(".json"):
                with open(os.path.join(mock_dir, f), "r") as file:
                    data = json.load(file)
                    scenarios.append({"id": data.get("scenario_id"), "name": data.get("name")})
    return {"scenarios": scenarios}

@app.post("/api/load-scenario/{scenario_id}")
def load_scenario(scenario_id: str):
    mock_dir = "mock_data"
    if os.path.exists(mock_dir):
        for f in os.listdir(mock_dir):
            if f.endswith(".json"):
                with open(os.path.join(mock_dir, f), "r", encoding="utf-8") as file:
                    data = json.load(file)
                    if data.get("scenario_id") == scenario_id:
                        return data
    raise HTTPException(status_code=404, detail="Scenario not found")

@app.get("/api/trace/{job_id}")
def get_trace(job_id: str):
    # Fallback to load from file if not in trace_store (e.g. backend restart)
    if job_id not in trace_store:
        filepath = TRACE_DIR / f"{job_id}.json"
        if filepath.exists():
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    trace_store[job_id] = json.load(f)
            except Exception as e:
                print(f"[main] Failed to load trace from disk: {e}")
                
    if job_id not in trace_store:
        raise HTTPException(status_code=404, detail="Trace not found")
        
    return {
        "job_id": job_id, 
        "logs": trace_store.get(job_id, []), 
        "trace": trace_store.get(job_id, [])
    }
