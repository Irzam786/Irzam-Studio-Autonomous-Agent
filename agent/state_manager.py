from typing import Any, Dict


class StateManager:
    def __init__(self, store):
        self.store = store

    def load_task(self, task_id: str) -> Dict[str, Any]:
        # placeholder: fetch from Supabase agent_tasks when available
        return {"id": task_id, "state": {}, "checkpoint": {}}

    def save_checkpoint(self, task_id: str, checkpoint: Dict[str, Any]):
        # placeholder: persist checkpoint
        pass
