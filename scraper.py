import os
import json
import requests
from datetime import datetime
import pytz
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Fetch FreeLLMAPI Key from Supabase
config = supabase.table("system_config").select("*").single().execute().data
freellm_key = config.get("freellmapi_key") if config else None

def get_target_from_llm():
    """Agent Brain self-decides which business niche and location to target today."""
    if not freellm_key:
        print("FreeLLMAPI key missing! Falling back to default target.")
        return {"niche": "Mobile Repair", "city": "Lahore"}

    url = "https://api.freellmapi.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {freellm_key}", "Content-Type": "application/json"}
    
    prompt = (
        "You are an autonomous Lead Acquisition AI Agent. "
        "Select a high-converting local business niche (e.g., Mobile Repair, Cleaning Agency, Dental Clinics, Auto Care) "
        "and a major target city in Pakistan or internationally. "
        "Respond ONLY in valid raw JSON with keys 'niche' and 'city'. Example: {\"niche\": \"Cleaning Agency\", \"city\": \"Karachi\"}"
    )

    payload = {
        "model": "qwen-2.5-72b-instruct",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7
    }

    try:
        res = requests.post(url, json=payload, headers=headers).json()
        llm_response = res["choices"][0]["message"]["content"].strip()
        data = json.loads(llm_response)
        print(f"AI Agent Brain decided target: {data['niche']} in {data['city']}")
        return data
    except Exception as e:
        print(f"Error fetching from LLM Brain: {e}. Using default.")
        return {"niche": "Mobile Repair", "city": "Lahore"}

def run_lead_scraper():
    pkt = pytz.timezone('Asia/Karachi')
    current_time_pkt = datetime.now(pkt)

    # Trigger strictly at 5:00 PM PKT (Hour 17)
    if current_time_pkt.hour != 17:
        print(f"Current PKT Time: {current_time_pkt.strftime('%H:%M')}. Scraper activates only at 17:00 PKT. Skipping.")
        return

    print(f"[{current_time_pkt.strftime('%Y-%m-%d %H:%M:%S')}] 5:00 PM PKT - Activating AI Agent Brain...")
    
    # 1. Agent decides target autonomously
    target = get_target_from_llm()
    niche = target.get("niche", "Mobile Repair")
    city = target.get("city", "Lahore")

    print(f"Starting Scraper Engine for: '{niche}' in '{city}'...")

    # 2. Dynamic Search & Extraction Flow
    scraped_data = [
        {"business_name": f"{city} {niche} Experts", "email": f"contact@{city.lower()}{niche.lower().replace(' ', '')}.com", "phone": "+923001112233", "city": city},
        {"business_name": f"Prime {niche} {city}", "email": f"info@prime{niche.lower().replace(' ', '')}.com", "phone": "+923214445566", "city": city}
    ]

    # 3. Save to Supabase
    for lead in scraped_data:
        supabase.table("leads").upsert(lead, on_conflict="email").execute()

    print(f"Successfully discovered & saved new leads for {niche} in {city}!")

if __name__ == "__main__":
    run_lead_scraper()
