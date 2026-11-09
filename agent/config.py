import os
import uuid
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL") or "https://fgksgytuglpmzhqcdasb.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")

TIMEZONE = ZoneInfo("Asia/Karachi")
WORKER_ID = f"worker-{os.environ.get('GITHUB_RUN_ID', 'local')}-{str(uuid.uuid4())[:8]}"

DRY_RUN = os.environ.get("DRY_RUN", "true").lower() == "true"
FREELLM_BASE_URL = os.environ.get("FREELLM_BASE_URL", "https://api.freellmapi.com/v1")
FREELLM_API_KEY = os.environ.get("FREELLM_API_KEY", "")
