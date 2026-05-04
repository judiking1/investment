# Investment

A personal investment analysis web app for studying the market with friends.

> The goal of this project is **understanding the market**, not chasing returns.
> See [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) for the full plan.

## Architecture

- **`backend/`** — Python (FastAPI) for data collection, analysis, and LLM calls
- **`frontend/`** — Next.js (TypeScript + Tailwind) — the website friends actually visit
- **`docs/`** — project plan and design notes

## Development

### Prerequisites

- Node.js 20+ (for the frontend)
- [uv](https://docs.astral.sh/uv/) (manages Python automatically — no system Python install required)

### Run the backend

```bash
cd backend
uv sync                          # installs Python + dependencies into .venv
uv run uvicorn src.main:app --reload --reload-dir src --port 8000
```

Backend runs at http://localhost:8000 — health check at http://localhost:8000/health

### Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:3000

## Self-imposed rules

These are baked into the plan and must stay visible:

1. **Real money condition**: at least 6 months of paper trading + meaningfully beating the benchmark (annualized excess return ≥ 5%, Sharpe ≥ 1.0) before considering real capital
2. **First real-money cap**: an amount whose loss won't affect daily life
3. **System halt condition**: paper-trading MDD beyond -25% → stop and analyze
4. **Private only**: do not share recommendations outside the small study group until commercialization is formally evaluated
5. **Learning first**: log one line per week answering "what did I learn from writing this code?"
