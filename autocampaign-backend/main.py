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
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
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
    
    food_keywords = [
        "pizza", "burger", "fast food", "chicken", "biryani", "karahi", "kabab", "tikka", 
        "sajji", "gelato", "ice cream", "dessert", "sweets", "bakery", "bakes", "cafe", 
        "coffee", "tea", "chai", "diner", "cuisine", "grill", "restaurant", "diner", 
        "waffle", "kebab", "roll", "shack", "bites", "swirl", "food", "kitchen", "cafe", 
        "dhaba", "canteen", "culinary", "dine-in", "takeaway"
    ]
    
    fashion_keywords = [
        "lawn", "embroidered", "kurti", "kurta", "clothing", "fashion", "apparel", "wear", 
        "fabric", "pret", "studio", "suit", "shirt", "jeans", "boutique", "brand", "sapphire", 
        "khaadi", "alkaram", "limelight", "ethnic", "outfitters", "j.", "bonanza", "satrangi", 
        "sana safinaz", "nishat", "gulahmed", "ideas", "unstitched", "pret", "textile"
    ]
    
    footwear_keywords = [
        "footwear", "shoes", "sandals", "slippers", "chappal", "sole", "heels", "boots", 
        "sneakers", "stylo", "ecs", "borjan", "bata", "servis", "insignia"
    ]
    
    beauty_keywords = [
        "cosmetics", "beauty", "skincare", "makeup", "herbal", "ghani", "hemani", "perfume", 
        "fragrance", "salon", "spa", "rose water", "aloe vera", "cream", "serum", "oil", 
        "lipstick", "lotion", "shampoo", "organic"
    ]
    
    electronics_keywords = [
        "electronics", "tech", "gadget", "mobiles", "computers", "laptops", "phones", 
        "devices", "accessories", "camera", "ishopping", "telemart", "daraz"
    ]
    
    is_food = False
    is_fashion = False
    is_footwear = False
    is_beauty = False
    is_electronics = False
    
    for kw in food_keywords:
        if kw in name_lower or kw in type_lower or any(kw in p for p in prod_list):
            is_food = True
            break
            
    if not is_food:
        for kw in footwear_keywords:
            if kw in name_lower or kw in type_lower or any(kw in p for p in prod_list):
                is_footwear = True
                break
                
    if not is_food and not is_footwear:
        for kw in fashion_keywords:
            if kw in name_lower or kw in type_lower or any(kw in p for p in prod_list):
                is_fashion = True
                break
                
    if not is_food and not is_footwear and not is_fashion:
        for kw in beauty_keywords:
            if kw in name_lower or kw in type_lower or any(kw in p for p in prod_list):
                is_beauty = True
                break
                
    if not is_food and not is_footwear and not is_fashion and not is_beauty:
        for kw in electronics_keywords:
            if kw in name_lower or kw in type_lower or any(kw in p for p in prod_list):
                is_electronics = True
                break

    if is_food:
        category = "food"
        if "pizza" in name_lower or any("pizza" in p for p in prod_list):
            sub_niche = "pizza"
        elif any(x in name_lower for x in ["burger", "kfc", "mcdonald", "hardee", "lab"]) or any(x in p for p in prod_list for x in ["burger", "fries"]):
            sub_niche = "burger"
        elif any(x in name_lower for x in ["gelato", "ice cream", "cream", "sweets", "swirl", "chocolate", "dessert", "chaman", "sorbet"]) or any(x in p for p in prod_list for x in ["gelato", "ice cream", "cone", "cup", "scoop"]):
            sub_niche = "dessert"
        elif any(x in name_lower for x in ["cafe", "coffee", "espresso", "latte", "cappuccino", "brew", "jeans"]) or any(x in p for p in prod_list for x in ["coffee", "latte"]):
            sub_niche = "cafe"
        elif any(x in name_lower for x in ["kabab", "karahi", "kolachi", "qila", "bbq", "barbecue", "grill", "tikka", "platter", "buffet", "salt"]) or any(x in p for p in prod_list for x in ["karahi", "tikka", "kabab", "biryani"]):
            sub_niche = "desi"
        else:
            sub_niche = "generic"
    elif is_footwear:
        category = "footwear"
    elif is_fashion:
        category = "fashion"
    elif is_beauty:
        category = "beauty"
    elif is_electronics:
        category = "electronics"
    else:
        category = "generic"

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
            "generic": ["Daraz", "Telemart", "Yayvo", "Shoppingbag.pk"]
        }
        for fb in extra_fallbacks.get(category, extra_fallbacks["generic"]):
            if fb not in clean_candidates and fb.lower().strip() != name_lower and fb.lower().strip() not in name_lower and name_lower not in fb.lower().strip():
                clean_candidates.append(fb)
                if len(clean_candidates) >= 2:
                    break

    comp_a = clean_candidates[0]
    comp_b = clean_candidates[1]
    
    # Resolve Color
    KNOWN_COLORS = {
        "alkaram": "#6B2737",
        "sapphire": "#2A2A72",
        "khaadi": "#8C1D40",
        "limelight": "#2E7D32",
        "gul ahmed": "#0D47A1",
        "ideas": "#0D47A1",
        "sana safinaz": "#880E4F",
        "ethnic": "#6B2737",
        "outfitters": "#2C3E50",
        "j.": "#1C1C1C",
        "junaid jamshed": "#1C1C1C",
        "bonanza": "#AD1457",
        "satrangi": "#AD1457",
        "stylo": "#E91E63",
        "ecs": "#4A148C",
        "borjan": "#795548",
        "bata": "#D50000",
        "servis": "#0D47A1",
        "insignia": "#D4AF37",
        "kababjees": "#A32C2C",
        "kolachi": "#2C3E50",
        "lal qila": "#8B0000",
        "bar.b.q tonight": "#1C2833",
        "salt'n pepper": "#D35400",
        "broadway": "#C0392B",
        "domino": "#006491",
        "pizza hut": "#E4002B",
        "14th street": "#F2A900",
        "kfc": "#E4002B",
        "mcdonald": "#FFC72C",
        "burger lab": "#000000",
        "burger o": "#D35400",
        "hardee": "#FFC72C",
        "soft swirl": "#FF69B4",
        "alpine gelato": "#5D8AA8",
        "chaman": "#FF8C00",
        "lal's": "#4A2711",
        "baskin": "#FF69B4",
        "gloria jean": "#4E3629",
        "espresso": "#1C1C1C",
        "second cup": "#800000",
        "butlers": "#D4AF37",
        "saeed ghani": "#2E7D32",
        "hemani": "#1B5E20",
        "conatural": "#E91E63",
        "daraz": "#FF5722",
        "telemart": "#0D47A1",
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
            "generic": "#0A84FF"
        }
        brand_color = default_colors.get(category, "#0A84FF")

    def get_brand_deal(brand_name):
        b_norm = brand_name.lower().strip()
        if category == "food":
            for sn in PAKISTANI_BRANDS_DATABASE["food"]:
                deals_dict = PAKISTANI_BRANDS_DATABASE["food"][sn]["deals"]
                for bk, deal in deals_dict.items():
                    if bk in b_norm or b_norm in bk:
                        return deal
        else:
            deals_dict = PAKISTANI_BRANDS_DATABASE[category]["deals"]
            for bk, deal in deals_dict.items():
                if bk in b_norm or b_norm in bk:
                    return deal
        return f"Exclusive Promo: Flat 20% OFF on all hot items at {brand_name}!"

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
        "generic": [
            f"Significant shift in consumer footfall as {competitor_name} rolls out flat flash discount offers.",
            f"Growing digital market share due to {competitor_name} nationwide free shipping campaigns."
        ]
    }
    
    options = impacts.get(category, impacts["generic"])
    idx = sum(ord(c) for c in competitor_name) % len(options)
    return options[idx]


