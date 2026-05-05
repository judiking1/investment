# Project Status

> Snapshot of what's done, what's left, and where the gaps are vs. [PROJECT_PLAN.md](./PROJECT_PLAN.md).
> Update this file at the end of each working session.

**Last updated**: 2026-05-06

---

## Quick state

- **Backend**: FastAPI on Python 3.12 (managed by `uv`), SQLite at `backend/data/investment.db`
- **Frontend**: Next.js 16 + React 19 + Tailwind v4
- **Deployment**: ❌ none — works on `localhost` only
- **Data freshness**: manual (`uv run python -m scripts.seed_*`); no automatic refresh

---

## What works today

| Area | Detail |
|------|--------|
| Project scaffold | `backend/`, `frontend/`, `docs/` separated, single git repo |
| DB schema | `stocks`, `daily_prices`, `financial_statements` (SQLAlchemy 2.0) |
| KR equity master | KOSPI top 200 by market cap (FinanceDataReader) |
| Daily OHLCV | 30-day window per ticker, ~4,000 rows total, refreshed by hand |
| API endpoints | `GET /health`, `GET /stocks`, `GET /stocks/{ticker}/prices` |
| Web UI | Main list with click-through; per-stock page with close-price line chart and last 5-day OHLCV table |
| Tooling | Claude Preview wired up via `.claude/launch.json` |

---

## Gap vs. PROJECT_PLAN

### Phase 1 — Data pipeline
| Item | State | Note |
|------|-------|------|
| Project init | ✅ | |
| `stocks` / `daily_prices` / `financial_statements` schema | ✅ | |
| `news_articles` table | ❌ | Optional in plan |
| KR equity collector | ✅ | FDR (we swapped from pykrx — KRX now requires paid login) |
| US equity collector (yfinance) | ❌ | Plan calls for this |
| Daily ingest script | ✅ | `seed_stock_master`, `seed_daily_prices` |
| **Automatic schedule (cron / scheduler)** | ❌ | **Plan's completion criterion: "auto-refresh every dawn, stable for 1+ week"** |
| Data validation (missing / outliers) | ❌ | |

### Phase 2 — Single screening rule (not started)
- YAML-externalized strategy
- First rule (e.g. value+momentum, or volume spike + close ≥ +3%)
- `screening_results` table
- Daily screening run + summary

### Phase 3 — LLM rationale (not started)
- Anthropic SDK
- Prompt template that *forces* counter-arguments
- Structured JSON output (thesis / risks / invalidation_scenario / confidence)
- Token cost logging

### Phase 4 — Paper trading (not started)
- `paper_portfolio` table
- Buy/sell simulation at next-day open
- Stop-loss / take-profit auto-execution
- Performance metrics (return, MDD, Sharpe, win rate)

### Phase 5 — UI surfaces
| Surface | State |
|---------|-------|
| Stock detail (chart) | ✅ partial — line chart only, no fundamentals |
| Today's candidates | ❌ depends on Phase 2 |
| Paper portfolio | ❌ depends on Phase 4 |
| Strategy backtest | ❌ depends on Phase 2 |
| Mobile responsive | ⚠️ Tailwind defaults, not actually tested on a phone |
| Notifications (email / Telegram) | ❌ |

### Plan §4.4 review checklist
| Item | State | Note |
|------|-------|------|
| External API response shape changes | ⚠️ | try/except exists, no schema validation |
| Holiday / missing data | ⚠️ | Delegated to FDR; our code doesn't validate empty windows |
| Timezone handling | ✅ | All timestamps UTC |
| Look-ahead bias on financials | ➖ | Schema only — no ingestion yet |
| Caching of paid API calls (LLM, etc.) | ➖ | Not started |

---

## Friends-can-use checklist

User's stated goal: **"5 friends can use it together"**.

- [ ] Public URL (frontend deployed)
- [ ] Backend reachable from public URL (CORS / hosting)
- [ ] Data updated daily without manual intervention
- [ ] Plain-language landing copy explaining "this is for studying, not advice"
- [x] No login required (≤5 users)

---

## Next priorities (recommendation)

1. **P0 — Deploy** (Vercel frontend + Railway backend + GitHub Actions cron). See [DEPLOYMENT.md](./DEPLOYMENT.md).
2. **P0 — Daily refresh** (GH Actions hits the seed scripts on a schedule).
3. **P1 — Phase 2** start: one simple technical rule (e.g. volume spike) + a "Today's candidates" card on the home page. Picks up the project's "study" identity.
4. **P2 — Phase 3** LLM rationale (this is the core learning value of the project).
5. **P3 — Phase 4** paper trading.
6. **P3 — UX**: search, sort, real mobile testing, dark-mode toggle.

> The "self-imposed rules" in the project plan (real-money condition, MDD halt, etc.) only become relevant once Phase 4 lands. Until then they live in the README as a reminder.
