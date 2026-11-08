from typing import Any, Dict, List, Optional


def run_react_loop(task: Dict[str, Any], llm_call, tool_registry, max_iterations: int = 12) -> Dict[str, Any]:
    """Bounded ReAct loop. Returns final answer or paused state."""
    history: List[Dict[str, Any]] = []
    for i in range(max_iterations):
        response = llm_call(task, history, tool_registry)
        if response.get("type") == "final":
            return {"status": "completed", "answer": response.get("content"), "iterations": i + 1}
        if response.get("type") == "tool_call":
            name = response["tool"]
            args = response.get("args", {})
            try:
                result = tool_registry.execute(name, args)
                history.append({"role": "tool", "name": name, "result": result})
            except Exception as e:
                history.append({"role": "tool", "name": name, "error": str(e)})
                return {"status": "failed", "error": str(e), "iterations": i + 1}
        if response.get("type") == "pause":
            return {"status": "paused", "reason": response.get("reason"), "iterations": i + 1}
    return {"status": "paused", "reason": "max_iterations_reached", "iterations": max_iterations}
