from typing import Any, Dict, List, Optional
import os
import datetime
from urllib.parse import urlparse
from agent.brain import AgentBrain

from agent.config import WORKER_ID, DRY_RUN
from agent.connectors.google_places import search_businesses_google_places
from agent.connectors.gmail_relay import scan_gmail_replies, send_gmail_outreach, refresh_gmail_access_token
from agent.connectors.netlify_deploy import deploy_client_demo_netlify
from agent.connectors.tavily_search import research_business_web
from agent.connectors.email_finder import find_email_hunter, find_email_prospeo
from agent.state_manager import StateManager


class Orchestrator:
    def __init__(self, store, tool_registry):
        self.store = store
        self.tools = tool_registry
        self.state_manager = StateManager(store)

    def run_once(self) -> Dict[str, Any]:
        worker_id = WORKER_ID
        print(f"[{worker_id}] Orchestrator: enqueuing due schedules...")
        enqueued = self.store.enqueue_due_schedules()

        print(f"[{worker_id}] Orchestrator: claiming due jobs...")
        jobs = self.store.claim_jobs(worker_id=worker_id, limit=5)
        results = []

        print(f"[{worker_id}] Orchestrator: claimed {len(jobs)} jobs")
        for job in jobs:
            job_id = job.get("id")
            # Actual queue schema uses job_type, support workflow_type fallback
            job_type = job.get("job_type") or job.get("workflow_type") or "general"
            payload = job.get("payload") or {}

            print(f"[{worker_id}] Processing job {job_id} ({job_type})")
            try:
                outcome = self.execute_workflow(job_type, payload)
                summary = outcome.get("summary") or f"Executed {job_type} successfully."
                items = outcome.get("items_processed", 0)
                self.store.complete_job(job_id, worker_id, summary=summary, items_processed=items)
                results.append({"id": job_id, "status": "completed", "outcome": outcome})
            except Exception as e:
                print(f"[{worker_id}] Job {job_id} error: {e}")
                self.store.fail_job(job_id, worker_id, error=str(e))
                results.append({"id": job_id, "status": "failed", "error": str(e)})

        enqueued_count = enqueued if isinstance(enqueued, int) else (len(enqueued) if enqueued else 0)
        return {"enqueued": enqueued_count, "processed": len(results), "jobs": results}

    def execute_workflow(self, workflow_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if workflow_type == "daily_lead_discovery":
            return self._handle_daily_lead_discovery(payload)
        elif workflow_type == "inbox_watcher_hourly":
            return self._handle_inbox_watcher_hourly(payload)
        elif workflow_type == "outreach_slot_dispatch":
            return self._handle_outreach_slot_dispatch(payload)
        elif workflow_type == "followup_processor":
            return self._handle_followup_processor(payload)
        elif workflow_type == "daily_report":
            return self._handle_daily_report(payload)
undefinedundefined
        return {"status": "ok", "summary": f"Generic workflow {workflow_type} acknowledged.", "items_processed": 0}

    def _handle_daily_lead_discovery(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        api_key = (
            self.store.get_secret("irzam_google_maps_api_key")
            or self.store.get_secret("irzam_google_maps_key")
            or self.store.get_secret("google_maps_api_key")
        )
        query = payload.get("query") or payload.get("search_query")
        if not query:
            city = payload.get("city") or ""
            niche = payload.get("niche") or "local businesses"
            query = f"{niche} in {city}".strip() if city else str(niche)
        min_reviews = int(payload.get("min_reviews", 50))
        min_rating = float(payload.get("min_rating", 4.0))

        if not api_key:
            return {
                "summary": "Google Places API key is awaiting owner configuration. Discovery paused safely.",
                "items_processed": 0
            }

        hunter_key = self.store.get_secret("irzam_hunter_api_key")
        prospeo_key = self.store.get_secret("irzam_prospeo_api_key")
        try:
            leads = search_businesses_google_places(
                query=query,
                api_key=api_key,
                min_reviews=min_reviews,
                min_rating=min_rating,
            )
            saved_count = 0
            verified_count = 0
            for lead in leads:
                website = str(lead.get("website") or "").strip()
                domain = ""
                if website:
                    parsed = urlparse(website if "://" in website else "https://" + website)
                    domain = (parsed.hostname or "").lower().removeprefix("www.")

                email_result = None
                if domain and hunter_key:
                    candidate = find_email_hunter(domain, api_key=hunter_key)
                    if candidate.get("verification_status") == "verified":
                        email_result = candidate
                    elif prospeo_key and candidate.get("first_name") and candidate.get("last_name"):
                        fallback = find_email_prospeo(
                            candidate["first_name"], candidate["last_name"], domain, api_key=prospeo_key
                        )
                        if fallback.get("verification_status") == "verified":
                            email_result = fallback

                verified = bool(email_result and email_result.get("email"))
                if verified:
                    verified_count += 1

                saved = self.store.save_lead({
                    "business_name": lead["business_name"],
                    "email": email_result.get("email") if verified else None,
                    "phone": lead.get("phone") or None,
                    "city": payload.get("city") or None,
                    "niche": payload.get("niche") or None,
                    "status": "pending",
                    "google_place_id": lead.get("place_id"),
                    "google_rating": lead.get("rating"),
                    "google_reviews_count": lead.get("review_count", 0),
                    "website": website or None,
                    "email_source": email_result.get("source") if verified else None,
                    "email_verified": verified,
                    "notes": (
                        f"Google Places discovery. Address: {lead.get('address', '')}. "
                        f"Email verification: {email_result.get('verification_detail', 'not found') if verified else 'no verified email'}."
                    ),
                })
                if saved:
                    saved_count += 1

            return {
                "summary": (
                    f"Google Places found {len(leads)} qualified businesses; saved {saved_count}. "
                    f"{verified_count} received a provider-verified email. Unverified candidates were not stored as sendable contacts."
                ),
                "items_processed": saved_count,
            }
        except Exception as error:
            raise RuntimeError(f"Lead discovery error: {error}")

    def _handle_agent_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        goal = str(payload.get("goal") or payload.get("query") or "").strip()
        if not goal:
            return {"summary": "Agent task skipped: no goal was provided.", "items_processed": 0}
        result = AgentBrain(self.store, self.tools).run(
            goal,
            task_id=payload.get("task_id"),
            context=payload.get("context") if isinstance(payload.get("context"), dict) else {},
            provider=payload.get("provider") or "auto",
            max_iterations=min(max(int(payload.get("max_iterations", 8)), 1), 8),
        )
        summary = result.get("answer") or result.get("reason") or result.get("error") or result.get("status")
        return {
            "summary": f"Agent task {result.get('status')}: {str(summary)[:700]}",
            "items_processed": len(result.get("tools_used") or []),
            "task_id": result.get("task_id"),
            "agent_result": result,
        }

    def _handle_agent_wake_cycle(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.store.client:
            return {"summary": "Agent wake cycle heartbeat verified; database unavailable for task pickup.", "items_processed": 0}
        pending = (
            self.store.client.table("agent_tasks")
            .select("id,goal,state,priority")
            .eq("status", "pending")
            .order("priority", desc=True)
            .limit(1)
            .execute()
        )
        tasks = pending.data or []
        if not tasks:
            return {"summary": "Agent wake cycle completed; no pending owner tasks were found.", "items_processed": 0}
        task = tasks[0]
        return self._handle_agent_task({
            "task_id": task["id"],
            "goal": task.get("goal"),
            "context": task.get("state") or {},
            "provider": payload.get("provider", "auto"),
            "max_iterations": payload.get("max_iterations", 8),
        })

    def _handle_inbox_watcher_hourly(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.store.client:
            return {"summary": "Database unavailable.", "items_processed": 0}

        # Check connected Gmail accounts
        acc_res = self.store.client.table("gmail_tokens").select("*").eq("connected", True).execute()
        accounts = acc_res.data or []
        if not accounts:
            return {
                "summary": "No authorized Gmail accounts found. Awaiting owner Google OAuth connection in Connectors Marketplace.",
                "items_processed": 0
            }

        client_id = self.store.get_secret("irzam_google_client_id") or os.environ.get("GOOGLE_CLIENT_ID")
        client_secret = self.store.get_secret("irzam_google_client_secret") or os.environ.get("GOOGLE_CLIENT_SECRET")
        total_replies = 0

        for acc in accounts:
            email = acc["email"]
            refresh_token = (
                self.store.get_secret(f"irzam_gmail_token_{email}") or 
                self.store.get_secret("irzam_gmail_refresh_token") or
                acc.get("refresh_token")
            )
            if not refresh_token or not client_id or not client_secret:
                continue

            try:
                access_token = refresh_gmail_access_token(client_id, client_secret, refresh_token)
                replies = scan_gmail_replies(access_token)
                for reply in replies:
                    raw_intent = str(reply.get("intent", "general_inquiry")).lower()
                    db_intents = {
                        "opt_out": "UNSUBSCRIBE",
                        "pricing": "PRICING_INQUIRY",
                        "meeting": "SCHEDULE_CALL",
                        "interested": "HIGH_INTEREST",
                        "not_interested": "OBJECTION",
                        "bounce": "NEUTRAL",
                        "general_inquiry": "NEUTRAL",
                    }
                    self.store.client.table("inbox_replies").upsert({
                        "account_id": acc["id"],
                        "gmail_message_id": reply["gmail_message_id"],
                        "thread_id": reply.get("thread_id"),
                        "from_name": reply.get("from_name", "Prospect"),
                        "from_email": reply.get("from_email", ""),
                        "subject": reply.get("subject", ""),
                        "snippet": reply.get("snippet", ""),
                        "intent": db_intents.get(raw_intent, "NEUTRAL"),
                        "status": "unread",
                    }, on_conflict="gmail_message_id").execute()

                    if raw_intent in ["not_interested", "opt_out", "bounce"]:
                        self.store.suppress_email(
                            reply.get("from_email"),
                            reason="bounce" if raw_intent == "bounce" else "opt_out",
                        )
                    total_replies += 1

                self.store.client.table("gmail_tokens").update({
                    "last_sync_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "inbox_unread_count": len(replies),
                }).eq("id", acc["id"]).execute()
            except Exception as e:
                print(f"[InboxWatcher] Sync failed for {email}: {e}")

        return {
            "summary": f"Hourly inbox scan completed across {len(accounts)} accounts. Processed {total_replies} replies.",
            "items_processed": total_replies
        }

    def _handle_outreach_slot_dispatch(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.store.client:
            return {"summary": "Database unavailable.", "items_processed": 0}

        # Check for due outreach queue items
        now_utc = datetime.datetime.now(datetime.timezone.utc).isoformat()
        queue_res = self.store.client.table("outreach_queue").select("*")\
            .eq("status", "scheduled")\
            .lte("scheduled_for_pkt", now_utc)\
            .order("scheduled_for_pkt", desc=False)\
            .limit(1)\
            .execute()

        due_items = queue_res.data or []
        if not due_items:
            return {
                "summary": "Outreach slot check completed. No scheduled emails are currently due for dispatch.",
                "items_processed": 0
            }

        item = due_items[0]
        recipient = item.get("recipient_email")

        # 1. Suppression check
        if self.store.is_suppressed(recipient):
            self.store.client.table("outreach_queue").update({
                "status": "opted_out",
                "error_message": "Recipient address is on global suppression list."
            }).eq("id", item["id"]).execute()
            return {"summary": f"Email to {recipient} suppressed due to opt-out.", "items_processed": 1}

        # Require a genuinely verified contact before any live send.
        if not recipient or not item.get("lead_id"):
            return {"summary": "Outreach blocked: recipient or linked lead is missing.", "items_processed": 0}
        lead_res = self.store.client.table("leads").select("email,email_verified,email_source").eq("id", item["lead_id"]).limit(1).execute()
        lead_rows = lead_res.data or []
        lead = lead_rows[0] if lead_rows else None
        if not lead or str(lead.get("email", "")).strip().lower() != str(recipient).strip().lower() or lead.get("email_verified") is not True:
            return {"summary": "Outreach blocked: lead email is not verified in the database.", "items_processed": 0}

        # 2. Check connected Gmail account & token
        acc_res = self.store.client.table("gmail_tokens").select("*").eq("connected", True).limit(1).execute()
        accounts = acc_res.data or []
        if not accounts:
            return {
                "summary": "Outreach email queued but paused: Gmail account awaiting connection in Connectors Marketplace.",
                "items_processed": 0
            }

        client_id = self.store.get_secret("irzam_google_client_id") or os.environ.get("GOOGLE_CLIENT_ID")
        client_secret = self.store.get_secret("irzam_google_client_secret") or os.environ.get("GOOGLE_CLIENT_SECRET")
        acc = accounts[0]
        refresh_token = self.store.get_secret("irzam_gmail_refresh_token") or self.store.get_secret(f"irzam_gmail_token_{acc['email']}")

        if not refresh_token or not client_id or not client_secret:
            return {
                "summary": "Gmail OAuth credentials incomplete in Vault. Outreach dispatch deferred safely.",
                "items_processed": 0
            }

        # A dry run must never mutate an item into the "sent" state.
        if DRY_RUN:
            print(f"[DRY_RUN] Eligible outreach item {item['id']} was not sent; queue remains scheduled.")
            return {"summary": f"[DRY_RUN] Eligible outreach to {recipient}; no email was sent and queue was left unchanged.", "items_processed": 0}

        try:
            access_token = refresh_gmail_access_token(client_id, client_secret, refresh_token)
            send_result = send_gmail_outreach(
                access_token=access_token,
                sender_email=acc["email"],
                sender_name="Irzam Studio",
                recipient_email=recipient,
                subject=item.get("subject", "Introduction"),
                body_text=item.get("body", "")
            )
            if not send_result or send_result.get("success") is not True:
                raise RuntimeError("Gmail did not confirm successful delivery acceptance.")
            # Update queue record
            self.store.client.table("outreach_queue").update({
                "status": "sent",
                "sent_at": "now()",
                "sent_via_email": acc["email"]
            }).eq("id", item["id"]).execute()

            # Update lead
            if item.get("lead_id"):
                self.store.client.table("leads").update({
                    "status": "contacted",
                    "last_contacted_at": "now()"
                }).eq("id", item["lead_id"]).execute()

            return {
                "summary": f"Dispatched 1 outreach email to {recipient} via {acc['email']}.",
                "items_processed": 1
            }
        except Exception as e:
            self.store.client.table("outreach_queue").update({
                "status": "failed",
                "error_message": str(e)
            }).eq("id", item["id"]).execute()
            raise RuntimeError(f"Email dispatch failed: {e}")

    def _handle_followup_processor(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.store.client:
            return {"summary": "Database unavailable.", "items_processed": 0}

        now_utc = datetime.datetime.now(datetime.timezone.utc).isoformat()
        due_res = self.store.client.table("outreach_queue").select("*")\
            .eq("status", "sent")\
            .not_.is_("next_followup_due", "null")\
            .lte("next_followup_due", now_utc)\
            .limit(25)\
            .execute()
        due_items = due_res.data or []
        reviewed = 0
        suppressed = 0

        for item in due_items:
            recipient = str(item.get("recipient_email") or "").strip().lower()
            if not recipient:
                continue
            reply_res = self.store.client.table("inbox_replies").select("id,intent")\
                .eq("from_email", recipient).limit(1).execute()
            replies = reply_res.data or []
            if replies:
                intent = str(replies[0].get("intent") or "").lower()
                new_status = "opted_out" if intent in ["opt_out", "not_interested", "bounce"] else "replied"
                self.store.client.table("outreach_queue").update({
                    "status": new_status
                }).eq("id", item["id"]).execute()
                if new_status == "opted_out":
                    self.store.suppress_email(recipient, reason="bounce" if intent == "bounce" else "opt_out")
                    suppressed += 1
            reviewed += 1

        return {
            "summary": f"Reviewed {reviewed} due follow-up records; {suppressed} were suppressed after an opt-out or bounce. No automatic follow-up email is sent by this review step.",
            "items_processed": reviewed
        }

    def _handle_daily_report(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.store.client:
            return {"summary": "Database unavailable.", "items_processed": 0}

        try:
            today = datetime.date.today().isoformat()
            leads_res = self.store.client.table("leads").select("id", count="exact").execute()
            queue_res = self.store.client.table("outreach_queue").select("id, status", count="exact").execute()
            replies_res = self.store.client.table("inbox_replies").select("id", count="exact").execute()

            leads_count = leads_res.count or 0
            queue_items = queue_res.data or []
            sent_count = sum(1 for q in queue_items if q.get("status") == "sent")
            replies_count = replies_res.count or 0

            report = {
                "report_date": today,
                "researched_count": leads_count,
                "qualified_count": leads_count,
                "emails_scheduled": len(queue_items),
                "emails_sent": sent_count,
                "replies_received": replies_count,
                "summary_text": f"Irzam Studio Autonomous Brief: {leads_count} prospects researched, {sent_count} sent, {replies_count} inbound replies.",
                "status": "saved"
            }
            self.store.client.table("daily_reports").insert(report).execute()
            return {"summary": f"Daily report generated and saved for {today}.", "items_processed": 1}
        except Exception as e:
            return {"summary": f"Report generation notice: {e}", "items_processed": 0}
