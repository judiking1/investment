from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db import get_session, init_db
from src.storage.models import Stock


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
