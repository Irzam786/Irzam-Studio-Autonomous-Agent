from typing import Any, Dict, Optional


class StateManager:
    def __init__(self, store):
        self.store = store

    def load_task(self, task_id: str) -> Dict[str, Any]:
        if not self.store.client:
            return {"id": task_id, "state": {}, "checkpoint": {}}
        try:
            res = self.store.client.table("agent_tasks").select("*").eq("id", task_id).limit(1).execute()
            if res and res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            print(f"[StateManager] load_task note: {e}")
        return {"id": task_id, "state": {}, "checkpoint": {}}

    def save_checkpoint(self, task_id: str, checkpoint: Dict[str, Any], state: Optional[Dict[str, Any]] = None):
        if not self.store.client:
            return
        payload: Dict[str, Any] = {"checkpoint": checkpoint, "updated_at": "now()"}
        if state:
            payload["state"] = state
        try:
            self.store.client.table("agent_tasks").update(payload).eq("id", task_id).execute()
        except Exception as e:
            print(f"[StateManager] save_checkpoint note: {e}")

    def update_task_status(self, task_id: str, status: str, error_message: Optional[str] = None):
        if not self.store.client:
            return
        payload: Dict[str, Any] = {"status": status, "updated_at": "now()"}
        if error_message:
            payload["error_message"] = error_message
        try:
            self.store.client.table("agent_tasks").update(payload).eq("id", task_id).execute()
        except Exception as e:
            print(f"[StateManager] update_task_status note: {e}")

    def record_task_event(self, task_id: str, event_type: str, message: str, payload: Optional[Dict[str, Any]] = None):
        if not self.store.client:
            return
        event = {
            "task_id": task_id,
            "event_type": event_type,
            "message": message,
            "payload": payload or {}
        }
        try:
            self.store.client.table("agent_task_events").insert(event).execute()
        except Exception as e:
            print(f"[StateManager] record_task_event note: {e}")
