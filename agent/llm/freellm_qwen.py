import json
import os
import requests
from typing import Any, Dict, List, Optional


class FreeLLMQwen:
    """OpenAI-compatible Qwen adapter with native function/tool-call parsing."""

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None):
        self.base = (base_url or os.environ.get("FREELLM_BASE_URL", "https://api.freellmapi.com/v1")).rstrip("/")
        self.key = api_key or os.environ.get("FREELLM_API_KEY", "")
        self.model = model or os.environ.get("QWEN_MODEL", "qwen-max")

    @staticmethod
    def _parse_arguments(value: Any) -> Dict[str, Any]:
        if isinstance(value, dict):
            return value
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, dict) else {}
            except json.JSONDecodeError:
                return {}
        return {}

    def complete(self, messages: List[Dict[str, Any]], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        if not self.key:
            raise RuntimeError("FreeLLMAPI Qwen key is not configured.")

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 4096,
            "stream": False,
        }
        if tools:
            payload["tools"] = [
                {"type": "function", "function": tool}
                for tool in tools
                if isinstance(tool, dict) and tool.get("name")
            ]
            payload["tool_choice"] = "auto"

        response = requests.post(
            f"{self.base}/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {self.key}", "Content-Type": "application/json"},
            timeout=75,
        )
        if not response.ok:
            raise RuntimeError(f"FreeLLMAPI returned HTTP {response.status_code}: {response.text[:1000]}")

        data = response.json()
        choices = data.get("choices") or []
        if not choices:
            raise RuntimeError("FreeLLMAPI returned no completion choices.")
        message = choices[0].get("message") or {}

        calls = message.get("tool_calls") or []
        if calls:
            function = (calls[0].get("function") or {})
            return {
                "type": "tool_call",
                "tool": function.get("name"),
                "args": self._parse_arguments(function.get("arguments")),
            }

        legacy_call = message.get("function_call")
        if legacy_call:
            return {
                "type": "tool_call",
                "tool": legacy_call.get("name"),
                "args": self._parse_arguments(legacy_call.get("arguments")),
            }

        content = message.get("content")
        if isinstance(content, list):
            content = "".join(str(part.get("text", "")) for part in content if isinstance(part, dict))
        if not isinstance(content, str) or not content.strip():
            raise RuntimeError("FreeLLMAPI returned an empty assistant response.")
        return {"type": "final", "content": content}
