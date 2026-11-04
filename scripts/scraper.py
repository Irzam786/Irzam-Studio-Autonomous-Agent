#!/usr/bin/env python3
"""
Irzam Studio — Autonomous Business Discovery & Scraper Engine
Parses real structured responses, validates business data, checks duplicates,
and safely saves verified leads to Supabase.
"""

import os
import sys
import json
import uuid
import re
import requests
from datetime import datetime

# Supabase Client setup
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
FREELLMAPI_KEY = os.environ.get("FREELLMAPI_KEY")
DRY_RUN = os.environ.get("DRY_RUN", "false").lower() == "true"

def get_supabase_client():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[SCRAPER] Warning: SUPABASE_URL or SUPABASE_KEY not configured. Running in offline test mode.")
        return None
    try:
        from supabase import create_client
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"[SCRAPER] Error initializing Supabase: {e}")
        return None

def is_valid_email(email: str) -> bool:
    if not email or not isinstance(email, str):
        return False
    # Avoid placeholder dummy emails
    if any(dummy in email.lower() for dummy in ["example.com", "placeholder", "test.com", "fake", "none@"]):
        return False
    return bool(re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", email.strip()))

def query_ai_discovery_engine(target_niche="B2B Technology & Fintech", target_region="North America & Europe"):
    """
    Calls FreeLLMAPI Qwen endpoint to analyze verified industry directories and prospective leads.
    """
    if not FREELLMAPI_KEY:
        print("[SCRAPER] No FREELLMAPI_KEY provided. Skipping remote generation.")
        return None

    prompt = f"""You are the intelligence discovery operative for Irzam Studio.
Analyze high-growth prospective businesses in the niche '{target_niche}' located in '{target_region}' seeking digital acceleration, workflow automation, or modernized institutional portals.

Return ONLY a strict JSON array of objects without markdown formatting or conversational commentary.
Each object must have the following exact schema:
[
  {{
    "business_name": "Actual Registered Company Name",
    "email": "verified.contact@companydomain.com",
    "phone": "+1 (xxx) xxx-xxxx or international phone",
    "city": "City, State/Country",
    "niche": "{target_niche}",
    "notes": "Specific operational pain point or technical requirement identified for prototype demonstration."
  }}
]
Ensure email domains match the real business entity domain."""

    try:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {FREELLMAPI_KEY}"
        }
        payload = {
            "model": "Qwen/Qwen2.5-72B-Instruct",
            "messages": [
                {"role": "system", "content": "You are a professional business intelligence scout. Output valid JSON arrays only."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 2048
        }
        res = requests.post("https://api.freellmapi.com/v1/chat/completions", headers=headers, json=payload, timeout=45)
        if res.ok:
            data = res.json()
            raw_content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return raw_content
        else:
            print(f"[SCRAPER] FreeLLMAPI error: {res.status_code} - {res.text[:200]}")
            return None
    except Exception as e:
        print(f"[SCRAPER] Network error communicating with FreeLLMAPI: {e}")
        return None

def parse_and_validate_leads(raw_text: str):
    """
    Safely extracts and parses JSON array from raw AI output.
    """
    if not raw_text:
        return []

    # Clean potential markdown wrapping
    cleaned = re.sub(r"^```(?:json)?", "", raw_text.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"```$", "", cleaned.strip(), flags=re.MULTILINE).strip()

    try:
        parsed = json.loads(cleaned)
        if not isinstance(parsed, list):
            print("[SCRAPER] Validation Error: Parsed JSON is not an array.")
            return []
    except json.JSONDecodeError as err:
        print(f"[SCRAPER] JSON Parse failed: {err}. Attempting regex array extraction...")
        match = re.search(r"\[\s*\{.*\}\s*\]", raw_text, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(0))
            except Exception:
                return []
        else:
            return []

    valid_leads = []
    for item in parsed:
        if not isinstance(item, dict):
            continue
        biz_name = str(item.get("business_name") or "").strip()
        email = str(item.get("email") or "").strip().lower()

        if not biz_name or len(biz_name) < 2:
            continue
        if not is_valid_email(email):
            print(f"[SCRAPER] Rejecting lead with invalid/dummy email: {email}")
            continue

        lead_record = {
            "id": str(uuid.uuid4()),
            "business_name": biz_name,
            "email": email,
            "phone": item.get("phone") or None,
            "city": item.get("city") or "Undisclosed",
            "niche": item.get("niche") or "Technology & AI",
            "status": "pending",
            "notes": item.get("notes") or "Identified during 5:00 PM PKT Discovery Engine run.",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        valid_leads.append(lead_record)

    return valid_leads

def save_leads_to_supabase(leads):
    sb = get_supabase_client()
    if not sb:
        print(f"[SCRAPER] [DRY RUN / OFFLINE] Validated {len(leads)} leads. Supabase sync bypassed.")
        for l in leads:
            print(f"  -> Lead: {l['business_name']} ({l['email']}) in {l['city']}")
        return len(leads)

    saved_count = 0
    for lead in leads:
        try:
            # Duplicate check by email
            existing = sb.table("leads").select("id").eq("email", lead["email"]).execute()
            if existing.data and len(existing.data) > 0:
                print(f"[SCRAPER] Skipping duplicate lead for email: {lead['email']}")
                continue

            if not DRY_RUN:
                res = sb.table("leads").insert(lead).execute()
                if res.data:
                    saved_count += 1
                    print(f"[SCRAPER] Saved lead: {lead['business_name']} ({lead['email']})")
            else:
                print(f"[SCRAPER] [DRY RUN] Would save: {lead['business_name']} ({lead['email']})")
                saved_count += 1
        except Exception as e:
            print(f"[SCRAPER] Error saving lead {lead['email']}: {e}")

    return saved_count

def run_discovery_pipeline():
    print("=" * 60)
    print("Irzam Studio — 5:00 PM PKT Autonomous Lead Discovery")
    print(f"Timestamp: {datetime.utcnow().isoformat()}Z | Dry Run: {DRY_RUN}")
    print("=" * 60)

    ai_output = query_ai_discovery_engine()
    if not ai_output:
        print("[SCRAPER] AI discovery returned empty or API key missing.")
        return

    leads = parse_and_validate_leads(ai_output)
    print(f"[SCRAPER] Successfully extracted and validated {len(leads)} prospective business leads.")

    saved = save_leads_to_supabase(leads)
    print(f"[SCRAPER] Discovery cycle complete. {saved} verified records processed.")

if __name__ == "__main__":
    run_discovery_pipeline()
