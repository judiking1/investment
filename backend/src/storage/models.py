from datetime import UTC, date, datetime

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class Stock(Base):
    """Master record for a tradable security (KR or US)."""

    __tablename__ = "stocks"

    ticker: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    market: Mapped[str] = mapped_column(String(20))  # KOSPI, KOSDAQ, NYSE, NASDAQ
    sector: Mapped[str | None] = mapped_column(String(100), nullable=True)
    listed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    daily_prices: Mapped[list["DailyPrice"]] = relationship(
        back_populates="stock", cascade="all, delete-orphan"
    )
    financial_statements: Mapped[list["FinancialStatement"]] = relationship(
        back_populates="stock", cascade="all, delete-orphan"
    )


class DailyPrice(Base):
    """OHLCV bar for a single trading day."""

    __tablename__ = "daily_prices"
    __table_args__ = (
        UniqueConstraint("ticker", "date", name="uq_daily_prices_ticker_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(
        ForeignKey("stocks.ticker", ondelete="CASCADE"), index=True
    )
    date: Mapped[date] = mapped_column(Date, index=True)
    open: Mapped[float]
    high: Mapped[float]
    low: Mapped[float]
    close: Mapped[float]
    volume: Mapped[int] = mapped_column(BigInteger)
    # Adjusted for splits/dividends. KR data usually stores raw close; US (yfinance) provides adj_close.
    adjusted_close: Mapped[float | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    stock: Mapped["Stock"] = relationship(back_populates="daily_prices")


class FinancialStatement(Base):
    """Quarterly or annual financial summary. Schema only in Phase 1; ingestion comes later."""

    __tablename__ = "financial_statements"
    __table_args__ = (
        UniqueConstraint(
            "ticker", "period_end", "period_type", name="uq_fs_ticker_period"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(
        ForeignKey("stocks.ticker", ondelete="CASCADE"), index=True
    )
    period_end: Mapped[date] = mapped_column(Date)
    period_type: Mapped[str] = mapped_column(String(20))  # "annual" | "quarterly"
    # Stored as raw KRW/USD (no scaling). Use BigInteger because KR revenue can exceed int32.
    revenue: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    operating_income: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    net_income: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    stock: Mapped["Stock"] = relationship(back_populates="financial_statements")
