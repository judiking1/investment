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
