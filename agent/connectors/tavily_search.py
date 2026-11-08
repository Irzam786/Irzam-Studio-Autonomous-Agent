import os
import requests
from typing import Dict, Any, Optional

TAVILY_SEARCH_ENDPOINT = "https://api.tavily.com/search"

def research_business_web(
    business_name: str,
    city: str = "",
    domain: str = "",
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Genuine Tavily AI Search integration for prospect research.
    Locates official websites, contact pages, leadership names, and operational focus.
    """
    key = api_key or os.environ.get("TAVILY_API_KEY")
    if not key:
        raise ValueError("Tavily API Key is missing. Connect the Tavily AI Search connector in the dashboard.")

    query = f"{business_name} {city} official website contact leadership".strip()
    if domain:
        query += f" site:{domain}"

    payload = {
        "api_key": key,
        "query": query,
        "search_depth": "advanced",
        "include_answer": True,
        "max_results": 5
    }

    response = requests.post(TAVILY_SEARCH_ENDPOINT, json=payload, timeout=25)
    if not response.ok:
        raise RuntimeError(f"Tavily Search API responded with {response.status_code}: {response.text}")

    data = response.json()
    return {
        "answer": data.get("answer", ""),
        "sources": [r.get("url") for r in data.get("results", []) if r.get("url")],
        "snippets": [r.get("content") for r in data.get("results", [])[:3]],
        "query_used": query
    }
