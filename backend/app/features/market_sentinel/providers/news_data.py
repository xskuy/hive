from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from math import ceil
from urllib.parse import urlparse

import httpx

from app.features.market_sentinel.types import NewsSearchItem, UniverseTicker


logger = logging.getLogger(__name__)


class TavilyNewsProvider:
    """Search recent news for anomalous tickers using Tavily's search API."""

    API_URL = "https://api.tavily.com/search"

    def __init__(self, api_key: str, timeout_seconds: float = 20.0) -> None:
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds

    def search_news(
        self,
        entry: UniverseTicker,
        *,
        lookback_hours: int,
        max_results: int,
    ) -> list[NewsSearchItem]:
        """Return only recent and relevant news items."""
        if not self.api_key:
            return []

        payload = {
            "api_key": self.api_key,
            "query": f"{entry.ticker} {entry.company_name} stock shares",
            "topic": "news",
            "search_depth": "basic",
            "max_results": max_results,
            "days": max(1, ceil(lookback_hours / 24)),
        }

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(self.API_URL, json=payload)
                response.raise_for_status()
                data = response.json()
        except Exception:
            logger.exception("Tavily news lookup failed for %s", entry.ticker)
            return []

        cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)
        items: list[NewsSearchItem] = []

        for result in data.get("results", []):
            published_at = self._parse_datetime(result.get("published_date") or result.get("published_at"))
            if published_at is not None and published_at < cutoff:
                continue

            items.append(
                NewsSearchItem(
                    title=result.get("title", "Untitled result"),
                    url=result.get("url", ""),
                    source=result.get("source") or self._extract_source(result.get("url", "")),
                    published_at=published_at,
                    relevance_score=round(float(result.get("score") or 0.0), 2),
                )
            )

        return items[:max_results]

    def _parse_datetime(self, value: str | None) -> datetime | None:
        """Handle Tavily timestamps with or without UTC suffixes."""
        if not value:
            return None

        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    def _extract_source(self, url: str) -> str:
        """Fallback source label when Tavily does not return one."""
        hostname = urlparse(url).hostname or ""
        return hostname.removeprefix("www.") or "unknown"
