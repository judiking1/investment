# Deployment

> **Target**: ≤ 5 friends visit a public URL, data refreshes daily, no login.
> **Cost**: 0원 (within free tiers).

The site is a **static Next.js app** on Vercel. Market data is shipped as JSON files inside the repo, refreshed once a day by a GitHub Actions cron. There is no live backend in production — the FastAPI app in `backend/` only exists for local development and for the export script that builds the JSON.

```
GitHub Actions (every weekday 06:30 KST)
    │
    │  uv run python -m scripts.export_static_data
    │  → writes frontend/public/data/*.json
    │  → git commit + push to main
    ▼
GitHub repo (main)
    │  auto-deploy webhook
    ▼
Vercel (Next.js static site)
    │
    ▼
https://<your-vercel-url>
```

---

## What you (the human) actually have to do

A one-time **5-click setup**. Code is already in place.

### 1. Sign in to Vercel with GitHub

<https://vercel.com/signup> → "Continue with GitHub". 30 seconds.

### 2. Import the repo

- Click **Add New… → Project**
- Pick `judiking1/investment`
- Vercel detects Next.js automatically. Two settings to change:
  - **Root Directory**: `frontend`
  - Everything else: leave default
- Click **Deploy**. First build takes ~2 minutes.

### 3. Visit your URL

Vercel gives you something like `https://investment-judiking1.vercel.app`. Open it on your phone, click any stock → chart loads. Send the URL to a friend to confirm it loads cold.

### 4. Enable the daily refresh

The workflow file (`.github/workflows/refresh-data.yml`) is already committed. On the GitHub repo:

- **Settings → Actions → General → Workflow permissions** → set to **"Read and write permissions"**. Without this, the bot can't commit refreshed data back to main.
- **Actions tab → "Refresh market data" → Run workflow** (manual one-time run to confirm it works).

After that, the cron runs Mon–Fri at 06:30 KST automatically. Each successful run pushes a commit like `chore(data): refresh 2026-05-15`, Vercel re-deploys in ~1 minute, friends see fresh data.

---

## What you don't need

- ~~Railway account~~
- ~~Custom backend hosting~~
- ~~CORS configuration in production~~
- ~~Environment variables on Vercel~~ (no `NEXT_PUBLIC_API_URL`)
- ~~Bearer-token-protected `/admin/refresh` endpoint~~
- ~~Persistent volume for SQLite~~

All gone because the frontend reads JSON files from its own `public/` directory at runtime — no network round-trip to any server we own.

---

## When this will stop being enough

Move to a real backend (Railway, Fly.io, or self-hosted) when **any** of these become true:

1. **Phase 4 — paper trading**: users will submit buy/sell decisions and we need to persist their portfolios per-user
2. **Real-time data needed**: intraday refresh, push notifications, live order book — not on the roadmap
3. **Repo size grows past a few MB of data**: at ~5MB/year we're fine; at 50MB+ we'd shard to a data branch or external storage
4. **LLM responses need to be cached server-side** (Phase 3 will probably cache responses inside the same JSON pipeline first; only escalate if costs spike)

Until then, static deployment matches our scale and our budget exactly.

---

## How to refresh data manually (for development)

```bash
cd backend
uv run python -m scripts.export_static_data --days 30
```

This writes `frontend/public/data/stocks.json` and `frontend/public/data/prices/<ticker>.json`. The dev server picks them up immediately; commit + push pushes them to production.
