"""Daily OHLCV collector. Backed by FinanceDataReader (Naver Finance)."""

from __future__ import annotations

import logging
from datetime import date, timedelta

import FinanceDataReader as fdr
from sqlalchemy import select
from sqlalchemy.orm import Session
from tqdm import tqdm

from src.storage.models import DailyPrice, Stock

logger = logging.getLogger(__name__)


def fetch_and_upsert_one(
    session: Session,
    ticker: str,
    start: date,
    end: date,
) -> int:
    """Download OHLCV for `ticker` between `start` and `end` (inclusive) and upsert.

    Returns the number of daily rows touched.
    """
    df = fdr.DataReader(ticker, start, end)
    if df.empty:
        return 0

    count = 0
    for ix, row in df.iterrows():
        # Pandas DatetimeIndex entries → date()
        d = ix.date() if hasattr(ix, "date") else ix
        session.merge(
            DailyPrice(
                ticker=ticker,
                date=d,
                open=float(row["Open"]),
                high=float(row["High"]),
                low=float(row["Low"]),
                close=float(row["Close"]),
                volume=int(row["Volume"]),
            )
        )
        count += 1
    return count


def upsert_recent_for_all(session: Session, days: int = 30) -> dict[str, object]:
    """Upsert the last `days` calendar days of OHLCV for every stock in the DB.

    Trade-off: we do per-ticker fetches, not a single bulk call, because fdr
    doesn't expose a batched OHLCV endpoint. 200 tickers × 30 days takes about
    1–2 minutes; acceptable for a daily cron.

    The session is flushed per ticker (via merge) and committed once at the end —
    this keeps memory bounded but rolls back the entire run on a fatal error.
    Tickers that fail individually are logged and skipped, not raised.
    """
    end = date.today()
    start = end - timedelta(days=days)

    stocks = session.scalars(select(Stock)).all()
    total_rows = 0
    failed: list[str] = []

    for s in tqdm(stocks, desc="fetching OHLCV", unit="ticker"):
        try:
            total_rows += fetch_and_upsert_one(session, s.ticker, start, end)
        except Exception as exc:  # noqa: BLE001 — collector should be resilient
            logger.warning("failed %s: %s", s.ticker, exc)
            failed.append(s.ticker)

    session.commit()
    return {
        "tickers": len(stocks),
        "rows": total_rows,
        "failed": failed,
        "start": start.isoformat(),
        "end": end.isoformat(),
    }
