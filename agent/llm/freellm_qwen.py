import os
import requests


class FreeLLMQwen:
    def __init__(self):
        self.base = os.environ.get("FREELLM_BASE_URL", "https://api.freellmapi.com/v1").rstrip("/")
        self.key = os.environ.get("FREELLM_API_KEY", "")
        self.model = os.environ.get("QWEN_MODEL", "qwen-max")

    def complete(self, messages, tools=None):
        if not self.key:
            raise RuntimeError("FREELLM_API_KEY missing")
        r = requests.post(f"{self.base}/chat/completions", json={"model": self.model, "messages": messages}, headers={"Authorization": f"Bearer {self.key}"}, timeout=60)
        r.raise_for_status()
        data = r.json()
        return {"type": "final", "content": data["choices"][0]["message"]["content"]}
