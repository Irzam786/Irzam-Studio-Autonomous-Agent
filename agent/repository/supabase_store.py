import os
from typing import Any, Dict, List, Optional
from supabase import create_client

from agent.config import SUPABASE_URL, SUPABASE_KEY


class SupabaseStore:
    def __init__(self):
        url = SUPABASE_URL
        key = SUPABASE_KEY
        self.client = create_client(url, key) if url and key else None

    def enqueue_due_schedules(self, now: Optional[str] = None) -> List[Dict[str, Any]]:
        if not self.client:
            return []
        try:
            res = self.client.rpc("enqueue_due_agent_schedules", {"p_now": now or "now()"}).execute()
            if res and res.data:
                return [res.data] if isinstance(res.data, dict) else res.data
        except Exception as e:
            print(f"[SupabaseStore] enqueue_due_agent_schedules RPC note: {e}")

        # Fallback to manual schedule scan
        try:
            due_res = self.client.table("agent_schedules").select("*").eq("enabled", True).lte("next_run_at", "now()").execute()
            due_schedules = due_res.data or []
            enqueued = []
            for s in due_schedules:
                job_type = s.get("workflow_type") or s.get("schedule_key")
                job_record = {
                    "job_type": job_type,
                    "payload": s.get("settings") or {},
                    "schedule_id": s.get("id"),
                    "status": "pending"
                }
                ins = self.client.table("agent_job_queue").insert(job_record).execute()
                if ins.data:
                    enqueued.append(ins.data[0])
            return enqueued
        except Exception as e:
            print(f"[SupabaseStore] manual enqueue fallback note: {e}")
            return []

    def claim_jobs(self, worker_id: str, limit: int = 5, lock_seconds: int = 600) -> List[Dict[str, Any]]:
        if not self.client:
            return []
        try:
            res = self.client.rpc("claim_agent_jobs", {
                "p_worker_id": worker_id,
                "p_limit": limit,
                "p_lock_seconds": lock_seconds
            }).execute()
            if res and res.data:
                return res.data
        except Exception as e:
            print(f"[SupabaseStore] claim_agent_jobs RPC note: {e}")

        # Fallback to direct table query
        try:
            due = self.client.table("agent_job_queue").select("*").in_("status", ["pending", "failed"]).limit(limit).execute()
            jobs = due.data or []
            claimed = []
            for j in jobs:
                upd = self.client.table("agent_job_queue").update({
                    "status": "running",
                    "locked_by": worker_id,
                    "locked_at": "now()"
                }).eq("id", j["id"]).eq("status", j["status"]).execute()
                if upd and upd.data:
                    claimed.append(upd.data[0])
            return claimed
        except Exception as e:
            print(f"[SupabaseStore] fallback claim note: {e}")
            return []

    def complete_job(self, job_id: str, worker_id: str, summary: str = "", items_processed: int = 0):
        if not self.client:
            return
        try:
            self.client.rpc("complete_agent_job", {
                "p_job_id": job_id,
                "p_worker_id": worker_id,
                "p_summary": summary,
                "p_items_processed": items_processed
            }).execute()
            return
        except Exception as e:
            print(f"[SupabaseStore] complete_agent_job RPC note: {e}")

        try:
            self.client.table("agent_job_queue").update({
                "status": "completed",
                "result_summary": summary,
                "locked_by": None,
                "updated_at": "now()"
            }).eq("id", job_id).execute()
        except Exception as e:
            print(f"[SupabaseStore] complete fallback note: {e}")

    def fail_job(self, job_id: str, worker_id: str, error: str = "", retry_delay_seconds: int = 300):
        if not self.client:
            return
        try:
            self.client.rpc("fail_agent_job", {
                "p_job_id": job_id,
                "p_worker_id": worker_id,
                "p_error": error,
                "p_retry_delay_seconds": retry_delay_seconds
            }).execute()
            return
        except Exception as e:
            print(f"[SupabaseStore] fail_agent_job RPC note: {e}")

        try:
            self.client.table("agent_job_queue").update({
                "status": "failed",
                "last_error": error,
                "locked_by": None,
                "updated_at": "now()"
            }).eq("id", job_id).execute()
        except Exception as e:
            print(f"[SupabaseStore] fail fallback note: {e}")

    def get_secret(self, secret_name: str) -> Optional[str]:
        if not self.client:
            return os.environ.get(secret_name.upper()) or os.environ.get(secret_name)
        try:
            res = self.client.rpc("get_irzam_secret", {"secret_name": secret_name}).execute()
            if res and res.data and isinstance(res.data, str):
                return res.data
        except Exception:
            pass
        return os.environ.get(secret_name.upper()) or os.environ.get(secret_name)

    def is_suppressed(self, email: str) -> bool:
        if not self.client or not email:
            return False
        try:
            res = self.client.table("suppression_list").select("id").eq("email", email.strip().lower()).limit(1).execute()
            return bool(res and res.data and len(res.data) > 0)
        except Exception:
            return False

    def suppress_email(self, email: str, reason: str = "opt_out"):
        if not self.client or not email:
            return
        try:
            self.client.table("suppression_list").upsert({
                "email": email.strip().lower(),
                "reason": reason
            }, on_conflict="email").execute()
        except Exception as e:
            print(f"[SupabaseStore] suppress_email note: {e}")

    def save_lead(self, lead_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.client:
            return None
        try:
            if lead_data.get("google_place_id"):
                res = self.client.table("leads").upsert(lead_data, on_conflict="google_place_id").execute()
            else:
                res = self.client.table("leads").insert(lead_data).execute()
            return res.data[0] if res and res.data else None
        except Exception as e:
            print(f"[SupabaseStore] save_lead note: {e}")
            return None
