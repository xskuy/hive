from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from math import isfinite
from typing import Iterable

import httpx
import yfinance as yf

from app.features.market_sentinel.types import MarketDataProvider, MarketSignal, UniverseTicker


logger = logging.getLogger(__name__)


class PolygonFetchError(ValueError):
    """Sanitized Polygon failure that should not expose request URLs or keys."""


class PolygonRateLimitError(PolygonFetchError):
    """Explicit rate-limit failure so callers can degrade gracefully."""


@dataclass(frozen=True)
class PolygonAggregateBar:
    """Minimal aggregate bar shape needed to build a normalized market signal."""

    close: float
    volume: float


class YFinanceMarketDataProvider:
    """Fetch recent price and volume data for a fixed ticker universe."""

    def __init__(self, history_period: str = "5d", interval: str = "1h", max_workers: int = 8) -> None:
        self.history_period = history_period
        self.interval = interval
        self.max_workers = max_workers

    def fetch_signals(self, universe: Iterable[UniverseTicker]) -> tuple[list[MarketSignal], list[str]]:
        """Return normalized signals plus the tickers that failed to load."""
        signals: list[MarketSignal] = []
        failures: list[str] = []
        entries = list(universe)

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            for signal, failed_ticker in executor.map(self._load_signal_safe, entries):
                if signal is not None:
                    signals.append(signal)
                if failed_ticker is not None:
                    failures.append(failed_ticker)

        return signals, failures

    def _load_signal_safe(self, entry: UniverseTicker) -> tuple[MarketSignal | None, str | None]:
        """Isolate yfinance failures so one ticker does not abort the whole scan."""
        try:
            return self._load_signal(entry), None
        except Exception:
            logger.exception("Market data fetch failed for %s", entry.ticker)
            return None, entry.ticker

    def _load_signal(self, entry: UniverseTicker) -> MarketSignal:
        """Convert recent yfinance history into a compact signal object."""
        history = yf.Ticker(entry.ticker).history(
            period=self.history_period,
            interval=self.interval,
            auto_adjust=False,
            actions=False,
        )

        if history.empty:
            raise ValueError(f"No price history available for {entry.ticker}")

        close = history["Close"].dropna()
        volume = history["Volume"].fillna(0)

        if len(close) < 2 or volume.empty:
            raise ValueError(f"Not enough history to compute market signal for {entry.ticker}")

        latest_price = float(close.iloc[-1])
        previous_close = float(close.iloc[-2])
        latest_volume = float(volume.iloc[-1])
        baseline_window = volume.iloc[:-1].tail(20)
        volume_baseline = float(baseline_window.mean()) if not baseline_window.empty else latest_volume

        price_change_pct = 0.0 if previous_close == 0 else ((latest_price - previous_close) / previous_close) * 100
        volume_ratio = 0.0 if volume_baseline <= 0 else latest_volume / volume_baseline

        if not isfinite(price_change_pct):
            price_change_pct = 0.0
        if not isfinite(volume_ratio):
            volume_ratio = 0.0

        return MarketSignal(
            ticker=entry.ticker,
            company_name=entry.company_name,
            price=round(latest_price, 2),
            price_change_pct=round(price_change_pct, 2),
            volume=round(latest_volume, 2),
            volume_baseline=round(volume_baseline, 2),
            volume_ratio=round(volume_ratio, 2),
        )


