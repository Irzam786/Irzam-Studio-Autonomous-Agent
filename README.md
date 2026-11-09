# Irzam Studio — Autonomous Operative Platform

Production autonomous agency platform with React/Vite UI, Express/TypeScript backend, Supabase persistence/Vault, durable Python ReAct agent, and GitHub Actions cron worker.

- **Repository:** `Irzam786/Irzam-Studio-Autonomous-Agent`
- **Default Branch:** `main`
- **Supabase Project:** `Irzam Studio` (`fgksgytuglpmzhqcdasb.supabase.co`)
- **Primary Hosting:** Google AI Studio Build Mode → Cloud Run (`.ai.studio`)

---

## 1. Architecture Overview

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS dark tactical interface.
- **Backend:** Express API (`server.ts` / `server/app.ts`) serving `/api/*` and static production build on port 3000.
- **Autonomous Worker:** Python 3.11 ReAct agent (`agent/main.py`) triggered every 30 minutes via GitHub Actions (`.github/workflows/agent-worker.yml`).
- **Persistence & Vault:** Supabase PostgreSQL (`leads`, `campaigns`, `outreach_queue`, `inbox_replies`, `agent_tasks`, `owner_auth_settings`) with Supabase Vault (`get_irzam_secret`, `set_irzam_secret`).
- **Security:** Scrypt-salted persistent owner PIN verification, HMAC SHA-256 session signing, versioned token invalidation.

---

## 2. Environment Variables & Infrastructure Secrets

Set these in your hosting environment (Google AI Studio / Cloud Run) and GitHub Actions secrets:

### Required for Production Hosting
```bash
SUPABASE_URL=https://fgksgytuglpmzhqcdasb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>
SESSION_SECRET=<random_string_at_least_32_characters>
PORT=3000
NODE_ENV=production
```

### Required for GitHub Actions Worker
In GitHub repository settings (`Settings -> Secrets and variables -> Actions`):
- `SUPABASE_SERVICE_ROLE_KEY`: Service-role key for `fgksgytuglpmzhqcdasb.supabase.co`

*(Note: Provider API keys are stored in Supabase Vault via the web UI and retrieved securely by the worker at runtime).*

---

## 3. Local Development

```bash
# Install dependencies
npm install

# Start Express + Vite dev server (runs on port 3000)
npm run dev

# Run TypeScript check and lint
npm run lint

# Production build test
npm run build
```

---

## 4. Google AI Studio & Cloud Run Deployment

1. **Connect / Push Repository:**
   Ensure latest code on branch `main` in `Irzam786/Irzam-Studio-Autonomous-Agent`.
2. **Import into Google AI Studio:**
   Open Google AI Studio, select Build / Import, and select repository `Irzam786/Irzam-Studio-Autonomous-Agent` (branch `main`).
3. **Configure Environment Variables:**
   Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SESSION_SECRET` in environment settings.
4. **Publish / Deploy:**
   Publish application. Cloud Run binds port 3000 and serves both the Express backend and React frontend.
5. **Set Custom `.ai.studio` Domain:**
   Claim your custom `.ai.studio` address in project settings.

---

## 5. Post-Deployment Owner Setup Checklist

1. **Login:**
   Open your live application URL and enter your clearance PIN (default: `7860`).
2. **Open Connectors Tab:**
   Navigate to the **Connectors** tab on the left sidebar.
3. **Configure Providers:**
   - **FreeLLM / Qwen:** Enter API Key and click **Save & Test Connection**.
   - **Google Gemini:** Enter Gemini API Key and test connection.
   - **Google Places API:** Enter Maps/Places key for lead discovery.
   - **Hunter.io / Prospeo:** Enter keys for email verification.
   - **Tavily:** Enter key for prospect deep research.
   - **Google Workspace / Gmail OAuth:** Set up Google Cloud OAuth client with redirect URI `https://<YOUR-APP>.ai.studio/oauth/callback` and click **Connect Gmail**.
4. **Enable Live Automation:**
   Once verified, toggle **Enable Live Automation** when ready for live outreach.

---

## 6. GitHub Actions Worker Schedule

The background worker runs automatically every 30 minutes (`5,35 * * * *`):
1. Loads due schedules (`enqueue_due_agent_schedules`).
2. Atomically claims jobs (`claim_agent_jobs`).
3. Executes lead discovery, outreach email slot, and inbox reply processing.
4. Completes/fails jobs via RPC (`complete_agent_job`, `fail_agent_job`).
