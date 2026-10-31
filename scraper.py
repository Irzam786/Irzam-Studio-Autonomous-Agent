import os
import json
import requests
from supabase import create_client

# Supabase Connection
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_free_leads(keyword, location):
    print(f"Scraping free leads for {keyword} in {location}...")
    
    # Open-source free query structure
    # Demo lead generator (yahan aap free custom scrapper pipeline set kar sakte hain)
    scraped_data = [
        {"business_name": f"{location} Tech Repair", "email": "contact@techrepair.com", "phone": "+123456789", "city": location},
        {"business_name": f"{location} Auto Care", "email": "info@autocare.com", "phone": "+987654321", "city": location}
    ]
    
    # Supabase 'leads' table mein data auto-insert karna
    for item in scraped_data:
        supabase.table("leads").upsert(item, on_conflict="email").execute()
    
    print("Leads successfully saved to Supabase 'leads' table!")

if __name__ == "__main__":
    fetch_free_leads("Mobile Repair", "Lahore")
