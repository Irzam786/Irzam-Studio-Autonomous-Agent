from typing import Any, Dict


class Orchestrator:
    def __init__(self, store, tool_registry):
        self.store = store
        self.tools = tool_registry

    def run_once(self):
        jobs = self.store.list_due_jobs(limit=5)
        for job in jobs:
            claimed = self.store.claim_job(job["id"], "worker")
            if not claimed:
                continue
            try:
                self.store.complete_job(job["id"], {"note": "completed"})
            except Exception as e:
                self.store.fail_job(job["id"], str(e))
