import os
import uuid
from typing import Any, Dict, Optional

from agent.llm.freellm_qwen import FreeLLMQwen
from agent.llm.gemini import GoogleGemini
from agent.react_loop import run_react_loop
from agent.state_manager import StateManager


SYSTEM_PROMPT = (
    "You are Irzam Studio's autonomous business-research agent. "
    "Use registered tools when live business facts, websites, or contact information are needed. "
    "Never invent business records, phone numbers, domains, or email addresses. "
    "Clearly distinguish verified from unverified emails. "
    "You may research and read data, but you cannot send email, change customer data, or deploy websites through tools. "
    "When the task is complete, provide a concise factual summary and list any missing connector credentials."
)


class AgentBrain:
    """Vault-backed Qwen/Gemini function-calling brain for persisted agent tasks."""

    def __init__(self, store, tool_registry):
        self.store = store
        self.tools = tool_registry
        self.state = StateManager(store)

    def _secret(self, name: str, env_name: str) -> str:
        return (self.store.get_secret(name) if self.store else None) or os.environ.get(env_name, "")

    def _provider(self, preferred: str = "auto"):
        qwen_key = self._secret("irzam_freellmapi_key", "FREELLM_API_KEY")
        gemini_key = self._secret("irzam_gemini_api_key", "GEMINI_API_KEY")
        requested = (preferred or "auto").lower()

        if requested in ("gemini", "google") or (requested == "auto" and not qwen_key and gemini_key):
            if not gemini_key:
                raise RuntimeError("Gemini API key is not configured in the Integrations Marketplace.")
            return "gemini", GoogleGemini(api_key=gemini_key)
        if requested not in ("auto", "qwen", "freellm"):
            raise RuntimeError("Unsupported AI provider. Choose Qwen or Gemini.")
        if not qwen_key:
            raise RuntimeError("FreeLLMAPI Qwen key is not configured in the Integrations Marketplace.")
        return "qwen", FreeLLMQwen(api_key=qwen_key)

    def run(self, goal: str, task_id: Optional[str] = None, context: Optional[Dict[str, Any]] = None,
            provider: str = "auto", max_iterations: int = 8) -> Dict[str, Any]:
        if not goal or not str(goal).strip():
            raise ValueError("A non-empty agent goal is required.")

        selected_provider, llm = self._provider(provider)
        task_id = task_id or ("task-" + str(uuid.uuid4()))
        if self.store and self.store.client:
            try:
                self.store.client.table("agent_tasks").upsert({
                    "id": task_id,
                    "goal": str(goal)[:4000],
                    "workflow_type": "agent_task",
                    "status": "running",
                    "state": {"provider": selected_provider, "context": context or {}},
                    "checkpoint": {},
                }).execute()
            except Exception as error:
                raise RuntimeError(f"Could not persist agent task: {error}")

        def event(event_type: str, message: str, payload: Dict[str, Any]):
            if self.store and self.store.client:
                self.state.record_task_event(task_id, event_type, message, payload)

        def llm_call(task: Dict[str, Any], history, registry):
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": "Goal: " + str(task["goal"]) + "\nContext: " + str(task.get("context") or {})},
            ]
            messages.extend(history)
            return llm.complete(messages, registry.get_definitions())

        result = run_react_loop(
            {"goal": str(goal), "context": context or {}},
            llm_call,
            self.tools,
            max_iterations=max_iterations,
            on_event=event,
        )
        if self.store and self.store.client:
            final_status = result.get("status", "failed")
            self.state.update_task_status(task_id, final_status, result.get("error"))
            self.state.save_checkpoint(task_id, {
                "provider": selected_provider,
                "iterations": result.get("iterations", 0),
                "tools_used": result.get("tools_used", []),
                "reason": result.get("reason"),
            }, {"provider": selected_provider, "last_answer": result.get("answer", "")[:8000]})
        result["task_id"] = task_id
        result["provider"] = selected_provider
        return result
