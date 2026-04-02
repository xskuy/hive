from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ScanRunSummary(BaseModel):
    """Compact scan metadata used by the list and run endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    started_at: datetime
    finished_at: datetime | None
    universe_size: int
    signals_reviewed: int
    anomalies_found: int
    threshold_candidates: int
    alerts_created: int
    noise_discarded: int
    cooldown_suppressed: int
    failed_tickers: int


class AlertNewsItemResponse(BaseModel):
    """Single news record attached to an alert."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    url: str
    published_at: datetime | None
    source: str
    relevance_score: float


class MarketSnapshotResponse(BaseModel):
    """Per-ticker snapshot shown in the detail pane."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    ticker: str
    company_name: str
    price: float
    price_change_pct: float
    volume: float
    volume_baseline: float
    volume_ratio: float
    is_anomaly: bool


class AlertListItem(BaseModel):
    """User-facing alert payload for list views."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    scan_run_id: int
    ticker: str
    company_name: str
    event_type: str
    confidence_score: float
    has_news_support: bool
    created_at: datetime
    que_paso: str
    posible_causa: str
    por_que_importa: str


class RunScanResponse(BaseModel):
    """Response returned after a manual scan completes."""

    scan_run: ScanRunSummary
    alerts: list[AlertListItem]


class AlertListResponse(BaseModel):
    """Collection wrapper for alert listings."""

    items: list[AlertListItem]


class AlertDetailResponse(AlertListItem):
    """Expanded alert payload with the attached evidence."""

    snapshots: list[MarketSnapshotResponse]
    news_items: list[AlertNewsItemResponse]


class ScanRunListResponse(BaseModel):
    """Collection wrapper for persisted scan runs."""

    items: list[ScanRunSummary]


class MarketSentinelConfigResponse(BaseModel):
    """Current feature configuration exposed to the dashboard."""

    enabled: bool
    universe_path: str
    configured_universe_size: int
    market_data_provider: str
    market_data_fallback_provider: str | None = None
    price_move_threshold: float
    volume_ratio_threshold: float
    news_lookback_hours: int
    max_news_items: int
    alert_cooldown_hours: int
    request_timeout_seconds: float
    updated_at: datetime | None = None


class UpdateMarketSentinelConfigRequest(BaseModel):
    """Editable runtime settings exposed to the UI."""

    price_move_threshold: float | None = Field(default=None, ge=0.1, le=20)
    volume_ratio_threshold: float | None = Field(default=None, ge=1.0, le=20)
    news_lookback_hours: int | None = Field(default=None, ge=1, le=72)
    max_news_items: int | None = Field(default=None, ge=1, le=10)
    alert_cooldown_hours: int | None = Field(default=None, ge=0, le=168)


class PricePoint(BaseModel):
    """Single point in a price history series."""

    timestamp: datetime
    close: float
    volume: float


class PriceHistoryResponse(BaseModel):
    """Recent price history for a given ticker."""

    ticker: str
    points: list[PricePoint]