class PolygonMarketDataProvider:
    """Fetch recent intraday aggregates from Polygon and normalize them."""

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = "https://api.polygon.io",
        timeout_seconds: float = 20.0,
        multiplier: int = 15,
        timespan: str = "minute",
        lookback_days: int = 7,
        max_workers: int = 8,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.multiplier = multiplier
        self.timespan = timespan
        self.lookback_days = lookback_days
        self.max_workers = max_workers

    def fetch_signals(self, universe: Iterable[UniverseTicker]) -> tuple[list[MarketSignal], list[str]]:
        """Return normalized signals plus the tickers that failed to load."""
        if not self.api_key:
            entries = list(universe)
            return [], [entry.ticker for entry in entries]

        signals: list[MarketSignal] = []
        failures: list[str] = []
        entries = list(universe)

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            for signal, failed_ticker in executor.map(self._load_signal_safe, entries):
                if signal is not None:
                    signals.append(signal)
                if failed_ticker is not None:
                    failures.append(failed_ticker)

        return signals, failures

    def _load_signal_safe(self, entry: UniverseTicker) -> tuple[MarketSignal | None, str | None]:
        """Isolate per-ticker failures so the scan can fallback selectively."""
        try:
            return self._load_signal(entry), None
        except PolygonRateLimitError as exc:
            logger.warning("%s", exc)
            return None, entry.ticker
        except PolygonFetchError as exc:
            logger.warning("%s", exc)
            return None, entry.ticker
        except Exception:
            logger.exception("Polygon market data fetch failed for %s", entry.ticker)
            return None, entry.ticker

    def _load_signal(self, entry: UniverseTicker) -> MarketSignal:
        """Convert recent Polygon aggregates into the shared market signal model."""
        bars = self._fetch_aggregates(entry.ticker)
        if len(bars) < 21:
            raise ValueError(f"Not enough Polygon aggregates to compute market signal for {entry.ticker}")

        latest_bar = bars[-1]
        previous_bar = bars[-2]
        baseline_window = bars[:-1][-20:]

        latest_price = latest_bar.close
        previous_close = previous_bar.close
        latest_volume = latest_bar.volume
        volume_baseline = (
            sum(bar.volume for bar in baseline_window) / len(baseline_window)
            if baseline_window
            else latest_volume
        )

        price_change_pct = 0.0 if previous_close == 0 else ((latest_price - previous_close) / previous_close) * 100
        volume_ratio = 0.0 if volume_baseline <= 0 else latest_volume / volume_baseline

        if not isfinite(price_change_pct):
            price_change_pct = 0.0
        if not isfinite(volume_ratio):
            volume_ratio = 0.0

        return MarketSignal(
            ticker=entry.ticker,
            company_name=entry.company_name,
            price=round(latest_price, 2),
            price_change_pct=round(price_change_pct, 2),
            volume=round(latest_volume, 2),
            volume_baseline=round(volume_baseline, 2),
            volume_ratio=round(volume_ratio, 2),
        )

    def _fetch_aggregates(self, ticker: str) -> list[PolygonAggregateBar]:
        """Fetch recent aggregate bars using the official Polygon REST endpoint."""
        end_date = datetime.now(timezone.utc).date()
        start_date = end_date - timedelta(days=self.lookback_days)
        url = (
            f"{self.base_url}/v2/aggs/ticker/{ticker}/range/"
            f"{self.multiplier}/{self.timespan}/{start_date.isoformat()}/{end_date.isoformat()}"
        )
        params = {
            "adjusted": "true",
            "sort": "asc",
            "limit": 200,
            "apiKey": self.api_key,
        }

        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.get(url, params=params)
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code == 429:
                    raise PolygonRateLimitError(
                        f"Polygon rate limit hit for {ticker}; falling back to the secondary provider."
                    ) from None
                raise PolygonFetchError(
                    f"Polygon request failed for {ticker} with status {exc.response.status_code}."
                ) from None
            payload = response.json()

        results = payload.get("results", [])
        if not results:
            raise PolygonFetchError(f"No Polygon aggregate data available for {ticker}")

        bars = [
            PolygonAggregateBar(
                close=float(item["c"]),
                volume=float(item.get("v") or 0.0),
            )
            for item in results
            if item.get("c") is not None
        ]
        if len(bars) < 21:
            raise PolygonFetchError(f"Polygon returned insufficient aggregate bars for {ticker}")
        return bars


class FallbackMarketDataProvider:
    """Use a premium provider first and only fallback for the tickers that failed."""

    def __init__(
        self,
        primary: MarketDataProvider,
        fallback: MarketDataProvider,
        *,
        primary_name: str,
        fallback_name: str,
    ) -> None:
        self.primary = primary
        self.fallback = fallback
        self.primary_name = primary_name
        self.fallback_name = fallback_name

    def fetch_signals(self, universe: Iterable[UniverseTicker]) -> tuple[list[MarketSignal], list[str]]:
        entries = list(universe)
        primary_signals, failed_tickers = self.primary.fetch_signals(entries)
        if not failed_tickers:
            return primary_signals, []

        logger.warning(
            "Primary market data provider %s failed for %s tickers; retrying with %s.",
            self.primary_name,
            len(failed_tickers),
            self.fallback_name,
        )

        failed_set = set(failed_tickers)
        fallback_universe = [entry for entry in entries if entry.ticker in failed_set]
        fallback_signals, fallback_failures = self.fallback.fetch_signals(fallback_universe)

        signal_by_ticker = {signal.ticker: signal for signal in primary_signals}
        signal_by_ticker.update({signal.ticker: signal for signal in fallback_signals})

        ordered_signals = [signal_by_ticker[entry.ticker] for entry in entries if entry.ticker in signal_by_ticker]
        return ordered_signals, fallback_failures


def build_market_data_provider(
    *,
    provider_name: str,
    polygon_api_key: str,
    polygon_base_url: str,
    timeout_seconds: float,
) -> tuple[MarketDataProvider, str, str | None]:
    """Resolve the effective provider chain from environment-driven configuration."""
    yfinance_provider = YFinanceMarketDataProvider()

    if provider_name == "polygon":
        if not polygon_api_key:
            logger.warning(
                "Market Sentinel is configured to use Polygon but MARKET_SENTINEL_POLYGON_API_KEY is missing. Falling back to yfinance."
            )
            return yfinance_provider, "yfinance", None

        polygon_provider = PolygonMarketDataProvider(
            api_key=polygon_api_key,
            base_url=polygon_base_url,
            timeout_seconds=timeout_seconds,
        )
        return (
            FallbackMarketDataProvider(
                polygon_provider,
                yfinance_provider,
                primary_name="polygon",
                fallback_name="yfinance",
            ),
            "polygon",
            "yfinance",
        )

    return yfinance_provider, "yfinance", None
