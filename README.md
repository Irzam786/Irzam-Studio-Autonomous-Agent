# Irzam Studio — Netlify deployment branch

This branch packages the existing Irzam Studio UI for Netlify continuous deployment. It retains the React/Vite frontend and adapts the existing Express API to a Netlify Function using the official Express + serverless-http pattern.

## Netlify GitHub import settings

- Repository: `Irzam786/Irzam-Studio-Agent`
- Branch: `netlify-ready`
- Base directory: repository root (leave blank)
- Build command: `npm run lint && npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions` (configured in `netlify.toml`)

Netlify serves the frontend from its CDN and routes `/api/*` requests to the Express function.

## Required Netlify environment variables

Add these in Netlify Project configuration → Environment variables. They must be available to Functions at runtime (and to Builds when required). Do not put real values in GitHub or `.env` files.

- `SUPABASE_URL` = `https://fgksgytuglpmzhqcdasb.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = service-role/secret key for the existing Supabase project
- `SESSION_SECRET` = random value of at least 32 characters

Optional:
- `GOOGLE_MAPS_API_KEY`
- `FREELLM_API_KEY` (optional override; existing Qwen key is in Supabase Vault)
- `FREELLM_BASE_URL` = `https://api.freellmapi.com/v1`
- `QWEN_MODEL`, `QWEN_CODER_MODEL`, `QWEN_OUTREACH_MODEL`

Netlify does not read committed `.env` files during builds. Set secrets through the Netlify UI/API, with Functions scope. Redeploy after changing them.

## Important limitations and remaining work

- The current Express application is wrapped as one Netlify Function. Netlify function execution time, memory and request/response limits apply.
- Do not assume scheduled background automation, Gmail OAuth/sending, Netlify-to-Netlify demo deployment, or durable worker processes are complete. These remain separate implementation tasks.
- The current chat streaming endpoint may be buffered by the serverless adapter; verify actual UI behavior after deployment.
- The database was previously migrated directly in the existing Supabase project. Do not rerun the initialization or secure migration against that live project.

## Local checks

```bash
npm ci
npm run lint
npm run build
```
