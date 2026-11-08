import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.config import SUPABASE_URL, SUPABASE_KEY, WORKER_ID, DRY_RUN
from agent.repository.supabase_store import SupabaseStore
from agent.tool_registry import ToolRegistry


def main():
    print(f"[{WORKER_ID}] starting worker (dry_run={DRY_RUN})")
    if not SUPABASE_KEY:
        print("SUPABASE_SERVICE_ROLE_KEY missing; aborting")
        sys.exit(1)
    store = SupabaseStore()
    tools = ToolRegistry()
    jobs = store.list_due_jobs(limit=5)
    print(f"due jobs: {len(jobs)}")
    for job in jobs:
        claimed = store.claim_job(job["id"], WORKER_ID)
        if not claimed:
            continue
        print(f"claimed job {job['id']}")
        # TODO: dispatch to workflow handler
        store.complete_job(job["id"], {"note": "no-op placeholder"})
    print(f"[{WORKER_ID}] done")


if __name__ == "__main__":
    main()
