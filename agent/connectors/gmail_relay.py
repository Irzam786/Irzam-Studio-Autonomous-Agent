import os
import base64
import requests
from email.mime.text import MIMEText
from email.utils import parseaddr
from typing import Dict, Any, List, Optional

GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"


def refresh_gmail_access_token(client_id: str, client_secret: str, refresh_token: str) -> str:
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    response = requests.post(GOOGLE_TOKEN_ENDPOINT, data=payload, timeout=20)
    if not response.ok:
        raise RuntimeError(f"Gmail token refresh failed: HTTP {response.status_code}: {response.text[:500]}")
    access_token = response.json().get("access_token")
    if not access_token:
        raise RuntimeError("Google OAuth refresh response contained no access token.")
    return access_token


def send_gmail_outreach(
    access_token: str,
    sender_email: str,
    sender_name: str,
    recipient_email: str,
    subject: str,
    body_text: str,
    thread_id: Optional[str] = None,
) -> Dict[str, Any]:
    message = MIMEText(body_text, "plain", "utf-8")
    message["to"] = recipient_email
    message["from"] = f"{sender_name} <{sender_email}>"
    message["subject"] = subject
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    payload: Dict[str, Any] = {"raw": raw_message}
    if thread_id:
        payload["threadId"] = thread_id
    response = requests.post(
        f"{GMAIL_API_BASE}/messages/send",
        headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
        json=payload,
        timeout=25,
    )
    if not response.ok:
        raise RuntimeError(f"Gmail send failed: HTTP {response.status_code}: {response.text[:500]}")
    data = response.json()
    return {"success": True, "message_id": data.get("id"), "thread_id": data.get("threadId"), "sent_at": data.get("internalDate")}


def scan_gmail_replies(access_token: str, query: str = "label:INBOX newer_than:30d -from:me") -> List[Dict[str, Any]]:
    """Read recent inbound inbox messages; no sending or mailbox mutation is performed."""
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(
        f"{GMAIL_API_BASE}/messages",
        headers=headers,
        params={"q": query, "maxResults": 20},
        timeout=25,
    )
    if not response.ok:
        raise RuntimeError(f"Gmail inbox scan failed: HTTP {response.status_code}: {response.text[:500]}")

    results: List[Dict[str, Any]] = []
    for message in (response.json().get("messages") or []):
        message_id = message.get("id")
        if not message_id:
            continue
        detail_response = requests.get(
            f"{GMAIL_API_BASE}/messages/{message_id}",
            headers=headers,
            params={"format": "metadata", "metadataHeaders": ["From", "Subject", "Date"]},
            timeout=20,
        )
        if not detail_response.ok:
            continue
        detail = detail_response.json()
        headers_list = (detail.get("payload") or {}).get("headers") or []
        header_map = {str(item.get("name", "")).lower(): item.get("value", "") for item in headers_list}
        from_name, from_email = parseaddr(header_map.get("from", ""))
        snippet = detail.get("snippet", "") or ""
        results.append({
            "gmail_message_id": message_id,
            "thread_id": detail.get("threadId"),
            "from_name": from_name or "Prospect",
            "from_email": from_email.strip().lower(),
            "subject": header_map.get("subject", ""),
            "snippet": snippet,
            "intent": classify_reply_intent(snippet),
            "received_at": header_map.get("date", ""),
        })
    return results


def classify_reply_intent(snippet: str) -> str:
    text = (snippet or "").lower()
    if any(word in text for word in ["unsubscribe", "stop", "remove me", "don't email", "do not contact", "opt out"]):
        return "opt_out"
    if any(word in text for word in ["not interested", "no thanks", "no thank you", "pass"]):
        return "not_interested"
    if any(word in text for word in ["delivery status notification", "failure", "undeliverable", "bounce"]):
        return "bounce"
    if any(word in text for word in ["how much", "pricing", "cost", "rates", "package", "quote"]):
        return "pricing"
    if any(word in text for word in ["call", "meet", "schedule", "zoom", "calendar", "availability"]):
        return "meeting"
    if any(word in text for word in ["interested", "sure", "show me", "send demo", "send preview", "tell me more"]):
        return "interested"
    return "general_inquiry"
