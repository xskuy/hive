from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from math import isfinite
from typing import Iterable

import yfinance as yf

from app.features.market_sentinel.types import MarketSignal, UniverseTicker


logger = logging.getLogger(__name__)


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
