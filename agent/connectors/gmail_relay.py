import os
import base64
import requests
from email.mime.text import MIMEText
from typing import Dict, Any, List, Optional

GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"

def refresh_gmail_access_token(
    client_id: str,
    client_secret: str,
    refresh_token: str
) -> str:
    """
    Refreshes short-lived Gmail access token using Google OAuth2.
    """
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }
    res = requests.post(GOOGLE_TOKEN_ENDPOINT, data=payload, timeout=15)
    if not res.ok:
        raise RuntimeError(f"Failed to refresh Gmail access token: {res.status_code} - {res.text}")
    return res.json().get("access_token")

def send_gmail_outreach(
    access_token: str,
    sender_email: str,
    sender_name: str,
    recipient_email: str,
    subject: str,
    body_text: str,
    thread_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Sends cold outreach or reply via official Gmail REST API.
    """
    message = MIMEText(body_text, "plain", "utf-8")
    message["to"] = recipient_email
    message["from"] = f"{sender_name} <{sender_email}>"
    message["subject"] = subject

    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    payload: Dict[str, Any] = {"raw": raw_message}
    if thread_id:
        payload["threadId"] = thread_id

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    res = requests.post(f"{GMAIL_API_BASE}/messages/send", headers=headers, json=payload, timeout=20)
    if not res.ok:
        raise RuntimeError(f"Gmail send failed: {res.status_code} - {res.text}")

    data = res.json()
    return {
        "success": True,
        "message_id": data.get("id"),
        "thread_id": data.get("threadId"),
        "sent_at": data.get("sent_at")
    }

def scan_gmail_replies(access_token: str, query: str = "label:INBOX") -> List[Dict[str, Any]]:
    """
    Scans Gmail inbox messages for prospect replies.
    """
    headers = {"Authorization": f"Bearer {access_token}"}
    res = requests.get(f"{GMAIL_API_BASE}/messages?q={query}&maxResults=10", headers=headers, timeout=20)
    if not res.ok:
        return []

    data = res.json()
    messages = data.get("messages", [])
    results = []

    for m in messages:
        msg_id = m.get("id")
        detail_res = requests.get(f"{GMAIL_API_BASE}/messages/{msg_id}?format=metadata", headers=headers, timeout=15)
        if detail_res.ok:
            detail = detail_res.json()
            headers_list = detail.get("payload", {}).get("headers", [])
            header_map = {h.get("name", "").lower(): h.get("value", "") for h in headers_list}

            results.append({
                "message_id": msg_id,
                "thread_id": detail.get("threadId"),
                "sender": header_map.get("from", ""),
                "subject": header_map.get("subject", ""),
                "snippet": detail.get("snippet", ""),
                "received_at": header_map.get("date", "")
            })

    return results

def classify_reply_intent(snippet: str) -> str:
    """
    Lightweight intent classification for inbox replies.
    """
    lower = snippet.lower()
    if any(w in lower for w in ["unsubscribe", "stop", "remove me", "don't email", "do not contact", "opt out"]):
        return "opt_out"
    if any(w in lower for w in ["how much", "pricing", "cost", "rates", "package", "quote"]):
        return "pricing"
    if any(w in lower for w in ["call", "meet", "schedule", "zoom", "calendar", "availability"]):
        return "meeting"
    if any(w in lower for w in ["interested", "sure", "show me", "send demo", "send preview", "tell me more"]):
        return "interested"
    if any(w in lower for w in ["not interested", "no thanks", "no thank you", "pass"]):
        return "not_interested"
    if any(w in lower for w in ["delivery status notification", "failure", "undeliverable", "bounce"]):
        return "bounce"
    return "general_inquiry"
