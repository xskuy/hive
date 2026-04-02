from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.features.market_sentinel.schemas import (
    AlertDetailResponse,
    AlertListResponse,
    MarketSentinelConfigResponse,
    PriceHistoryResponse,
    RunScanResponse,
    ScanRunListResponse,
    UpdateMarketSentinelConfigRequest,
)
from app.features.market_sentinel.service import MarketSentinelService


router = APIRouter()


def get_service(db: Session = Depends(get_db)) -> MarketSentinelService:
    """Create a request-scoped service instance."""
    return MarketSentinelService(db)


@router.post("/scans/run", response_model=RunScanResponse)
def run_scan(service: MarketSentinelService = Depends(get_service)) -> RunScanResponse:
    """Run the full Market Sentinel scan manually from the dashboard."""
    return service.run_scan()


@router.get("/alerts", response_model=AlertListResponse)
def list_alerts(
    limit: int = Query(default=20, ge=1, le=100),
    ticker: str | None = None,
    event_type: str | None = None,
    has_news_support: bool | None = None,
    min_confidence: float | None = Query(default=None, ge=0, le=1),
    date_range: Literal["all", "24h", "7d", "30d"] = "all",
    sort_by: Literal["created_at", "confidence_score", "ticker"] = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
    latest_unique: bool = False,
    service: MarketSentinelService = Depends(get_service),
) -> AlertListResponse:
    """List the latest persisted alerts."""
    created_after: datetime | None = None
    if date_range != "all":
        hours = {"24h": 24, "7d": 24 * 7, "30d": 24 * 30}[date_range]
        created_after = datetime.now(timezone.utc) - timedelta(hours=hours)

    return service.list_alerts(
        limit=limit,
        ticker=ticker,
        event_type=event_type,
        has_news_support=has_news_support,
        min_confidence=min_confidence,
        created_after=created_after,
        sort_by=sort_by,
        sort_order=sort_order,
        latest_unique=latest_unique,
    )


@router.get("/runs", response_model=ScanRunListResponse)
def list_runs(
    limit: int = Query(default=20, ge=1, le=100),
    service: MarketSentinelService = Depends(get_service),
) -> ScanRunListResponse:
    """List recent scan runs."""
    return service.list_runs(limit=limit)


@router.get("/alerts/{alert_id}", response_model=AlertDetailResponse)
def get_alert(
    alert_id: int,
    service: MarketSentinelService = Depends(get_service),
) -> AlertDetailResponse:
    """Return the full detail payload for a single alert."""
    return service.get_alert(alert_id=alert_id)


@router.get("/tickers/{ticker}/price-history", response_model=PriceHistoryResponse)
def get_price_history(
    ticker: str,
    service: MarketSentinelService = Depends(get_service),
) -> PriceHistoryResponse:
    """Return recent price history for a ticker from yfinance."""
    return service.get_price_history(ticker=ticker)


@router.get("/config", response_model=MarketSentinelConfigResponse)
def get_config(
    service: MarketSentinelService = Depends(get_service),
) -> MarketSentinelConfigResponse:
    """Return the active feature configuration."""
    return service.get_config()


@router.patch("/config", response_model=MarketSentinelConfigResponse)
def update_config(
    payload: UpdateMarketSentinelConfigRequest,
    service: MarketSentinelService = Depends(get_service),
) -> MarketSentinelConfigResponse:
    """Persist editable runtime configuration."""
    return service.update_config(payload)
