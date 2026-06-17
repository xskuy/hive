from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, Literal, Protocol

AlertStatus = Literal["new", "investigating", "confirmed", "watching", "resolved"]
CriticStatus = Literal["passed", "revised", "skipped", "max_revisions_reached"]


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


class MarketDataProvider(Protocol):
    """Contract implemented by market-data providers used by the scan service."""

    def fetch_signals(
        self,
        universe: Iterable[UniverseTicker],
    ) -> tuple[list[MarketSignal], list[str]]: ...


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
    critic_status: CriticStatus
    critic_feedback: str | None
    critic_revision_count: int


class AgentExplanationProvider(Protocol):
    """Contract implemented by services that explain and validate candidate events."""

    def explain_event(
        self,
        *,
        signal: MarketSignal,
        news_items: list[NewsSearchItem],
        event_type: str,
        baseline_confidence_score: float,
        has_news_support: bool,
    ) -> AgentExplanationResult: ...
