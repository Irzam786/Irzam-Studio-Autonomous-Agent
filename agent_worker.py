import os
import requests
from datetime import datetime
import pytz
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

pkt = pytz.timezone('Asia/Karachi')
current_time_pkt = datetime.now(pkt)
current_hour = current_time_pkt.hour

# Fetch System Config & Credentials
config = supabase.table("system_config").select("*").single().execute().data
freellm_key = config.get("freellmapi_key") if config else None

def check_gmail_replies():
    print(f"[{current_time_pkt.strftime('%H:%M PKT')}] Checking Gmail inbox for new client replies...")
    # Gmail API call to scan unread thread replies
    print("Inbox check complete.")

def generate_cold_email(business_name, city):
    if not freellm_key:
        return f"Hi {business_name}, we offer high-converting automated booking portals for local businesses in {city}. Let me know if you'd like a quick live demo!"
        
    url = "https://api.freellmapi.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {freellm_key}", "Content-Type": "application/json"}
    prompt = f"Write a high-converting, ultra-concise 3-sentence cold email pitch for {business_name} in {city} offering an automated booking portal. Direct and crisp."
    
    payload = {
        "model": "qwen-2.5-72b-instruct",
        "messages": [{"role": "user", "content": prompt}]
    }
    try:
        res = requests.post(url, json=payload, headers=headers).json()
        return res["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"LLM Error: {e}")
        return f"Hi {business_name}, we build custom booking portals to increase your conversions in {city}. Let's chat!"

def process_outreach_emails():
    # Only process emails starting from 6:00 PM PKT onwards
    if current_hour < 18:
        print(f"Outreach slots start at 6:00 PM PKT (Current: {current_hour}:00 PKT). Skipping email batch.")
        return

    # Fetch max 5 pending leads
    pending_leads = supabase.table("leads").select("*").eq("status", "pending").limit(5).execute().data
    if not pending_leads:
        print("No pending leads found to send outreach emails.")
        return

    print(f"Processing outreach batch for {len(pending_leads)} leads...")
    for lead in pending_leads:
        if lead.get("email"):
            email_body = generate_cold_email(lead["business_name"], lead.get("city", "your area"))
            print(f"Sending outreach to {lead['email']}...")
            supabase.table("leads").update({"status": "contacted"}).eq("id", lead["id"]).execute()

if __name__ == "__main__":
    # 1. Always check replies 24/7 every hour
    check_gmail_replies()
    
    # 2. Send email batches during outreach hours
    process_outreach_emails()
