from typing import Any, Dict
from agent.connectors.google_places import search_businesses_google_places
from agent.connectors.gmail_relay import scan_gmail_replies, send_gmail_outreach
from agent.connectors.netlify_deploy import deploy_client_demo_netlify


class Orchestrator:
    def __init__(self, store, tool_registry):
        self.store = store
        self.tools = tool_registry

    def run_once(self) -> Dict[str, Any]:
        jobs = self.store.list_due_jobs(limit=5)
        results = []

        for job in jobs:
            job_id = job.get("id")
            claimed = self.store.claim_job(job_id, "worker")
            if not claimed:
                continue

            workflow = job.get("workflow_type", "general")
            payload = job.get("payload", {})

            try:
                outcome = self.execute_workflow(workflow, payload)
                self.store.complete_job(job_id, outcome)
                results.append({"id": job_id, "status": "completed", "outcome": outcome})
            except Exception as e:
                self.store.fail_job(job_id, str(e))
                results.append({"id": job_id, "status": "failed", "error": str(e)})

        return {"processed": len(results), "jobs": results}

    def execute_workflow(self, workflow_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if workflow_type == "daily_lead_discovery":
            query = payload.get("query", "software companies in Dallas TX")
            min_reviews = payload.get("min_reviews", 50)
            leads = search_businesses_google_places(query=query, min_reviews=min_reviews)
            return {"discovered_leads": len(leads), "leads": leads[:5]}

        elif workflow_type == "inbox_watcher_hourly":
            token = payload.get("access_token", "")
            if not token:
                return {"note": "No Gmail access token provided. Skipped."}
            replies = scan_gmail_replies(token)
            return {"replies_count": len(replies)}

        elif workflow_type == "outreach_slot_dispatch":
            return {"dispatched": 0, "status": "checked_queue_slots"}

        return {"status": "ok", "workflow": workflow_type}
