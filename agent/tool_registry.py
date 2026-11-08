from typing import Callable, Dict, Any


class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, Callable] = {}

    def register(self, name: str, fn: Callable):
        self.tools[name] = fn

    def has(self, name: str) -> bool:
        return name in self.tools

    def execute(self, name: str, args: Dict[str, Any]) -> Any:
        if name not in self.tools:
            raise ValueError(f"Unknown tool: {name}")
        return self.tools[name](**args)
