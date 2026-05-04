"""One-shot script: populate the `stocks` table with KOSPI 200 constituents.

Usage (from backend/):
    uv run python scripts/seed_stock_master.py
"""

from __future__ import annotations

import logging
import time

from src.collectors.stock_master import upsert_kospi_top_n
from src.db import SessionLocal, init_db


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    init_db()

    started = time.perf_counter()
    with SessionLocal() as session:
        n = upsert_kospi_top_n(session, n=200)
    elapsed = time.perf_counter() - started

    print(f"Upserted {n} KOSPI top-cap stocks in {elapsed:.1f}s")


if __name__ == "__main__":
    main()
