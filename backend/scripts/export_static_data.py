"""Fetch market data and write JSON files into `frontend/public/data/`.

The frontend is fully static — no backend at runtime. This script is run daily
by GitHub Actions and on demand from the developer's machine.

Output layout (mirrors the API shape so the frontend code path is identical):

    frontend/public/data/
      stocks.json                 # { count, stocks: [...] }
      prices/<ticker>.json        # { ticker, name, count, prices: [...] }

Usage (from backend/):
    uv run python -m scripts.export_static_data
    uv run python -m scripts.export_static_data --days 90
"""

from __future__ import annotations

import argparse
import json
import logging
import shutil
import time
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import FinanceDataReader as fdr
from tqdm import tqdm

from src.config import BACKEND_ROOT

PROJECT_ROOT = BACKEND_ROOT.parent
DATA_DIR = PROJECT_ROOT / "frontend" / "public" / "data"
PRICES_DIR = DATA_DIR / "prices"

logger = logging.getLogger(__name__)


def fetch_kospi_top_n(n: int = 200) -> list[dict[str, Any]]:
    """Pull KOSPI master from FDR and return the top-N by market cap."""
    df = fdr.StockListing("KOSPI")
    if df.empty:
        raise RuntimeError("FinanceDataReader returned an empty KOSPI listing")

    cols = {c.lower(): c for c in df.columns}
    code_col = cols.get("code") or cols.get("symbol")
    name_col = cols.get("name")
    cap_col = cols.get("marcap") or cols.get("marketcap")
    sector_col = cols.get("sector") or cols.get("industry")
    if not (code_col and name_col and cap_col):
        raise RuntimeError(f"Unexpected fdr KOSPI schema; got columns: {list(df.columns)}")

    df = df.dropna(subset=[code_col, name_col, cap_col])
    df = df.sort_values(cap_col, ascending=False).head(n)

    out: list[dict[str, Any]] = []
    for _, row in df.iterrows():
        out.append(
            {
                "ticker": str(row[code_col]).zfill(6),
                "name": str(row[name_col]),
                "market": "KOSPI",
                "sector": (
                    str(row[sector_col])
                    if sector_col and row.get(sector_col)
                    else None
                ),
            }
        )
    return out


def fetch_ohlcv(ticker: str, start: date, end: date) -> list[dict[str, Any]]:
    """Pull daily OHLCV for one ticker and shape it like the API response."""
    df = fdr.DataReader(ticker, start, end)
    if df.empty:
        return []
    rows: list[dict[str, Any]] = []
    for ix, row in df.iterrows():
        d = ix.date() if hasattr(ix, "date") else ix
        rows.append(
            {
                "date": d.isoformat(),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"]),
            }
        )
    return rows


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        # ensure_ascii=False keeps Korean names readable in git diffs
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=30, help="Calendar days of OHLCV (default 30)")
    parser.add_argument("--top", type=int, default=200, help="Number of top-cap KOSPI names (default 200)")
    args = parser.parse_args()

    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(message)s")

    end = date.today()
    start = end - timedelta(days=args.days)
    started = time.perf_counter()

    # 1) master
    print(f"Fetching KOSPI top {args.top} master ...")
    stocks = fetch_kospi_top_n(args.top)
    write_json(DATA_DIR / "stocks.json", {"count": len(stocks), "stocks": stocks})
    print(f"  wrote stocks.json ({len(stocks)} tickers)")

    # 2) OHLCV per ticker — clear stale files so dropped tickers don't linger
    if PRICES_DIR.exists():
        shutil.rmtree(PRICES_DIR)

    failed: list[str] = []
    total_rows = 0
    for s in tqdm(stocks, desc="OHLCV", unit="ticker"):
        try:
            prices = fetch_ohlcv(s["ticker"], start, end)
        except Exception as exc:  # noqa: BLE001
            logger.warning("failed %s: %s", s["ticker"], exc)
            failed.append(s["ticker"])
            continue
        write_json(
            PRICES_DIR / f"{s['ticker']}.json",
            {
                "ticker": s["ticker"],
                "name": s["name"],
                "count": len(prices),
                "prices": prices,
            },
        )
        total_rows += len(prices)

    elapsed = time.perf_counter() - started
    print()
    print(f"Window:  {start.isoformat()} → {end.isoformat()}")
    print(f"Tickers: {len(stocks)}")
    print(f"Rows:    {total_rows}")
    print(f"Failed:  {len(failed)} ({failed[:5]}{'...' if len(failed) > 5 else ''})")
    print(f"Output:  {DATA_DIR}")
    print(f"Elapsed: {elapsed:.1f}s")


if __name__ == "__main__":
    main()
