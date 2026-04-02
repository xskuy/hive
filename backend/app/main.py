from __future__ import annotations

from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.settings import settings
from app.features.market_sentinel.router import router as market_sentinel_router


load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Reserve a startup hook for future connection warmups."""
    yield


app = FastAPI(title="Hive Backend", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    market_sentinel_router,
    prefix="/api/market-sentinel",
    tags=["market-sentinel"],
)


@app.get("/health")
def health() -> dict[str, str]:
    """Small health endpoint for local orchestration and uptime checks."""
    return {"status": "ok"}
