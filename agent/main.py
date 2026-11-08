import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.config import SUPABASE_URL, SUPABASE_KEY, WORKER_ID, DRY_RUN


def main():
    print(f"[{WORKER_ID}] starting worker (dry_run={DRY_RUN})")
    if not SUPABASE_KEY:
        print("SUPABASE_SERVICE_ROLE_KEY missing; aborting")
        sys.exit(1)
    print(f"supabase url: {SUPABASE_URL}")
    # TODO: implement job claim + execution loop
    print(f"[{WORKER_ID}] done")


if __name__ == "__main__":
    main()
