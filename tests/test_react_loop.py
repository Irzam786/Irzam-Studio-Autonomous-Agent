import unittest

from agent.react_loop import run_react_loop


class FakeToolRegistry:
    def __init__(self, tools=None):
        self.tools = tools or {}

    def get_definitions(self):
        return []

    def execute(self, name, args):
        if name not in self.tools:
            raise ValueError(f"Unknown or disallowed tool: {name}")
        return self.tools[name](**args)


class ReActLoopTests(unittest.TestCase):
    def test_returns_final_answer_without_calling_tools(self):
        events = []

        def llm_call(task, history, registry):
            self.assertEqual(task["goal"], "Summarize the system")
            self.assertEqual(history, [])
            return {"type": "final", "content": "The system is ready."}

        result = run_react_loop(
            {"goal": "Summarize the system"},
            llm_call,
            FakeToolRegistry(),
            on_event=lambda kind, message, payload: events.append((kind, message, payload)),
        )

        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["answer"], "The system is ready.")
        self.assertEqual(result["iterations"], 1)
        self.assertEqual(result["tools_used"], [])
        self.assertEqual(events[-1][0], "complete")

    def test_executes_registered_tool_and_returns_tool_result_to_model(self):
        seen_history = []

        def llm_call(task, history, registry):
            seen_history.append(list(history))
            if not history:
                return {
                    "type": "tool_call",
                    "tool": "add",
                    "args": {"left": 2, "right": 3},
                }
            self.assertIn("Tool result from add: 5", history[-1]["content"])
            return {"type": "final", "content": "The result is 5."}

        registry = FakeToolRegistry({"add": lambda left, right: left + right})
        result = run_react_loop({"goal": "Add two numbers"}, llm_call, registry)

        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["answer"], "The result is 5.")
        self.assertEqual(result["iterations"], 2)
        self.assertEqual(result["tools_used"], ["add"])
        self.assertEqual(len(seen_history), 2)

    def test_unknown_tool_failure_is_returned_to_model_for_recovery(self):
        def llm_call(task, history, registry):
            if not history:
                return {"type": "tool_call", "tool": "not_allowed", "args": {}}
            self.assertIn("Tool not_allowed failed:", history[-1]["content"])
            return {"type": "final", "content": "I cannot use that tool."}

        result = run_react_loop(
            {"goal": "Try a tool"},
            llm_call,
            FakeToolRegistry(),
        )

        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["tools_used"], [])

    def test_pause_response_preserves_reason(self):
        result = run_react_loop(
            {"goal": "Wait for approval"},
            lambda task, history, registry: {"type": "pause", "reason": "Owner approval required."},
            FakeToolRegistry(),
        )

        self.assertEqual(result["status"], "paused")
        self.assertEqual(result["reason"], "Owner approval required.")

    def test_invalid_model_response_fails_cleanly(self):
        result = run_react_loop(
            {"goal": "Invalid response"},
            lambda task, history, registry: {"type": "unexpected"},
            FakeToolRegistry(),
        )

        self.assertEqual(result["status"], "failed")
        self.assertIn("Unsupported LLM response type", result["error"])

    def test_loop_stops_at_configured_iteration_limit(self):
        calls = []

        def llm_call(task, history, registry):
            calls.append(1)
            return {"type": "tool_call", "tool": "ping", "args": {}}

        result = run_react_loop(
            {"goal": "Keep working"},
            llm_call,
            FakeToolRegistry({"ping": lambda: "pong"}),
            max_iterations=2,
        )

        self.assertEqual(result["status"], "paused")
        self.assertEqual(result["reason"], "max_iterations_reached")
        self.assertEqual(result["iterations"], 2)
        self.assertEqual(len(calls), 2)
        self.assertEqual(result["tools_used"], ["ping", "ping"])


if __name__ == "__main__":
    unittest.main()
