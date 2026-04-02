from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.market_sentinel.router import router as market_sentinel_router
from app.routers import agents, due_diligence
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: inicializar conexiones (Redis, MCP clients, etc.)
    yield
    # Shutdown: cerrar conexiones


app = FastAPI(title="Hive Agents", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
app.include_router(due_diligence.router, prefix="/api/due-diligence", tags=["due-diligence"])
app.include_router(
    market_sentinel_router,
    prefix="/api/market-sentinel",
    tags=["market-sentinel"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}
