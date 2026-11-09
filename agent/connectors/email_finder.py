import os
import requests
from typing import Dict, Any, Optional

HUNTER_DOMAIN_SEARCH = "https://api.hunter.io/v2/domain-search"
HUNTER_EMAIL_VERIFIER = "https://api.hunter.io/v2/email-verifier"
PROSPEO_EMAIL_FINDER = "https://api.prospeo.io/v1/email-finder"


def find_email_hunter(domain: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """Find a domain contact and require Hunter's explicit verifier status before marking it verified."""
    key = api_key or os.environ.get("HUNTER_API_KEY")
    if not key:
        return {"success": False, "error": "Hunter.io API key missing."}

    search = requests.get(
        HUNTER_DOMAIN_SEARCH,
        params={"domain": domain, "api_key": key, "limit": 10},
        timeout=20,
    )
    if not search.ok:
        return {"success": False, "error": f"Hunter domain search HTTP {search.status_code}: {search.text[:500]}"}

    emails = (search.json().get("data") or {}).get("emails") or []
    if not emails:
        return {"success": False, "error": "No public email found for this domain."}

    # Prefer named contacts and avoid generic/role addresses when possible.
    best = sorted(
        emails,
        key=lambda item: (
            bool(item.get("first_name") and item.get("last_name")),
            int(item.get("confidence") or 0),
        ),
        reverse=True,
    )[0]
    email = str(best.get("value") or "").strip().lower()
    if not email:
        return {"success": False, "error": "Hunter returned an empty email address."}

    verification = requests.get(
        HUNTER_EMAIL_VERIFIER,
        params={"email": email, "api_key": key},
        timeout=25,
    )
    if not verification.ok:
        return {
            "success": False,
            "email": email,
            "first_name": best.get("first_name"),
            "last_name": best.get("last_name"),
            "error": f"Hunter verifier HTTP {verification.status_code}: {verification.text[:500]}",
            "verification_status": "unverified",
            "source": "hunter_io",
        }

    verification_data = (verification.json().get("data") or {})
    status = str(verification_data.get("status") or "").lower()
    verified = status == "valid"
    return {
        "success": True,
        "email": email,
        "confidence": verification_data.get("score", best.get("confidence", 0)),
        "source": "hunter_io",
        "first_name": best.get("first_name"),
        "last_name": best.get("last_name"),
        "position": best.get("position"),
        "verification_status": "verified" if verified else "unverified",
        "verification_detail": status or "unknown",
    }


def find_email_prospeo(
    first_name: str,
    last_name: str,
    domain: str,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Find a named corporate contact; only provider status 'verified' counts as verified."""
    key = api_key or os.environ.get("PROSPEO_API_KEY")
    if not key:
        return {"success": False, "error": "Prospeo API key missing."}

    response = requests.post(
        PROSPEO_EMAIL_FINDER,
        headers={"X-KEY": key, "Content-Type": "application/json"},
        json={"first_name": first_name, "last_name": last_name, "domain": domain},
        timeout=20,
    )
    if not response.ok:
        return {"success": False, "error": f"Prospeo HTTP {response.status_code}: {response.text[:500]}"}

    data = response.json()
    response_data = data.get("response") or {}
    email = str(response_data.get("email") or "").strip().lower()
    status = str(response_data.get("email_status") or "").lower()
    return {
        "success": bool(email),
        "email": email or None,
        "confidence": 95 if status == "verified" else 0,
        "source": "prospeo",
        "verification_status": "verified" if email and status == "verified" else "unverified",
        "verification_detail": status or "unknown",
    }
