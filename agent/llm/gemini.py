import os
import requests
from typing import Any, Dict, List, Optional

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


def _gemini_schema(schema: Dict[str, Any]) -> Dict[str, Any]:
    """Convert JSON Schema primitive types to Gemini's uppercase schema enum."""
    result = {}
    for key, value in schema.items():
        if key == "type" and isinstance(value, str):
            result[key] = value.upper()
        elif key == "properties" and isinstance(value, dict):
            result[key] = {name: _gemini_schema(item) for name, item in value.items()}
        elif key == "items" and isinstance(value, dict):
            result[key] = _gemini_schema(value)
        else:
            result[key] = value
    return result


class GoogleGemini:
    """Gemini adapter supporting native function declarations and function-call results."""

    def __init__(self, model_name: str = "gemini-2.5-flash", api_key: Optional[str] = None):
        self.model = model_name
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")

    def complete(self, messages: List[Dict[str, Any]], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        if not self.api_key:
            raise RuntimeError("Gemini API key is not configured.")

        contents = []
        system_parts = []
        for message in messages:
            role = message.get("role")
            content = message.get("content")
            text_value = content if isinstance(content, str) else str(content or "")
            if role == "system":
                system_parts.append(text_value)
                continue
            contents.append({
                "role": "model" if role == "assistant" else "user",
                "parts": [{"text": text_value}],
            })

        payload: Dict[str, Any] = {"contents": contents}
        if system_parts:
            payload["systemInstruction"] = {"parts": [{"text": "\n\n".join(system_parts)}]}
        if tools:
            declarations = [
                {
                    "name": item.get("name"),
                    "description": item.get("description", ""),
                    "parameters": _gemini_schema(item.get("parameters", {"type": "object", "properties": {}})),
                }
                for item in tools if item.get("name")
            ]
            payload["tools"] = [{"functionDeclarations": declarations}]
            payload["toolConfig"] = {"functionCallingConfig": {"mode": "AUTO"}}

        response = requests.post(
            f"{GEMINI_API_BASE}/{self.model}:generateContent",
            params={"key": self.api_key},
            json=payload,
            timeout=75,
        )
        if not response.ok:
            raise RuntimeError(f"Gemini API returned HTTP {response.status_code}: {response.text[:1000]}")

        data = response.json()
        candidates = data.get("candidates") or []
        if not candidates:
            raise RuntimeError("Gemini returned no completion candidates.")
        parts = (candidates[0].get("content") or {}).get("parts") or []

        for part in parts:
            call = part.get("functionCall") if isinstance(part, dict) else None
            if call:
                return {
                    "type": "tool_call",
                    "tool": call.get("name"),
                    "args": call.get("args") or {},
                }

        text_value = "".join(part.get("text", "") for part in parts if isinstance(part, dict))
        if not text_value.strip():
            raise RuntimeError("Gemini returned neither a tool call nor text.")
        return {"type": "final", "content": text_value}
