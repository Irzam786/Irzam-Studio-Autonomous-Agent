import unittest
from unittest.mock import Mock, patch

from agent.llm.freellm_qwen import FreeLLMQwen
from agent.llm.gemini import GoogleGemini, _gemini_schema


def mock_response(payload):
    response = Mock()
    response.ok = True
    response.json.return_value = payload
    return response


class FreeLLMQwenTests(unittest.TestCase):
    def test_parse_arguments_accepts_dict_and_json(self):
        self.assertEqual(FreeLLMQwen._parse_arguments({"query": "shops"}), {"query": "shops"})
        self.assertEqual(FreeLLMQwen._parse_arguments('{"query":"shops"}'), {"query": "shops"})

    def test_parse_arguments_rejects_invalid_or_non_object_json(self):
        self.assertEqual(FreeLLMQwen._parse_arguments("{broken"), {})
        self.assertEqual(FreeLLMQwen._parse_arguments("[1, 2]"), {})
        self.assertEqual(FreeLLMQwen._parse_arguments(None), {})

    @patch("agent.llm.freellm_qwen.requests.post")
    def test_complete_parses_native_tool_call(self, post):
        post.return_value = mock_response({
            "model": "qwen-test",
            "choices": [{
                "message": {
                    "tool_calls": [{
                        "id": "call-1",
                        "type": "function",
                        "function": {
                            "name": "lookup",
                            "arguments": '{"term":"Irzam Studio"}',
                        },
                    }]
                }
            }],
        })
        tool = {
            "name": "lookup",
            "description": "Look up a record.",
            "parameters": {"type": "object", "properties": {"term": {"type": "string"}}},
        }
        result = FreeLLMQwen(api_key="test-key").complete(
            [{"role": "user", "content": "Find it"}], [tool]
        )

        self.assertEqual(result, {
            "type": "tool_call",
            "tool": "lookup",
            "args": {"term": "Irzam Studio"},
        })
        payload = post.call_args.kwargs["json"]
        self.assertEqual(payload["tools"], [{"type": "function", "function": tool}])
        self.assertEqual(payload["tool_choice"], "auto")

    @patch("agent.llm.freellm_qwen.requests.post")
    def test_complete_returns_final_text(self, post):
        post.return_value = mock_response({
            "model": "qwen-test",
            "choices": [{"message": {"content": "Finished."}}],
        })
        result = FreeLLMQwen(api_key="test-key").complete(
            [{"role": "user", "content": "Explain"}]
        )
        self.assertEqual(result, {"type": "final", "content": "Finished."})


class GoogleGeminiTests(unittest.TestCase):
    def test_gemini_schema_recursively_converts_types(self):
        schema = {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "filters": {
                    "type": "array",
                    "items": {"type": "object", "properties": {"active": {"type": "boolean"}}},
                },
            },
        }
        converted = _gemini_schema(schema)
        self.assertEqual(converted["type"], "OBJECT")
        self.assertEqual(converted["properties"]["query"]["type"], "STRING")
        self.assertEqual(converted["properties"]["filters"]["items"]["type"], "OBJECT")
        self.assertEqual(
            converted["properties"]["filters"]["items"]["properties"]["active"]["type"],
            "BOOLEAN",
        )

    @patch("agent.llm.gemini.requests.post")
    def test_complete_parses_function_call(self, post):
        post.return_value = mock_response({
            "candidates": [{
                "content": {
                    "parts": [{
                        "functionCall": {
                            "name": "lookup",
                            "args": {"term": "Irzam Studio"},
                        }
                    }]
                }
            }]
        })
        tool = {
            "name": "lookup",
            "description": "Look up a record.",
            "parameters": {"type": "object", "properties": {"term": {"type": "string"}}},
        }
        result = GoogleGemini(api_key="test-key").complete(
            [
                {"role": "system", "content": "Use tools safely."},
                {"role": "user", "content": "Find it"},
            ],
            [tool],
        )

        self.assertEqual(result, {
            "type": "tool_call",
            "tool": "lookup",
            "args": {"term": "Irzam Studio"},
        })
        payload = post.call_args.kwargs["json"]
        self.assertEqual(payload["systemInstruction"]["parts"][0]["text"], "Use tools safely.")
        self.assertEqual(payload["tools"][0]["functionDeclarations"][0]["name"], "lookup")
        self.assertEqual(
            payload["tools"][0]["functionDeclarations"][0]["parameters"]["type"],
            "OBJECT",
        )

    @patch("agent.llm.gemini.requests.post")
    def test_complete_returns_final_text(self, post):
        post.return_value = mock_response({
            "candidates": [{
                "content": {"parts": [{"text": "Gemini response."}]}
            }]
        })
        result = GoogleGemini(api_key="test-key").complete(
            [{"role": "user", "content": "Explain"}]
        )
        self.assertEqual(result, {"type": "final", "content": "Gemini response."})


if __name__ == "__main__":
    unittest.main()
