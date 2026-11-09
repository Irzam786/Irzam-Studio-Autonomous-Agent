from typing import Any, Callable, Dict, List, Optional

from agent.connectors.google_places import search_businesses_google_places
from agent.connectors.tavily_search import research_business_web
from agent.connectors.email_finder import find_email_hunter, find_email_prospeo


class ToolRegistry:
    """Allowlisted read/research tools. Credentials are fetched server-side, never from model arguments."""

    def __init__(self, store=None):
        self.store = store
        self.tools: Dict[str, Callable] = {}
        self.schemas: Dict[str, Dict[str, Any]] = {}
        self._register_default_tools()

    def _secret(self, name: str, env_name: str) -> str:
        value = None
        if self.store:
            value = self.store.get_secret(name)
        import os
        return value or os.environ.get(env_name, "")

    def register(self, name: str, fn: Callable, schema: Optional[Dict[str, Any]] = None):
        self.tools[name] = fn
        if schema:
            self.schemas[name] = schema

    def has(self, name: str) -> bool:
        return name in self.tools

    def execute(self, name: str, args: Dict[str, Any]) -> Any:
        if name not in self.tools:
            raise ValueError(f"Unknown or disallowed tool: {name}")
        return self.tools[name](**(args or {}))

    def get_definitions(self) -> List[Dict[str, Any]]:
        return list(self.schemas.values())

    def _places(self, query: str, min_reviews: int = 50, min_rating: float = 4.0):
        key = self._secret("irzam_google_maps_api_key", "GOOGLE_MAPS_API_KEY")
        if not key:
            raise RuntimeError("Google Places connector is not configured.")
        return search_businesses_google_places(query, api_key=key, min_reviews=min_reviews, min_rating=min_rating)

    def _research(self, business_name: str, city: str = "", domain: str = ""):
        key = self._secret("irzam_tavily_api_key", "TAVILY_API_KEY")
        if not key:
            raise RuntimeError("Tavily connector is not configured.")
        return research_business_web(business_name, city=city, domain=domain, api_key=key)

    def _hunter(self, domain: str):
        key = self._secret("irzam_hunter_api_key", "HUNTER_API_KEY")
        if not key:
            raise RuntimeError("Hunter.io connector is not configured.")
        return find_email_hunter(domain, api_key=key)

    def _prospeo(self, first_name: str, last_name: str, domain: str):
        key = self._secret("irzam_prospeo_api_key", "PROSPEO_API_KEY")
        if not key:
            raise RuntimeError("Prospeo connector is not configured.")
        return find_email_prospeo(first_name, last_name, domain, api_key=key)

    def _register_default_tools(self):
        self.register("search_businesses_google_places", self._places, {
            "name": "search_businesses_google_places",
            "description": "Search real Google business listings and filter by minimum rating and review count. Read-only.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Business search query including city/region"},
                    "min_reviews": {"type": "integer", "description": "Minimum Google review count"},
                    "min_rating": {"type": "number", "description": "Minimum Google star rating"},
                },
                "required": ["query"],
            },
        })
        self.register("research_business_web", self._research, {
            "name": "research_business_web",
            "description": "Research a business's official website, contact pages and leadership using Tavily. Read-only.",
            "parameters": {
                "type": "object",
                "properties": {
                    "business_name": {"type": "string"},
                    "city": {"type": "string"},
                    "domain": {"type": "string"},
                },
                "required": ["business_name"],
            },
        })
        self.register("find_email_hunter", self._hunter, {
            "name": "find_email_hunter",
            "description": "Find a business-domain contact email and verify the address with Hunter's email verifier.",
            "parameters": {
                "type": "object",
                "properties": {"domain": {"type": "string"}},
                "required": ["domain"],
            },
        })
        self.register("find_email_prospeo", self._prospeo, {
            "name": "find_email_prospeo",
            "description": "Find a named business contact email and return the provider's email verification status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "first_name": {"type": "string"},
                    "last_name": {"type": "string"},
                    "domain": {"type": "string"},
                },
                "required": ["first_name", "last_name", "domain"],
            },
        })
