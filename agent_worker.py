import os
import requests
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 1. Fetch FreeLLMAPI Key & Gmail Token
config = supabase.table("system_config").select("*").single().execute().data
freellm_key = config.get("freellmapi_key") if config else None

gmail_token = supabase.table("gmail_tokens").select("*").order("created_at", desc=True).limit(1).execute().data

if not freellm_key or not gmail_token:
    print("Missing FreeLLMAPI key or Gmail Token in Supabase. Exiting.")
    exit()

# 2. Fetch Pending Leads
pending_leads = supabase.table("leads").select("*").eq("status", "pending").limit(5).execute().data

def generate_cold_email(business_name):
    url = "https://api.freellmapi.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {freellm_key}", "Content-Type": "application/json"}
    prompt = f"Write a high-converting 3-sentence cold email pitch for {business_name} offering an automated booking portal. Ultra-concise, direct."
    
    payload = {
        "model": "qwen-2.5-72b-instruct",
        "messages": [{"role": "user", "content": prompt}]
    }
    res = requests.post(url, json=payload, headers=headers).json()
    return res["choices"][0]["message"]["content"]

# 3. Process Leads
for lead in pending_leads:
    if lead.get("email"):
        email_body = generate_cold_email(lead["business_name"])
        print(f"Generated email for {lead['business_name']}: {email_body}")
        # Mark as contacted
        supabase.table("leads").update({"status": "contacted"}).eq("id", lead["id"]).execute()
