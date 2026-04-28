from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


CriticStatus = Literal["passed", "revised", "skipped", "max_revisions_reached"]


class MarketSentinelNewsItem(BaseModel):
    """News evidence sent from the transactional backend."""

    title: str
    url: str
    source: str
    published_at: datetime | None = None
    relevance_score: float = 0.0


class MarketSentinelExplainRequest(BaseModel):
    """The candidate event that needs LLM explanation and validation."""

    ticker: str
    company_name: str
    event_type: str
    price: float
    price_change_pct: float
    volume: float
    volume_baseline: float
    volume_ratio: float
    baseline_confidence_score: float = Field(ge=0.0, le=1.0)
    has_news_support: bool
    news_items: list[MarketSentinelNewsItem] = Field(default_factory=list)


class MarketSentinelExplainResponse(BaseModel):
    """Structured response that the backend can persist directly."""

    que_paso: str
    posible_causa: str
    por_que_importa: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    is_noise: bool
    critic_status: CriticStatus
    critic_feedback: str | None = None
    critic_revision_count: int = Field(ge=0)


class AlertLifecycleItem(BaseModel):
    """Single open alert sent for lifecycle evaluation."""

    alert_id: int
    ticker: str
    company_name: str
    event_type: str
    current_status: str
    confidence_score: float
    has_news_support: bool
    que_paso: str
    posible_causa: str
    created_at: str


class AlertLifecycleEvaluationRequest(BaseModel):
    """Batch of open alerts to evaluate for status transitions."""

    alerts: list[AlertLifecycleItem]


class AlertStatusTransition(BaseModel):
    """Recommended lifecycle transition for a single alert."""

    alert_id: int
    ticker: str
    company_name: str
    current_status: str
    recommended_status: str
    reasoning: str
    confidence: float


class AlertLifecycleEvaluationResponse(BaseModel):
    """Recommended transitions returned to the transactional backend."""

    transitions: list[AlertStatusTransition]


class ExplanationDraft(BaseModel):
    """LLM output for the user-facing explanation."""

    que_paso: str
    posible_causa: str
    por_que_importa: str


class CritiqueDraft(BaseModel):
    """LLM output for the explanation critic node."""

    should_rewrite: bool
    feedback: str


class ValidationDraft(BaseModel):
    """LLM output for validation and final confidence."""

    confidence_score: float = Field(ge=0.0, le=1.0)
    is_noise: bool


# ── Market Briefing ────────────────────────────────────────────────────────────

class BriefingAlertItem(BaseModel):
    """Minimal alert payload sent to the briefing agent."""

    alert_id: int
    ticker: str
    company_name: str
    event_type: str
    confidence_score: float
    has_news_support: bool
    que_paso: str
    is_noise: bool = False


class MarketBriefingRequest(BaseModel):
    """Current scan data sent to the briefing agent."""

    scan_run_id: int
    alerts: list[BriefingAlertItem]


class MarketBriefingResponse(BaseModel):
    """Structured briefing returned to the transactional backend."""

    briefing: str
    sector_patterns: list[str] = Field(default_factory=list)
    standout_ticker: str | None = None
    noise_warning: str | None = None


class BriefingDraft(BaseModel):
    """LLM output for the briefing generator node."""

    summary: str
    sector_patterns: list[str] = Field(default_factory=list)
    standout_ticker: str | None = None
    noise_warning: str | None = None
