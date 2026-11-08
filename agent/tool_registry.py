from typing import Callable, Dict, Any, List, Optional
import json

from agent.connectors.google_places import search_businesses_google_places
from agent.connectors.tavily_search import research_business_web
from agent.connectors.email_finder import find_email_hunter, find_email_prospeo
from agent.connectors.netlify_deploy import deploy_client_demo_netlify
from agent.connectors.gmail_relay import send_gmail_outreach, scan_gmail_replies, classify_reply_intent


class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, Callable] = {}
        self.schemas: Dict[str, Dict[str, Any]] = {}
        self._register_default_tools()

    def register(self, name: str, fn: Callable, schema: Optional[Dict[str, Any]] = None):
        self.tools[name] = fn
        if schema:
            self.schemas[name] = schema

    def has(self, name: str) -> bool:
        return name in self.tools

    def execute(self, name: str, args: Dict[str, Any]) -> Any:
        if name not in self.tools:
            raise ValueError(f"Unknown tool: {name}")
        return self.tools[name](**args)

    def get_definitions(self) -> List[Dict[str, Any]]:
        return list(self.schemas.values())

    def _register_default_tools(self):
        # 1. Google Places Discovery Tool
        self.register(
            "search_businesses_google_places",
            search_businesses_google_places,
            {
                "name": "search_businesses_google_places",
                "description": "Finds real business records using Google Places API (New) with minimum review filtering.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search query like 'plumbers in Dallas TX'"},
                        "min_reviews": {"type": "integer", "description": "Minimum review count, default 50"},
                        "min_rating": {"type": "number", "description": "Minimum rating, default 4.0"}
                    },
                    "required": ["query"]
                }
            }
        )

        # 2. Tavily Web Research Tool
        self.register(
            "research_business_web",
            research_business_web,
            {
                "name": "research_business_web",
                "description": "Performs deep web research via Tavily to verify business sites and leadership.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "business_name": {"type": "string"},
                        "city": {"type": "string"},
                        "domain": {"type": "string"}
                    },
                    "required": ["business_name"]
                }
            }
        )

        # 3. Hunter.io Email Finder
        self.register(
            "find_email_hunter",
            find_email_hunter,
            {
                "name": "find_email_hunter",
                "description": "Finds corporate contact email using Hunter.io for a company domain.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "domain": {"type": "string", "description": "Company domain name like example.com"}
                    },
                    "required": ["domain"]
                }
            }
        )

        # 4. Prospeo Email Finder
        self.register(
            "find_email_prospeo",
            find_email_prospeo,
            {
                "name": "find_email_prospeo",
                "description": "Finds executive email using Prospeo B2B intelligence.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "first_name": {"type": "string"},
                        "last_name": {"type": "string"},
                        "domain": {"type": "string"}
                    },
                    "required": ["first_name", "last_name", "domain"]
                }
            }
        )

        # 5. Netlify Client Demo Deployer
        self.register(
            "deploy_client_demo_netlify",
            deploy_client_demo_netlify,
            {
                "name": "deploy_client_demo_netlify",
                "description": "Deploys an interactive client demo website to Netlify edge and returns live URL.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "site_name": {"type": "string"},
                        "html_content": {"type": "string"}
                    },
                    "required": ["site_name", "html_content"]
                }
            }
        )

        # 6. Gmail Outreach Sender
        self.register(
            "send_gmail_outreach",
            send_gmail_outreach,
            {
                "name": "send_gmail_outreach",
                "description": "Sends cold outreach email via authorized Google Workspace Gmail account.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "access_token": {"type": "string"},
                        "sender_email": {"type": "string"},
                        "sender_name": {"type": "string"},
                        "recipient_email": {"type": "string"},
                        "subject": {"type": "string"},
                        "body_text": {"type": "string"},
                        "thread_id": {"type": "string"}
                    },
                    "required": ["access_token", "sender_email", "sender_name", "recipient_email", "subject", "body_text"]
                }
            }
        )

        # 7. Gmail Inbox Scanner
        self.register(
            "scan_gmail_replies",
            scan_gmail_replies,
            {
                "name": "scan_gmail_replies",
                "description": "Scans inbox for new replies from prospects.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "access_token": {"type": "string"},
                        "query": {"type": "string"}
                    },
                    "required": ["access_token"]
                }
            }
        )
