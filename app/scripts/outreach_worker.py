#!/usr/bin/env python3
"""
Irzam Studio — 6:00 PM PKT Personalized Outreach Worker
Fetches pending leads, generates bespoke email drafts with FreeLLMAPI Qwen models,
attaches interactive client demo URLs, and prepares drafts for dispatch.
"""

import os
import sys
import json
import requests
from datetime import datetime

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
FREELLMAPI_KEY = os.environ.get("FREELLMAPI_KEY")
DRY_RUN = os.environ.get("DRY_RUN", "false").lower() == "true"

def get_supabase_client():
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        from supabase import create_client
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"[OUTREACH] Supabase connection error: {e}")
        return None

def generate_personalized_draft(lead: dict, attached_demo_url: str = "") -> dict:
    biz_name = lead.get("business_name", "Prospective Partner")
    city = lead.get("city", "")
    niche = lead.get("niche", "Technology")
    notes = lead.get("notes", "")

    if not FREELLMAPI_KEY:
        # High quality standard fallback template
        subject = f"Interactive Prototype & Treasury Infrastructure for {biz_name}"
        body = f"""Hi {biz_name} Team,

I recently explored {biz_name}'s footprint in {city if city else 'your market'}. Given your work in {niche}, our studio engineered an interactive prototype demonstrating autonomous operations, real-time client analytics, and high-conversion portals.

You can interact with the live temporary preview here:
{attached_demo_url if attached_demo_url else 'https://apex-portfolio.netlify.app'}

Would you be open to a 10-minute briefing this Thursday to discuss tailoring this digital architecture for {biz_name}?

Best regards,
Irzam Shahid
Founder & Lead Architect, Irzam Studio"""
        return {"subject": subject, "body": body}

    prompt = f"""You are the executive outreach operative for Irzam Studio.
Draft an elite, concise, highly personalized B2B cold outreach email to:
- Company: {biz_name}
- Niche: {niche}
- City: {city}
- Context/Pain Point: {notes}
- Interactive Prototype Link: {attached_demo_url if attached_demo_url else 'https://apex-portfolio.netlify.app'}

Guidelines:
1. Max 140 words. Ultra professional, compelling, and zero generic marketing fluff.
2. Directly reference the deployed prototype link so they can click and review.
3. Call-to-action: A brief 10-min Zoom call on Thursday.
4. Output strictly a JSON object: {{"subject": "...", "body": "..."}} without markdown formatting."""

    try:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {FREELLMAPI_KEY}"
        }
        payload = {
            "model": "Qwen/Qwen2.5-72B-Instruct",
            "messages": [
                {"role": "system", "content": "You are a master B2B outreach strategist. Output valid JSON with subject and body keys."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.4,
            "max_tokens": 1024
        }
        res = requests.post("https://api.freellmapi.com/v1/chat/completions", headers=headers, json=payload, timeout=30)
        if res.ok:
            data = res.json()
            raw_text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            raw_clean = raw_text.strip().replace("```json", "").replace("```", "").strip()
            parsed = json.loads(raw_clean)
            return {
                "subject": parsed.get("subject", f"Prototype Demo for {biz_name}"),
                "body": parsed.get("body", "")
            }
    except Exception as e:
        print(f"[OUTREACH] AI drafting error: {e}. Using deterministic architectural draft.")

    return {
        "subject": f"Prototype Digital Architecture for {biz_name}",
        "body": f"Hi {biz_name} Team,\n\nWe deployed an interactive prototype for your team to test: {attached_demo_url}\n\nLet's connect this week.\n\nIrzam Shahid, Irzam Studio"
    }

def run_outreach_pipeline():
    print("=" * 60)
    print("Irzam Studio — 6:00 PM PKT Outreach Drafting Engine")
    print(f"Timestamp: {datetime.utcnow().isoformat()}Z | Dry Run: {DRY_RUN}")
    print("=" * 60)

    sb = get_supabase_client()
    if not sb:
        print("[OUTREACH] Running in offline / simulation mode.")
        sample_lead = {
            "id": "sample-1",
            "business_name": "Apex Wealth Partners",
            "email": "partners@apexwealth.com",
            "city": "New York, NY",
            "niche": "Fintech & Treasury",
            "notes": "Seeking institutional portfolio dashboard."
        }
        draft = generate_personalized_draft(sample_lead, "https://apex-portfolio.netlify.app")
        print("\nSample Generated Draft:")
        print(f"Subject: {draft['subject']}")
        print("-" * 40)
        print(draft['body'])
        return

    try:
        # Fetch pending leads that have not been dispatched yet
        res = sb.table("leads").select("*").eq("status", "pending").limit(15).execute()
        pending_leads = res.data or []
        print(f"[OUTREACH] Discovered {len(pending_leads)} pending leads eligible for outreach.")

        for lead in pending_leads:
            demo_url = lead.get("demo_url") or "https://apex-portfolio.netlify.app"
            draft = generate_personalized_draft(lead, demo_url)

            print(f"\n[DRAFT CREATED] To: {lead['business_name']} ({lead['email']})")
            print(f"Subject: {draft['subject']}")

            if not DRY_RUN:
                # Update notes with draft without prematurely marking as contacted
                sb.table("leads").update({
                    "notes": f"Draft generated: '{draft['subject']}'. Awaiting Gmail dispatch.",
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", lead["id"]).execute()
            else:
                print(f"[DRY RUN] Would queue email to {lead['email']}")

    except Exception as e:
        print(f"[OUTREACH] Error in outreach batch: {e}")

if __name__ == "__main__":
    run_outreach_pipeline()
