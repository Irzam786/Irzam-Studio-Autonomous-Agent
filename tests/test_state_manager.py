import unittest
from types import SimpleNamespace
from unittest.mock import Mock

from agent.state_manager import StateManager


class StateManagerTests(unittest.TestCase):
    def setUp(self):
        self.client = Mock()
        self.store = SimpleNamespace(client=self.client)
        self.manager = StateManager(self.store)

    def test_load_task_returns_persisted_record(self):
        query = self.client.table.return_value
        query.select.return_value = query
        query.eq.return_value = query
        query.limit.return_value = query
        expected = {
            "id": "task-123",
            "status": "paused",
            "state": {"context": {"topic": "agentic automation"}},
            "checkpoint": {"iterations": 4},
        }
        query.execute.return_value = SimpleNamespace(data=[expected])

        self.assertEqual(self.manager.load_task("task-123"), expected)
        self.client.table.assert_called_once_with("agent_tasks")

    def test_load_task_returns_safe_default_when_database_is_unavailable(self):
        self.store.client = None
        self.assertEqual(
            self.manager.load_task("task-456"),
            {"id": "task-456", "state": {}, "checkpoint": {}},
        )

    def test_save_checkpoint_persists_checkpoint_and_state(self):
        query = self.client.table.return_value
        query.update.return_value = query
        query.eq.return_value = query

        checkpoint = {"iterations": 3, "tools_used": ["research_business_web"]}
        state = {"last_answer": "Research complete"}
        self.manager.save_checkpoint("task-123", checkpoint, state)

        payload = query.update.call_args.args[0]
        self.assertEqual(payload["checkpoint"], checkpoint)
        self.assertEqual(payload["state"], state)
        query.eq.assert_called_once_with("id", "task-123")

    def test_update_status_persists_error_when_provided(self):
        query = self.client.table.return_value
        query.update.return_value = query
        query.eq.return_value = query

        self.manager.update_task_status("task-123", "failed", "provider timeout")

        payload = query.update.call_args.args[0]
        self.assertEqual(payload["status"], "failed")
        self.assertEqual(payload["error_message"], "provider timeout")

    def test_record_task_event_inserts_a_structured_event(self):
        query = self.client.table.return_value
        query.insert.return_value = query

        self.manager.record_task_event(
            "task-123",
            "tool_result",
            "Research connector completed.",
            {"tool": "research_business_web"},
        )

        self.client.table.assert_called_once_with("agent_task_events")
        event = query.insert.call_args.args[0]
        self.assertEqual(event["task_id"], "task-123")
        self.assertEqual(event["event_type"], "tool_result")
        self.assertEqual(event["payload"], {"tool": "research_business_web"})


if __name__ == "__main__":
    unittest.main()
