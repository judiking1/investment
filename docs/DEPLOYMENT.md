# Deployment Blueprint

> Target: ≤ 5 friends visit a public URL, see fresh data, no login.
> Target cost: **0원/month** under each provider's free tier at this scale.

---

## Architecture

```
┌──────────────┐         ┌────────────────────┐         ┌─────────────────┐
│  GitHub      │ push    │  Vercel            │  fetch  │  Railway        │
│  main branch │────────▶│  (Next.js frontend)│────────▶│  (FastAPI       │
└──────┬───────┘         │  https://*.vercel  │         │   + SQLite)     │
       │                 └────────────────────┘         │  https://*.up.  │
       │                                                │   railway.app   │
       │                                                └────────┬────────┘
       │  schedule (cron)                                        │
       │                                                         │ writes
       │  ┌──────────────────────┐                               ▼
       └─▶│ GitHub Actions       │  POST trigger / SSH /     ┌────────┐
          │ (daily data refresh) │──────────────────────────▶│  *.db  │
          └──────────────────────┘                           └────────┘
```

Three services, each free at our scale:

| Layer | Provider | Why this one |
|-------|----------|-------------|
| Frontend hosting | **Vercel** | Made by the Next.js team; `vercel` reads our Next config out of the box; preview URLs per PR |
| Backend hosting | **Railway** | Free $5/month credit covers a sleeping FastAPI + SQLite; one-click deploy from GitHub |
| Daily data refresh | **GitHub Actions** (cron) | Free 2,000 minutes/month for public repos; no extra service to babysit |

---

## Why not …?

- **Vercel for backend too?** Vercel serverless functions don't keep a SQLite file between invocations; we'd have to move to a hosted Postgres (Supabase, Neon). Possible later, but extra complexity for now.
- **Fly.io instead of Railway?** Fewer cold starts, but the deploy story is heavier (Dockerfile, fly.toml). Railway's "deploy from repo" wins for a 5-friend project.
- **Self-hosted on user's machine + ngrok?** Requires the laptop to stay on. Not great for daily-cron.
- **Cloudflare Workers + D1?** Real option for v2 if Railway costs ever creep up — D1 is a hosted SQLite that fits our schema almost as-is.

---

## Pre-flight checklist

- [ ] GitHub account (already have — `judiking1/investment`)
- [ ] Vercel account → sign in with GitHub: <https://vercel.com/signup>
- [ ] Railway account → sign in with GitHub: <https://railway.com/login>
- [ ] (Optional) Custom domain — not required for friends-only

---

## Step 1 — Frontend on Vercel

Vercel auto-detects Next.js. Two settings to remember:

1. **Root directory**: `frontend` (the repo has both `backend/` and `frontend/`)
2. **Environment variable**: `NEXT_PUBLIC_API_URL` = the Railway URL we'll get in Step 2

Initial deploy will fail-soft because the env var doesn't exist yet — that's fine; we'll redeploy after Step 2.

---

## Step 2 — Backend on Railway

Railway also auto-detects Python projects, but we need to nudge it:

1. **Root directory**: `backend`
2. **Build command** (auto-detected from `pyproject.toml` + `uv.lock`): `uv sync --frozen`
3. **Start command**: `uv run uvicorn src.main:app --host 0.0.0.0 --port $PORT`
   - Railway injects `$PORT`; do **not** hardcode `8000`
   - Drop `--reload` and `--reload-dir src` (those are dev-only)
4. **Persistent volume**: mount one at `/app/backend/data` so SQLite survives redeploys
5. **Environment variables** (Railway dashboard):
   - `ANTHROPIC_API_KEY` — leave empty until Phase 3
   - `DATABASE_URL` — leave default (it points at the mounted volume via `src/config.py`)
6. **CORS**: in `backend/src/main.py`, `allow_origins` is currently `["http://localhost:3000"]`. Add the Vercel URL there before deploy:
   ```python
   allow_origins=[
       "http://localhost:3000",
       "https://investment-<your-handle>.vercel.app",
   ]
   ```

After deploy, Railway gives you a URL like `https://investment-production.up.railway.app`. Copy this back into Vercel's `NEXT_PUBLIC_API_URL` and redeploy frontend.

---

## Step 3 — Daily data refresh via GitHub Actions

Create `.github/workflows/refresh-data.yml`:

```yaml
name: Refresh market data

on:
  schedule:
    - cron: '30 21 * * 1-5'  # 06:30 KST Mon–Fri (KRX opens 09:00)
  workflow_dispatch:        # also allow manual trigger from GitHub UI

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger backend refresh endpoint
        run: |
          curl --fail-with-body -X POST \
            -H "Authorization: Bearer ${{ secrets.REFRESH_TOKEN }}" \
            "${{ secrets.BACKEND_URL }}/admin/refresh"
```

This requires us to **add a `POST /admin/refresh` endpoint to the backend** that runs both seed scripts and is gated by a shared bearer token. That's a small Phase 1.4 task — lighter than spinning up Actions runner with the whole Python toolchain.

GitHub secrets to set on the repo:
- `BACKEND_URL` — the Railway URL
- `REFRESH_TOKEN` — any random string; the backend checks `Authorization: Bearer <same string>`

---

## Step 4 — Smoke test

After all three steps:

- [ ] Open the Vercel URL on a phone — main page loads, "등록된 종목 200" visible
- [ ] Click any stock — chart renders
- [ ] Trigger the GH Action manually (`workflow_dispatch`) — verify 200 OK, then refresh the site to see the latest trading day appear
- [ ] Send the Vercel URL to one friend, ask them to open it cold — confirms CORS, cold-start, and that they don't hit any login wall

---

## Cost guardrails

| Provider | Free tier | Our usage |
|----------|-----------|-----------|
| Vercel Hobby | 100 GB-hours/mo, 100 GB bandwidth | Trivial — static-ish site, ≤5 visitors |
| Railway free | $5 credit/month | A small FastAPI sleeping most of the day stays well under |
| GitHub Actions | 2,000 min/mo | One curl call per weekday = seconds |

If usage ever exceeds free tier (it won't for 5 users), the upgrade is one click — no migration needed.

---

## What this blueprint deliberately leaves out

- **HTTPS for backend** — Railway gives it for free, no work needed
- **Custom domain** — possible later, not required for "5 friends"
- **Auth** — user explicitly opted out at this scale
- **CDN/cache** — Vercel handles edge caching automatically
- **Database backups** — SQLite on a Railway volume is fine until we have data worth backing up; revisit when Phase 4 (paper trading) starts producing data we can't lose
