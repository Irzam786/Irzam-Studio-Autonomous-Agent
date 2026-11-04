# Irzam Studio

React + Express workspace. The Express server serves the built Vite frontend and exposes the API.

## Current safety state

- Browser-side Supabase table access is disabled.
- Supabase credentials are accessed server-side only through `SUPABASE_SERVICE_ROLE_KEY`.
- Existing FreeLLMAPI key and owner PIN were moved from `system_config` into Supabase Vault; the plaintext columns were cleared.
- API routes require a signed, HttpOnly owner session. Set `SESSION_SECRET` (32+ characters).
- AI chat uses the OpenAI-compatible FreeLLMAPI `/chat/completions` endpoint and Qwen model selection.
- Google Places route calls the real Places API and filters for the minimum review count and a website.
- Gmail OAuth/sending, scheduled jobs, automatic follow-ups, and Netlify deployments remain disabled until their real integrations are implemented and verified. The app must not show these as connected or claim messages were sent.
- Leads, training rules/messages, campaigns, and outreach queue use server-side Supabase persistence. Reports, workflow history, demo records, and Gmail account metadata are read from Supabase.
- Chat conversations remain in the browser's local storage for now; server-side chat-session persistence is not yet wired.
- Dashboard operational records start empty; mock sample leads, Gmail accounts, reports, and demo URLs were removed.

## Required environment variables

Copy `.env.example` to `.env` for local development or configure the values as server-side environment secrets on the hosting provider.

Required:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side secret; never expose to browser)
- `SESSION_SECRET` (random secret of at least 32 characters)

The existing Qwen API key and owner PIN are stored in Supabase Vault. The backend reads them through the restricted `get_irzam_secret` RPC once the service-role key is configured. `OWNER_PIN` and `FREELLM_API_KEY` can optionally override Vault values.

## Local run

Requirements: Node.js 20.19+ (or a newer supported LTS).

```bash
cd app
cp .env.example .env
# Edit .env and set the required server-side secrets
npm install
npm run lint
npm run build
npm start
```

The server listens on `PORT` (default 3000).

## Deployment

Deploy as a Node/Express web service (not static-only hosting).

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Set the required environment variables in the host's secret/environment settings.
- Do not commit `.env` or any service-role/API credentials.

## Supabase

The live database was aligned using `supabase/migrations/20261104_secure_schema_alignment.sql`. Apply the migration only once to another environment. It is additive to existing app tables, moves the existing FreeLLMAPI key and owner PIN into Vault, clears their plaintext columns, and revokes browser-role table privileges. It does not seed fake leads or campaigns.
