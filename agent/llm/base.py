from typing import Any, Dict, List


class LLMBase:
    def complete(self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        raise NotImplementedError
