import os
import requests
from typing import Dict, Any, Optional

HUNTER_DOMAIN_SEARCH = "https://api.hunter.io/v2/domain-search"
PROSPEO_EMAIL_FINDER = "https://api.prospeo.io/v1/email-finder"

def find_email_hunter(domain: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Finds verified corporate emails using Hunter.io.
    """
    key = api_key or os.environ.get("HUNTER_API_KEY")
    if not key:
        return {"success": False, "error": "Hunter.io API Key missing"}

    url = f"{HUNTER_DOMAIN_SEARCH}?domain={domain}&api_key={key}"
    res = requests.get(url, timeout=15)
    if not res.ok:
        return {"success": False, "error": f"Hunter HTTP {res.status_code}: {res.text}"}

    data = res.json().get("data", {})
    emails = data.get("emails", [])
    if not emails:
        return {"success": False, "error": "No email found for domain"}

    best = emails[0]
    return {
        "success": True,
        "email": best.get("value"),
        "confidence": best.get("confidence", 0),
        "source": "hunter_io",
        "first_name": best.get("first_name"),
        "last_name": best.get("last_name"),
        "position": best.get("position"),
        "verification_status": "verified" if best.get("confidence", 0) >= 80 else "risky"
    }

def find_email_prospeo(first_name: str, last_name: str, domain: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Finds verified corporate emails using Prospeo B2B Intelligence.
    """
    key = api_key or os.environ.get("PROSPEO_API_KEY")
    if not key:
        return {"success": False, "error": "Prospeo API Key missing"}

    headers = {"X-KEY": key, "Content-Type": "application/json"}
    payload = {"first_name": first_name, "last_name": last_name, "domain": domain}
    res = requests.post(PROSPEO_EMAIL_FINDER, headers=headers, json=payload, timeout=15)
    if not res.ok:
        return {"success": False, "error": f"Prospeo HTTP {res.status_code}: {res.text}"}

    data = res.json()
    resp_data = data.get("response", {})
    email = resp_data.get("email")
    status = resp_data.get("email_status", "unknown")

    return {
        "success": bool(email),
        "email": email,
        "confidence": 95 if status == "verified" else 50,
        "source": "prospeo",
        "verification_status": "verified" if status == "verified" else "unverified"
    }
