from __future__ import annotations

from datetime import datetime

import httpx

from app.features.market_sentinel.types import (
    AgentExplanationResult,
    MarketSignal,
    NewsSearchItem,
)


class MarketSentinelAgentsClient:
    """Delegate all LLM-backed event reasoning to the agents service."""

    def __init__(self, *, base_url: str, timeout_seconds: float) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def explain_event(
        self,
        *,
        signal: MarketSignal,
        news_items: list[NewsSearchItem],
        event_type: str,
        baseline_confidence_score: float,
        has_news_support: bool,
    ) -> AgentExplanationResult:
        """Call the agents service and normalize its structured response."""
        payload = {
            "ticker": signal.ticker,
            "company_name": signal.company_name,
            "event_type": event_type,
            "price": signal.price,
            "price_change_pct": signal.price_change_pct,
            "volume": signal.volume,
            "volume_baseline": signal.volume_baseline,
            "volume_ratio": signal.volume_ratio,
            "baseline_confidence_score": baseline_confidence_score,
            "has_news_support": has_news_support,
            "news_items": [self._serialize_news_item(item) for item in news_items],
        }

        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.post(f"{self.base_url}/api/market-sentinel/explain", json=payload)
            response.raise_for_status()
            data = response.json()

        return AgentExplanationResult(
            que_paso=data["que_paso"],
            posible_causa=data["posible_causa"],
            por_que_importa=data["por_que_importa"],
            confidence_score=float(data["confidence_score"]),
            is_noise=bool(data["is_noise"]),
        )

    def _serialize_news_item(self, item: NewsSearchItem) -> dict[str, str | float | None]:
        """Convert dataclass news items into JSON-safe payloads."""
        return {
            "title": item.title,
            "url": item.url,
            "source": item.source,
            "published_at": self._serialize_datetime(item.published_at),
            "relevance_score": item.relevance_score,
        }

    def _serialize_datetime(self, value: datetime | None) -> str | None:
        if value is None:
            return None
        return value.isoformat()
