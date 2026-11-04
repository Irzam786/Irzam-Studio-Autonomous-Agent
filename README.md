# Irzam Studio

AI-assisted prospect research and outreach workspace. This branch is packaged specifically for Google AI Studio Build: the application files are at the repository root and the existing React/Express design is retained.

## Import into Google AI Studio

1. Open Google AI Studio and switch to **Build** mode.
2. In the prompt input, open **Add files (+)** and choose **Import from GitHub**.
3. Select `Irzam786/Irzam-Studio-Agent` and branch `ai-studio-import-ready`.
4. Let the import finish, then run the app preview and inspect the server logs.
5. When ready, choose **Publish → Get Started → Publish App** and select the free Starter Tier if it is available on your account. Choose a globally available `*.ai.studio` subdomain.

Google AI Studio currently documents GitHub import as the way to bring an existing repository into Build mode. This source package is also downloadable as a ZIP artifact from the branch's GitHub Actions run.

## Runtime

- Node.js full-stack app: React + Vite frontend, Express API server.
- Install: `npm install`
- Build: `npm run build`
- Start: `npm start`
- The host must provide its own `PORT`; do not hardcode a public port.
- The application serves the Vite `dist` output when `NODE_ENV=production`.

## Required server-side secrets

Configure these in the AI Studio server-side Secrets/runtime settings. Do not put secret values in frontend code or commit a real `.env` file.

- `SUPABASE_URL` = `https://fgksgytuglpmzhqcdasb.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = the service-role/secret key for the connected Supabase project
- `SESSION_SECRET` = a random value at least 32 characters long (generate one with `openssl rand -hex 32`)

Optional:
- `GOOGLE_MAPS_API_KEY` = Google Places API key with Places API (New) enabled
- `FREELLM_API_KEY` = optional override; the current Qwen key is intended to be read from Supabase Vault
- `FREELLM_BASE_URL` = `https://api.freellmapi.com/v1`
- `QWEN_MODEL`, `QWEN_CODER_MODEL`, `QWEN_OUTREACH_MODEL` = optional model identifiers

The Qwen key and owner PIN were moved into Supabase Vault. The app can read them only after the server-side Supabase service-role key is configured. The owner PIN is not included in this repository or ZIP.

## Current integration status (read before publishing)

Working code paths prepared:
- Server-side Supabase access and Vault secret lookup.
- Qwen chat through FreeLLMAPI, provided the Vault/service-role connection works.
- Real Google Places API New search and website/review-count filtering, provided `GOOGLE_MAPS_API_KEY` is configured.
- Server-backed leads, training rules/messages, campaigns, and outreach queue persistence.

Not yet implemented / deliberately disabled:
- Real Gmail OAuth, inbox scanning, and message sending.
- Netlify demo deployment.
- Durable scheduled jobs, hourly scans, daily reports, and automatic follow-ups.
- Server-side chat history persistence.

The app intentionally does not simulate successful email sending, inbox scans, Netlify deployments, or scheduled jobs. Do not treat it as a fully automated outreach system until those integrations are built and verified.

## Supabase database note

The connected Supabase project has already had the secure alignment migration applied directly. Do not rerun the initialization migration on that live project. The SQL migrations are included for reference and for setting up a separate database only after reviewing them.
