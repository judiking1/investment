"""One-shot script: populate daily_prices for every stock currently in DB.

Usage (from backend/):
    uv run python -m scripts.seed_daily_prices             # default 30 days
    uv run python -m scripts.seed_daily_prices --days 90
"""

from __future__ import annotations

import argparse
import logging
import time

from src.collectors.daily_prices import upsert_recent_for_all
from src.db import SessionLocal, init_db


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--days",
        type=int,
        default=30,
        help="Number of calendar days back from today to fetch (default: 30)",
    )
    args = parser.parse_args()

    # Quiet pandas/urllib3; only show warnings from our collector.
    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(message)s")
    init_db()

    started = time.perf_counter()
    with SessionLocal() as session:
        result = upsert_recent_for_all(session, days=args.days)
    elapsed = time.perf_counter() - started

    print(f"\nWindow: {result['start']} → {result['end']}")
    print(f"Tickers: {result['tickers']}")
    print(f"Rows upserted: {result['rows']}")
    print(f"Elapsed: {elapsed:.1f}s")
    failed = result["failed"]
    if failed:
        print(f"Failed: {len(failed)} tickers — first few: {failed[:10]}")


if __name__ == "__main__":
    main()
