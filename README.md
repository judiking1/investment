# Investment

A personal investment analysis web app for studying the market with friends.

> The goal of this project is **understanding the market**, not chasing returns.

**Current phase**: 1.3' — basic data pipeline + per-stock chart page. Runs locally only; deployment is the next milestone.
See [docs/STATUS.md](docs/STATUS.md) for live progress and the gap list.

## Documentation

| Doc | What's in it |
|-----|--------------|
| [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) | The original phased plan (data → screening → LLM → paper trading → UI) |
| [docs/STATUS.md](docs/STATUS.md) | What's done, what's left, gap analysis vs. plan |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel + Railway + GitHub Actions blueprint for the friends-can-use launch |
| [backend/README.md](backend/README.md) | Backend setup, endpoints, data sources, scripts |

## Architecture

- **`backend/`** — Python (FastAPI) — data collection, analysis, LLM
- **`frontend/`** — Next.js (TypeScript + Tailwind) — the website friends actually visit
- **`docs/`** — plan and operating notes

## Development

### Prerequisites

- Node.js 20+ (for the frontend)
- [uv](https://docs.astral.sh/uv/) — manages Python automatically, no system Python install required

### Run the backend

```bash
cd backend
uv sync                                                          # installs Python + dependencies into .venv
uv run uvicorn src.main:app --reload --reload-dir src --port 8000
```

Backend runs at <http://localhost:8000>. Health check: <http://localhost:8000/health>. Auto-generated API docs: <http://localhost:8000/docs>.

### Seed data (run once, then daily)

```bash
cd backend
uv run python -m scripts.seed_stock_master            # KOSPI top-200 master
uv run python -m scripts.seed_daily_prices            # last 30 days OHLCV
uv run python -m scripts.seed_daily_prices --days 90  # wider window
```

These will become an automated job once [DEPLOYMENT.md](docs/DEPLOYMENT.md) Step 3 is in place.

### Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at <http://localhost:3000>.

## Self-imposed rules

These live in the plan (§5.3) and stay visible here as a reminder:

1. **Real money condition**: at least 6 months of paper trading + meaningfully beating the benchmark (annualized excess return ≥ 5%, Sharpe ≥ 1.0) before considering real capital
2. **First real-money cap**: an amount whose loss won't affect daily life
3. **System halt condition**: paper-trading MDD beyond -25% → stop and analyze
4. **Private only**: don't share recommendations outside the small study group until commercialization is formally evaluated
5. **Learning first**: log one line per week answering "what did I learn from writing this code?"
