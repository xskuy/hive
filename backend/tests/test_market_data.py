from __future__ import annotations

from app.features.market_sentinel.providers.market_data import (
    FallbackMarketDataProvider,
    PolygonAggregateBar,
    PolygonMarketDataProvider,
    YFinanceMarketDataProvider,
    build_market_data_provider,
)
from app.features.market_sentinel.types import MarketSignal, UniverseTicker


class StubMarketDataProvider:
    def __init__(
        self,
        *,
        signals: list[MarketSignal] | None = None,
        failures: list[str] | None = None,
    ) -> None:
        self.signals = signals or []
        self.failures = failures or []

    def fetch_signals(self, universe: list[UniverseTicker]) -> tuple[list[MarketSignal], list[str]]:
        return self.signals, self.failures


def test_polygon_market_data_provider_normalizes_aggregate_bars(monkeypatch) -> None:
    provider = PolygonMarketDataProvider(api_key="test-key", max_workers=1)
    bars = [
        PolygonAggregateBar(close=100 + index, volume=1000 + (index * 10))
        for index in range(22)
    ]
    monkeypatch.setattr(provider, "_fetch_aggregates", lambda ticker: bars)

    signal = provider._load_signal(UniverseTicker(ticker="NVDA", company_name="NVIDIA"))

    assert signal.ticker == "NVDA"
    assert signal.price == 121.0
    assert signal.price_change_pct == 0.83
    assert signal.volume == 1210.0
    assert signal.volume_baseline == 1105.0
    assert signal.volume_ratio == 1.1


def test_fallback_market_data_provider_uses_secondary_for_failed_tickers() -> None:
    universe = [
        UniverseTicker(ticker="AAPL", company_name="Apple"),
        UniverseTicker(ticker="MSFT", company_name="Microsoft"),
    ]
    primary = StubMarketDataProvider(
        signals=[
            MarketSignal(
                ticker="AAPL",
                company_name="Apple",
                price=190.0,
                price_change_pct=2.1,
                volume=1000.0,
                volume_baseline=400.0,
                volume_ratio=2.5,
            )
        ],
        failures=["MSFT"],
    )
    fallback = StubMarketDataProvider(
        signals=[
            MarketSignal(
                ticker="MSFT",
                company_name="Microsoft",
                price=410.0,
                price_change_pct=1.8,
                volume=900.0,
                volume_baseline=450.0,
                volume_ratio=2.0,
            )
        ]
    )
    provider = FallbackMarketDataProvider(
        primary,
        fallback,
        primary_name="polygon",
        fallback_name="yfinance",
    )

    signals, failures = provider.fetch_signals(universe)

    assert [signal.ticker for signal in signals] == ["AAPL", "MSFT"]
    assert failures == []


def test_build_market_data_provider_uses_yfinance_when_polygon_key_missing() -> None:
    provider, provider_name, fallback_name = build_market_data_provider(
        provider_name="polygon",
        polygon_api_key="",
        polygon_base_url="https://api.polygon.io",
        timeout_seconds=20.0,
    )

    assert isinstance(provider, YFinanceMarketDataProvider)
    assert provider_name == "yfinance"
    assert fallback_name is None
