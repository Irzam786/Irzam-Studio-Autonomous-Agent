import os
import requests
from typing import Dict, Any, List, Optional

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

class GoogleGemini:
    """
    Google Gemini Flash model adapter supporting native function calling and structured reasoning.
    """
    def __init__(self, model_name: str = "gemini-2.5-flash", api_key: Optional[str] = None):
        self.model = model_name
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")

    def complete(self, messages: List[Dict[str, Any]], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured.")

        url = f"{GEMINI_API_BASE}/{self.model}:generateContent?key={self.api_key}"

        # Convert chat messages to Gemini contents format
        contents = []
        for m in messages:
            role = "user" if m.get("role") in ["user", "system"] else "model"
            contents.append({
                "role": role,
                "parts": [{"text": m.get("content", "")}]
            })

        payload: Dict[str, Any] = {"contents": contents}

        # Add function declarations if provided
        if tools:
            declarations = []
            for t in tools:
                declarations.append({
                    "name": t.get("name"),
                    "description": t.get("description", ""),
                    "parameters": t.get("parameters", {"type": "object", "properties": {}})
                })
            payload["tools"] = [{"functionDeclarations": declarations}]

        res = requests.post(url, json=payload, timeout=60)
        if not res.ok:
            raise RuntimeError(f"Gemini API error ({res.status_code}): {res.text}")

        data = res.json()
        candidates = data.get("candidates", [])
        if not candidates:
            return {"type": "final", "content": ""}

        part = candidates[0].get("content", {}).get("parts", [{}])[0]

        if "functionCall" in part:
            call = part["functionCall"]
            return {
                "type": "tool_call",
                "tool": call.get("name"),
                "args": call.get("args", {})
            }

        return {
            "type": "final",
            "content": part.get("text", "")
        }
