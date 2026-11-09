import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.config import SUPABASE_URL, SUPABASE_KEY, WORKER_ID, DRY_RUN
from agent.repository.supabase_store import SupabaseStore
from agent.tool_registry import ToolRegistry
from agent.orchestrator import Orchestrator


def main():
    print(f"[{WORKER_ID}] starting worker (dry_run={DRY_RUN})")
    if not SUPABASE_KEY:
        print("SUPABASE_SERVICE_ROLE_KEY missing; aborting")
        sys.exit(1)
    store = SupabaseStore()
    tools = ToolRegistry(store)
    orchestrator = Orchestrator(store, tools)
    
    # Process due jobs through real Orchestrator
    result = orchestrator.run_once()
    print(f"[{WORKER_ID}] Orchestrator execution outcome: {result}")
    print(f"[{WORKER_ID}] done")


if __name__ == "__main__":
    main()
