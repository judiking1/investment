from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db import get_session, init_db
from src.storage.models import DailyPrice, Stock


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


app = FastAPI(title="Investment API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StockOut(BaseModel):
    ticker: str
    name: str
    market: str
    sector: str | None = None

    model_config = {"from_attributes": True}


class StocksResponse(BaseModel):
    count: int
    stocks: list[StockOut]


class DailyPriceOut(BaseModel):
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: int

    model_config = {"from_attributes": True}


class PricesResponse(BaseModel):
    ticker: str
    name: str
    count: int
    prices: list[DailyPriceOut]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "time": datetime.now(UTC).isoformat()}


@app.get("/stocks", response_model=StocksResponse)
def list_stocks(session: Session = Depends(get_session)) -> StocksResponse:
    rows = session.execute(select(Stock).order_by(Stock.ticker)).scalars().all()
    return StocksResponse(
        count=len(rows),
        stocks=[StockOut.model_validate(s) for s in rows],
    )


@app.get("/stocks/{ticker}/prices", response_model=PricesResponse)
def get_prices(
    ticker: str, session: Session = Depends(get_session)
) -> PricesResponse:
    stock = session.get(Stock, ticker)
    if stock is None:
        raise HTTPException(status_code=404, detail=f"Stock not found: {ticker}")

    rows = session.execute(
        select(DailyPrice)
        .where(DailyPrice.ticker == ticker)
        .order_by(DailyPrice.date)
    ).scalars().all()

    return PricesResponse(
        ticker=stock.ticker,
        name=stock.name,
        count=len(rows),
        prices=[DailyPriceOut.model_validate(p) for p in rows],
    )
