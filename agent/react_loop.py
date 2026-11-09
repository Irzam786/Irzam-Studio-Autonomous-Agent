import json
from typing import Any, Callable, Dict, List, Optional


def run_react_loop(
    task: Dict[str, Any],
    llm_call: Callable,
    tool_registry: Any,
    max_iterations: int = 8,
    on_event: Optional[Callable[[str, str, Dict[str, Any]], None]] = None,
) -> Dict[str, Any]:
    """Run a bounded, recoverable ReAct loop using registered tools only."""
    history: List[Dict[str, Any]] = []
    used_tools: List[str] = []

    def emit(event_type: str, message: str, payload: Optional[Dict[str, Any]] = None):
        if on_event:
            try:
                on_event(event_type, message, payload or {})
            except Exception:
                pass

    for iteration in range(max_iterations):
        emit("thinking", f"Reasoning iteration {iteration + 1}", {"iteration": iteration + 1})
        response = llm_call(task, history, tool_registry)
        if not isinstance(response, dict):
            return {"status": "failed", "error": "LLM returned an invalid response.", "iterations": iteration + 1}

        response_type = response.get("type")
        if response_type == "final":
            answer = str(response.get("content") or "")
            emit("complete", "Agent completed the task.", {"iterations": iteration + 1, "tools_used": used_tools})
            return {
                "status": "completed",
                "answer": answer,
                "iterations": iteration + 1,
                "tools_used": used_tools,
                "history": history,
            }

        if response_type == "pause":
            reason = str(response.get("reason") or "Agent paused.")
            return {"status": "paused", "reason": reason, "iterations": iteration + 1, "tools_used": used_tools, "history": history}

        if response_type != "tool_call":
            return {"status": "failed", "error": f"Unsupported LLM response type: {response_type}", "iterations": iteration + 1}

        name = str(response.get("tool") or "")
        args = response.get("args") or {}
        if not isinstance(args, dict):
            args = {}
        if not name:
            history.append({"role": "user", "content": "The tool request had no tool name. Choose a registered tool or provide a final answer."})
            continue

        emit("tool_start", f"Running {name}", {"tool": name})
        try:
            result = tool_registry.execute(name, args)
            used_tools.append(name)
            safe_result = json.dumps(result, ensure_ascii=False, default=str)[:12000]
            history.append({"role": "assistant", "content": f"I called the registered tool {name}."})
            history.append({"role": "user", "content": f"Tool result from {name}: {safe_result}"})
            emit("tool_result", f"{name} completed.", {"tool": name})
        except Exception as error:
            error_text = str(error)[:1000]
            history.append({"role": "assistant", "content": f"I attempted the registered tool {name}."})
            history.append({"role": "user", "content": f"Tool {name} failed: {error_text}. Try another available approach or explain the blocker."})
            emit("error", f"{name} failed: {error_text}", {"tool": name})

    return {
        "status": "paused",
        "reason": "max_iterations_reached",
        "iterations": max_iterations,
        "tools_used": used_tools,
        "history": history,
    }
