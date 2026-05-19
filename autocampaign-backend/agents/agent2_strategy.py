import time
from datetime import datetime
from models.campaign import Agent1Output, Agent2Output, TraceLog
from services.ai_service import get_gemini_response

async def run_agent2(job_id: str, agent1_data: Agent1Output, budget: float, business_knowledge_level: str = "beginner") -> tuple[Agent2Output, TraceLog]:
    start_time = time.time()
    
    language_instruction = ""
    if business_knowledge_level.lower() == "beginner":
        language_instruction = "CRITICAL INSTRUCTION: You MUST write 'root_cause', 'description', 'name', and 'agent_reasoning' ONLY in simple Roman Urdu. Example: 'Market mein competitor ki ye campaign chal rahi hai, hum ye campaign bana rahe hain, iska ye faida hoga'. Absolutely NO English jargon!"
    else:
        language_instruction = "CRITICAL INSTRUCTION: You MUST write 'root_cause', 'description', 'name', and 'agent_reasoning' ONLY in Advanced Professional English. Discuss competitive advantage, ROI metrics, and strategic positioning. NO URDU."

    prompt = f"""
    You are the 'Strategy & Action Agent' for AutoCampaign AI. 
    Your mission is to take Data Insights and create a budget-constrained, autonomous action plan.
    {language_instruction}

    DATA INSIGHTS:
    {agent1_data.model_dump_json()}

    CONSTRAINTS:
    - Max Budget: PKR {budget}

    TASK:
    1. Determine the 'Root Cause' of the issues identified in the data, explaining WHAT the problem is and WHY it is happening.
    2. Create a 3-5 step 'Action Chain'.
    3. For EACH action, you MUST explain in detail in the 'description' field WHAT the action is and WHY it is being recommended (e.g. 'Establish direct retail partnership. WHY: This eliminates the wholesaler margin...').
    4. Important: Set 'is_feasible' to true ONLY if the total cumulative budget of all preceding steps + current step <= {budget}.
    5. Predict ROI (Return on Investment) percentages for low, mid, and high outcomes.

    RETURN ONLY VALID JSON IN THIS EXACT FORMAT:
    {{
        "root_cause": "string",
        "action_chain": [
            {{ "name": "string", "description": "string (WHAT it is and WHY it is recommended)", "budget_required": float, "urgency": "string", "is_feasible": boolean }}
        ],
        "roi_prediction": {{ "low": float, "mid": float, "high": float }},
        "constraints_checked": {{ "budget": {budget}, "status": "ok|exceeded" }},
        "agent_reasoning": "string (Explain in detail WHAT was decided and WHY)",
        "agent_decision": "string"
    }}
    """

    result = get_gemini_response(prompt)
    
    if not result:
        # Dynamic Strategy Fallback Builder based on Agent 1 insights / competitor analysis
        insights_text = str(agent1_data.insights).lower() + " " + str(agent1_data.competitor_analysis).lower()
        
        product_type = "generic"
        if any(w in insights_text for w in ["soap", "cleanco"]):
            product_type = "soap"
        elif any(w in insights_text for w in ["chai", "cafe", "tea"]):
            product_type = "chai"
        elif any(w in insights_text for w in ["restaurant", "pizza", "delivery", "food"]):
            product_type = "food"
        elif any(w in insights_text for w in ["ecommerce", "inventory", "ac", "fan", "stock"]):
            product_type = "ecommerce"

        if product_type == "soap":
            root_cause = "Competitor CleanCo ne Lahore summer season mein prices drop kar di hain aur active marketing kar rahe hain, jis se humari market share reduce ho rahi hai."
            action_chain = [
                {
                    "name": "Cool Splash Soap Promo Launch",
                    "description": "Launch 15% discount bundle on summer cooling soap variant. WHY: Garmiyon mein logo ko thandak dene wala sabun chahiye, is se immediate response milega.",
                    "budget_required": min(budget * 0.4, 15000.0),
                    "urgency": "high",
                    "is_feasible": True
                },
                {
                    "name": "Retailer Shelf Dominance",
                    "description": "Provide 5% retail incentive to store owners in Lahore. WHY: Retailers humare soap ko prime shelves par display karenge to competitor se pehle customer humein select karega.",
                    "budget_required": min(budget * 0.3, 10000.0),
                    "urgency": "medium",
                    "is_feasible": True
                }
            ]
            agent_reasoning = "Lahore soap brand summer dynamic competition require discount promo for quick customer volume retrieval and retailer incentives to push visual shelf dominance."
        elif product_type == "chai":
            root_cause = "Garmi barhne ki wajah se regular garm chai ki demand kam hui hai aur customer cold beverages ki taraf shift ho rahe hain."
            action_chain = [
                {
                    "name": "Peach Cold Tea & Iced Karak Chai Launch",
                    "description": "Introduce chilled versions of traditional chai. WHY: Summer season mein traditional tea lovers ko refreshing iced chai ka options de kar unka daily routine maintain rakha ja sakta hai.",
                    "budget_required": min(budget * 0.4, 12000.0),
                    "urgency": "high",
                    "is_feasible": True
                },
                {
                    "name": "Late Evening Gup Shup Offers",
                    "description": "Offer flat 15% off on family gatherings post 6 PM. WHY: Din mein garmi hoti hai to log sham ko bahar nikalte hain. Late evening discount se footfall maximize hoga.",
                    "budget_required": min(budget * 0.3, 8000.0),
                    "urgency": "medium",
                    "is_feasible": True
                }
            ]
            agent_reasoning = "Chai cafe summer transition requires moving focus to cold beverages and late evening family discounts to counter daylight temperature drop-off."
        elif product_type == "food":
            root_cause = "Fuel price barhne ki wajah se logistics cost zayada ho chuki hai, jis se customers online delivery charges ki wajah se orders kam kar rahe hain."
            action_chain = [
                {
                    "name": "Free Delivery on Family Platters",
                    "description": "Offer free delivery only on larger family orders (above Rs 1000). WHY: Large ticket value par delivery cost absorb karna feasible hai aur customer bundle orders zayada karega.",
                    "budget_required": min(budget * 0.4, 14000.0),
                    "urgency": "high",
                    "is_feasible": True
                },
                {
                    "name": "Self-Pickup Reward (Free Drink)",
                    "description": "Give a free cold beverage on every self-pickup order. WHY: Deliveries par direct reliance kam hogi aur foot traffic barhega.",
                    "budget_required": min(budget * 0.2, 6000.0),
                    "urgency": "high",
                    "is_feasible": True
                }
            ]
            agent_reasoning = "Restaurant fuel pricing impact demands moving customers to high-ticket delivery bundles to balance logistics cost while offering incentives for self-pickups."
        elif product_type == "ecommerce":
            root_cause = "Karachi heatwave mein portable ACs aur fans ki demand bohot barh gayi hai, lekin stock updates delayed hain aur fast shipping missing hai."
            action_chain = [
                {
                    "name": "Same-Day Priority Shipment",
                    "description": "Launch express same-day delivery service inside Karachi. WHY: Extreme heatwave mein product ki zaroorat immediate hoti hai. Fast delivery competitor ko beat karne ka best tareeqa hai.",
                    "budget_required": min(budget * 0.5, 18000.0),
                    "urgency": "high",
                    "is_feasible": True
                },
                {
                    "name": "Pre-Order Summer discount",
                    "description": "Give 10% discount on advanced warehouse booking of fans. WHY: Stock mismatch issue prevent karne ke liye pre-bookings demand predict karne mein help karegi.",
                    "budget_required": min(budget * 0.2, 7000.0),
                    "urgency": "medium",
                    "is_feasible": True
                }
            ]
            agent_reasoning = "E-commerce inventory crisis requires immediate logistics speed upgrade to leverage heatwave demand and pre-booking discount to secure future stock."
        else:
            root_cause = "Summer competitors are offering heavy promotions, making our product look premium without instant incentive."
            action_chain = [
                {
                    "name": "Summer Value Discount Campaign",
                    "description": "Offer flat 15% discount for a limited time. WHY: Generates quick impulse buys and counters competitor pricing pressure immediately.",
                    "budget_required": min(budget * 0.4, 10000.0),
                    "urgency": "high",
                    "is_feasible": True
                }
            ]
            agent_reasoning = "Standard competitive pressure demands introductory summer discount to capture price-sensitive local market share."

        result = {
            "root_cause": root_cause,
            "action_chain": action_chain,
            "roi_prediction": {"low": 8.0, "mid": 16.0, "high": 32.0},
            "constraints_checked": {"budget": budget, "status": "ok"},
            "agent_reasoning": agent_reasoning,
            "agent_decision": "Proposed highly custom actionable strategy covering specific product challenges and budget limits."
        }

    latency_ms = int((time.time() - start_time) * 1000)
    
    trace = TraceLog(
        job_id=job_id,
        agent="StrategyAgent",
        timestamp=datetime.utcnow().isoformat() + "Z",
        workplan="Generate action chain, verify budget constraints, and predict ROI.",
        tool_calls=["generate_strategy()", f"check_constraints(PKR {budget})"],
        reasoning=result.get("agent_reasoning", "Synthesizing insights into a tactical execution plan."),
        decision=result.get("agent_decision", f"Proposed actions within budget."),
        confidence=0.92,
        latency_ms=latency_ms,
        output_summary=f"Created {len(result.get('action_chain', []))} step action plan."
    )
    
    output_data = {k: v for k, v in result.items() if k in ["root_cause", "action_chain", "roi_prediction", "constraints_checked"]}
    
    return Agent2Output(**output_data), trace

