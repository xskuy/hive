from __future__ import annotations

import logging
from datetime import datetime
from urllib.parse import urlparse, urlunparse

import httpx

from app.features.market_sentinel.models import Alert
from app.features.market_sentinel.schemas import AlertLifecycleEvaluationResponse
from app.features.market_sentinel.types import (
    AgentExplanationResult,
    MarketSignal,
    NewsSearchItem,
)


logger = logging.getLogger(__name__)
MARKET_SENTINEL_EXPLAIN_PATH = "/api/market-sentinel/explain"
MARKET_SENTINEL_LIFECYCLE_PATH = "/api/market-sentinel/lifecycle/evaluate"
LOCAL_DISCOVERY_PORTS = tuple(range(8000, 8011))


class MarketSentinelAgentsClient:
    """Delegate all LLM-backed event reasoning to the agents service."""

    def __init__(self, *, base_url: str, timeout_seconds: float) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self._resolved_base_url: str | None = None

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
        resolved_base_url = self._resolve_base_url()

        try:
            return self._post_explanation(
                resolved_base_url=resolved_base_url,
                payload=payload,
            )
        except (httpx.HTTPError, KeyError, ValueError, TypeError):
            logger.exception(
                "Agents explanation call failed for %s against %s; using local fallback.",
                signal.ticker,
                resolved_base_url,
            )
            retry_base_url = self._discover_base_url(exclude={resolved_base_url})

            if retry_base_url is not None and retry_base_url != resolved_base_url:
                try:
                    return self._post_explanation(
                        resolved_base_url=retry_base_url,
                        payload=payload,
                    )
                except (httpx.HTTPError, KeyError, ValueError, TypeError):
                    logger.exception(
                        "Agents explanation retry failed for %s against %s; falling back locally.",
                        signal.ticker,
                        retry_base_url,
                    )

            return self._build_fallback_result(
                signal=signal,
                news_items=news_items,
                event_type=event_type,
                baseline_confidence_score=baseline_confidence_score,
                has_news_support=has_news_support,
            )

    def evaluate_alert_lifecycle(
        self,
        *,
        open_alerts: list[Alert],
    ) -> AlertLifecycleEvaluationResponse:
        """Ask the agents service to evaluate all open alerts for auto-transition."""
        payload = {
            "alerts": [
                {
                    "alert_id": alert.id,
                    "ticker": alert.ticker,
                    "company_name": alert.company_name,
                    "event_type": alert.event_type,
                    "current_status": alert.status,
                    "confidence_score": alert.confidence_score,
                    "has_news_support": alert.has_news_support,
                    "que_paso": alert.que_paso,
                    "posible_causa": alert.posible_causa,
                    "created_at": alert.created_at.isoformat(),
                }
                for alert in open_alerts
            ]
        }
        resolved_base_url = self._resolve_base_url()
        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.post(
                f"{resolved_base_url}{MARKET_SENTINEL_LIFECYCLE_PATH}", json=payload
            )
            response.raise_for_status()
            return AlertLifecycleEvaluationResponse.model_validate(response.json())

    def _post_explanation(
        self,
        *,
        resolved_base_url: str,
        payload: dict[str, object],
    ) -> AgentExplanationResult:
        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.post(
                f"{resolved_base_url}{MARKET_SENTINEL_EXPLAIN_PATH}", json=payload
            )
            response.raise_for_status()
            data = response.json()

        self._resolved_base_url = resolved_base_url
        return AgentExplanationResult(
            que_paso=data["que_paso"],
            posible_causa=data["posible_causa"],
            por_que_importa=data["por_que_importa"],
            confidence_score=float(data["confidence_score"]),
            is_noise=bool(data["is_noise"]),
        )

    def _resolve_base_url(self) -> str:
        if self._resolved_base_url is not None:
            return self._resolved_base_url

        discovered_base_url = self._discover_base_url()
        if discovered_base_url is not None:
            return discovered_base_url

        return self.base_url

    def _discover_base_url(self, *, exclude: set[str] | None = None) -> str | None:
        excluded_urls = exclude or set()
        for candidate in self._candidate_base_urls():
            if candidate in excluded_urls:
                continue

            if self._is_agents_service(candidate):
                if candidate != self.base_url:
                    logger.warning(
                        "Configured agents_url %s is unavailable; discovered Hive Agents at %s instead.",
                        self.base_url,
                        candidate,
                    )
                self._resolved_base_url = candidate
                return candidate

        self._resolved_base_url = None
        return None

    def _candidate_base_urls(self) -> list[str]:
        candidates = [self.base_url]
        parsed_url = urlparse(self.base_url)

        if parsed_url.hostname not in {"localhost", "127.0.0.1"}:
            return candidates

        scheme = parsed_url.scheme or "http"
        host = parsed_url.hostname or "localhost"

        for port in LOCAL_DISCOVERY_PORTS:
            candidate = urlunparse((scheme, f"{host}:{port}", "", "", "", "")).rstrip("/")
            if candidate not in candidates:
                candidates.append(candidate)

        return candidates

    def _is_agents_service(self, candidate_base_url: str) -> bool:
        discovery_timeout = min(self.timeout_seconds, 2.0)

        try:
            with httpx.Client(timeout=discovery_timeout) as client:
                response = client.get(f"{candidate_base_url}/openapi.json")
                response.raise_for_status()
                openapi = response.json()
        except (httpx.HTTPError, ValueError, TypeError):
            return False

        paths = openapi.get("paths")
        return isinstance(paths, dict) and MARKET_SENTINEL_EXPLAIN_PATH in paths

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

    def _build_fallback_result(
        self,
        *,
        signal: MarketSignal,
        news_items: list[NewsSearchItem],
        event_type: str,
        baseline_confidence_score: float,
        has_news_support: bool,
    ) -> AgentExplanationResult:
        direction = "subio" if signal.price_change_pct >= 0 else "cayo"
        nearest_headline = news_items[0].title if news_items else None
        event_label = event_type.replace("_", " ")

        cause = (
            f"La noticia mas cercana fue: {nearest_headline}."
            if nearest_headline
            else "No se encontro una noticia claramente relacionada en la ventana analizada."
        )

        importance = (
            "El movimiento combina precio, volumen y contexto informativo, por lo que merece seguimiento."
            if has_news_support
            else "Sin confirmacion del servicio de agentes, esta alerta conserva una explicacion local y debe revisarse manualmente."
        )

        return AgentExplanationResult(
            que_paso=(
                f"{signal.ticker} {direction} {abs(signal.price_change_pct):.2f}% "
                f"con un ratio de volumen de {signal.volume_ratio:.2f}x "
                f"en un evento clasificado como {event_label}."
            ),
            posible_causa=cause,
            por_que_importa=importance,
            confidence_score=baseline_confidence_score,
            is_noise=False,
        )
