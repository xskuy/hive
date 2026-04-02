from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class UniverseTicker:
    """Static universe entry loaded from the versioned JSON file."""

    ticker: str
    company_name: str


@dataclass(frozen=True)
class MarketSignal:
    """Normalized market snapshot used across the feature."""

    ticker: str
    company_name: str
    price: float
    price_change_pct: float
    volume: float
    volume_baseline: float
    volume_ratio: float


@dataclass(frozen=True)
class NewsSearchItem:
    """Relevant news article associated with a detected anomaly."""

    title: str
    url: str
    source: str
    published_at: datetime | None
    relevance_score: float


@dataclass(frozen=True)
class ExplanationPayload:
    """Structured explanation consumed directly by the API layer."""

    que_paso: str
    posible_causa: str
    por_que_importa: str


@dataclass(frozen=True)
class AgentExplanationResult:
    """Structured result returned by the agents service."""

    que_paso: str
    posible_causa: str
    por_que_importa: str
    confidence_score: float
    is_noise: bool
