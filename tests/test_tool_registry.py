import os
import unittest
from unittest.mock import patch

from agent.tool_registry import ToolRegistry


class FakeStore:
    def __init__(self, secrets=None):
        self.secrets = secrets or {}

    def get_secret(self, name):
        return self.secrets.get(name)


class ToolRegistryTests(unittest.TestCase):
    def test_default_registry_exposes_only_registered_read_research_tools(self):
        registry = ToolRegistry()
        names = {item["name"] for item in registry.get_definitions()}
        self.assertEqual(names, {
            "search_businesses_google_places",
            "research_business_web",
            "find_email_hunter",
            "find_email_prospeo",
        })
        self.assertTrue(registry.has("research_business_web"))
        self.assertFalse(registry.has("send_email"))

    def test_unknown_tool_is_rejected(self):
        registry = ToolRegistry()
        with self.assertRaisesRegex(ValueError, "Unknown or disallowed tool"):
            registry.execute("send_email", {"to": "recipient@example.com"})

    def test_custom_tool_and_schema_can_be_registered(self):
        registry = ToolRegistry()
        registry.register(
            "safe_echo",
            lambda value: {"echo": value},
            {
                "name": "safe_echo",
                "description": "Return the supplied value.",
                "parameters": {
                    "type": "object",
                    "properties": {"value": {"type": "string"}},
                    "required": ["value"],
                },
            },
        )
        self.assertEqual(registry.execute("safe_echo", {"value": "hello"}), {"echo": "hello"})
        self.assertEqual(registry.get_definitions()[-1]["name"], "safe_echo")

    @patch("agent.tool_registry.search_businesses_google_places")
    def test_provider_secret_is_loaded_server_side(self, search):
        search.return_value = [{"business_name": "Example"}]
        registry = ToolRegistry(FakeStore({"irzam_google_maps_api_key": "vault-test-secret"}))

        result = registry._places("coffee shops in Lahore")

        self.assertEqual(result, [{"business_name": "Example"}])
        search.assert_called_once_with(
            "coffee shops in Lahore",
            api_key="vault-test-secret",
            min_reviews=50,
            min_rating=4.0,
        )


if __name__ == "__main__":
    unittest.main()
