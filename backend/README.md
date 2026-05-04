# Backend

Python + FastAPI. Manages data collection, analysis, and LLM-driven rationale generation.

## Setup

```bash
uv sync
cp .env.example .env   # fill in keys when needed
uv run uvicorn src.main:app --reload --port 8000
```

`uv sync` will:
- download Python 3.12 if it isn't installed (managed inside `.venv`, not system-wide)
- install all dependencies from `pyproject.toml`
- create a lockfile (`uv.lock`) for reproducible installs

## Endpoints (so far)

- `GET /health` — liveness probe used by the frontend to verify the backend is reachable
