# Backend

Python + FastAPI. Manages data collection, analysis, and LLM-driven rationale generation.

## Setup

```bash
uv sync
cp .env.example .env   # fill in keys when needed
uv run uvicorn src.main:app --reload --reload-dir src --port 8000
```

`--reload-dir src` keeps the watcher off `.venv` — without it, any `uv add` triggers a reload storm because uvicorn sees thousands of new files inside the virtualenv.

`uv sync` will:
- download Python 3.12 if it isn't installed (managed inside `.venv`, not system-wide)
- install all dependencies from `pyproject.toml`
- create a lockfile (`uv.lock`) for reproducible installs

The SQLite database is auto-created at `backend/data/investment.db` on startup (via FastAPI lifespan → `Base.metadata.create_all`). For Phase 1 this is enough; we'll move to Alembic migrations in Phase 2 once schemas start changing.

## Endpoints (so far)

- `GET /health` — liveness probe used by the frontend to verify the backend is reachable
- `GET /stocks` — list of registered securities, returns `{ count, stocks: [...] }`
- `GET /stocks/{ticker}/prices` — OHLCV history for one ticker, returns `{ ticker, name, count, prices: [...] }`

## One-shot scripts

Run from the `backend/` directory with `uv run python -m`:

```bash
uv run python -m scripts.seed_stock_master              # KOSPI top-200 master
uv run python -m scripts.seed_daily_prices              # last 30 days OHLCV for everything in `stocks`
uv run python -m scripts.seed_daily_prices --days 90    # custom window
```

`-m` runs the script as a module so `src.*` imports resolve from the current directory.

## Notes on `--reload`

uvicorn's `--reload` works on Windows but occasionally gets stuck after a large code change (the `WatchFiles detected changes` log appears, but the new worker never starts). When that happens, kill the process and restart manually — there's no harm done, and we'll revisit a more stable file watcher if it starts costing noticeable time.

## Data sources

- **KR equities**: [`finance-datareader`](https://github.com/financedata-org/FinanceDataReader) (Naver Finance backend, no login)
- We initially tried `pykrx`, but the latest version requires a paid KRX account. Top-N by market cap from FDR covers ~95% of the same names with no auth friction.
