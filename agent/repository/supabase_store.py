import os
from typing import Any, Dict, List, Optional
from supabase import create_client


from agent.config import SUPABASE_URL, SUPABASE_KEY


class SupabaseStore:
    def __init__(self):
        url = SUPABASE_URL
        key = SUPABASE_KEY
        self.client = create_client(url, key) if url and key else None

    def list_due_schedules(self):
        if not self.client:
            return []
        res = self.client.table("agent_schedules").select("*").eq("enabled", True).lte("next_run_at", "now()").execute()
        return res.data or []

    def list_due_jobs(self, limit: int = 10):
        if not self.client:
            return []
        try:
            # 1. Try RPC claim/list
            rpc_res = self.client.rpc("claim_agent_jobs", {"p_worker_id": "worker", "p_limit": limit}).execute()
            if rpc_res.data:
                return rpc_res.data
        except Exception:
            pass
        # 2. Resilient fallback query
        try:
            res = self.client.table("agent_job_queue").select("*").in_("status", ["pending", "failed"]).limit(limit).execute()
            return res.data or []
        except Exception as e:
            print(f"agent_job_queue query notice: {e}")
            return []

    def claim_job(self, job_id: str, worker_id: str):
        if not self.client:
            return None
        res = self.client.table("agent_job_queue").update({"status": "running", "worker_id": worker_id}).eq("id", job_id).eq("status", "pending").execute()
        return res.data[0] if res.data else None

    def complete_job(self, job_id: str, result: Dict[str, Any]):
        if not self.client:
            return
        self.client.table("agent_job_queue").update({"status": "completed", "result": result}).eq("id", job_id).execute()

    def fail_job(self, job_id: str, error: str):
        if not self.client:
            return
        self.client.table("agent_job_queue").update({"status": "failed", "error": error}).eq("id", job_id).execute()
