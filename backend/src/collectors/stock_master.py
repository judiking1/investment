"""Collectors that populate the `stocks` master table from upstream sources."""

from __future__ import annotations

import logging

import FinanceDataReader as fdr
from sqlalchemy.orm import Session

from src.storage.models import Stock

logger = logging.getLogger(__name__)


def upsert_kospi_top_n(session: Session, n: int = 200) -> int:
    """Fetch all KOSPI listings and upsert the top-N by market cap into `stocks`.

    Why top-N by market cap, not the official KOSPI 200 index list:
        the KRX index API now requires a paid login. Top-N by cap covers ~95%
        of the same names with no login friction. If we ever need the exact
        index constituents, we can add a separate manual-CSV path later.
    """
    df = fdr.StockListing("KOSPI")
    if df.empty:
        raise RuntimeError("FinanceDataReader returned an empty KOSPI listing")

    # Normalize column names — fdr changes them across versions.
    cols = {c.lower(): c for c in df.columns}
    code_col = cols.get("code") or cols.get("symbol")
    name_col = cols.get("name")
    cap_col = cols.get("marcap") or cols.get("marketcap")
    sector_col = cols.get("sector") or cols.get("industry")

    if not (code_col and name_col and cap_col):
        raise RuntimeError(
            f"Unexpected fdr KOSPI schema; got columns: {list(df.columns)}"
        )

    df = df.dropna(subset=[code_col, name_col, cap_col])
    df = df.sort_values(cap_col, ascending=False).head(n)

    upserted = 0
    for _, row in df.iterrows():
        ticker = str(row[code_col]).zfill(6)  # KR tickers are 6-digit, sometimes lose leading zeros
        sector = str(row[sector_col]) if sector_col and row.get(sector_col) else None
        session.merge(
            Stock(
                ticker=ticker,
                name=str(row[name_col]),
                market="KOSPI",
                sector=sector,
            )
        )
        upserted += 1

    session.commit()
    return upserted