def generate_counter_insight(business_name: str, category: str, comp_a: str, comp_b: str) -> str:
    insights = {
        "food": f"Direct competitors {comp_a} and {comp_b} are locking in loyal dining customers via high-frequency bundle discounts in premium areas. To defend {business_name}'s market share, instantly deploy a targeted weekend meal platter discount (e.g. 15% OFF) or a free appetizer deal. Pair this with micro-targeted social media ads focusing on your signature taste, quality, and quick service to re-divert footfall.",
        "fashion": f"Your local fashion competitors {comp_a} and {comp_b} are aggressively pulling footfall with flat seasonal discounts (up to 50% OFF) on unstitched and ready-to-wear lines. {business_name} must counter with a highly curated 'Buy 2 Get 1 FREE' bundle promotion on kurtas/kurtis or a flat 20% launch discount. Boost conversions using premium aesthetics on Instagram/TikTok emphasizing limited-time fabric quality.",
        "footwear": f"With {comp_a} and {comp_b} drawing high-volume footfall through footwear clearance deals, {business_name} must act immediately. Launch a mid-season footwear promo (e.g. flat Rs. 1000 off or 20% OFF) highlighting hand-crafted durability and supreme walking comfort. Scale up local visibility via localized digital ad spend near competing storefronts.",
        "beauty": f"Skincare/beauty brands {comp_a} and {comp_b} are winning market share by capitalizing on organic and herbal product bundles. {business_name} should deploy a customized combo offer (e.g. Cleanser + Serum bundle with free shipping) and target skin-conscious shoppers online. Highlight your natural ingredients and premium packaging to stand out.",
        "electronics": f"Electronics competitors {comp_a} and {comp_b} are driving high conversions with card-specific bank partnerships. {business_name} should introduce limited-time bundle upgrades or free accessory add-ons to boost your premium value proposition.",
        "generic": f"Rivals {comp_a} and {comp_b} are executing aggressive flash sales. {business_name} can counter-attack by focusing on high-end personalization, zero-delivery fees, and limited-duration coupon codes to create instant purchase urgency."
    }
    return insights.get(category, insights["generic"])


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
            snippets_b=snippets_b
        )
    except Exception as e:
        print(f"[main] Gemini live synthesis failed: {e}")
        
    # ── Step 7: Inject local fallback if Gemini was down/exhausted ───────────
    if not insights:
        insights = {
            "competitorA": fallback_a,
            "competitorB": fallback_b,
            "ai_counter_insight": generate_counter_insight(business_name, resolved_category, comp_a, comp_b)
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
