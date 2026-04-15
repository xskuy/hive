import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.market_sentinel.router import router as market_sentinel_router
from app.routers import agents, due_diligence
from config import settings

# LangChain reads tracing config from os.environ, not from the settings object.
# Export here so the .env values are visible to the LangChain/LangSmith SDK.
if settings.langchain_api_key:
    os.environ.setdefault("LANGCHAIN_TRACING_V2", str(settings.langchain_tracing_v2).lower())
    os.environ.setdefault("LANGCHAIN_API_KEY", settings.langchain_api_key)
    os.environ.setdefault("LANGCHAIN_PROJECT", settings.langchain_project)
    os.environ.setdefault("LANGCHAIN_ENDPOINT", settings.langchain_endpoint)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: inicializar conexiones (Redis, MCP clients, etc.)
    yield
    # Shutdown: cerrar conexiones


app = FastAPI(title="Hive Agents", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
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
