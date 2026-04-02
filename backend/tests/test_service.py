from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base
from app.features.market_sentinel.schemas import UpdateMarketSentinelConfigRequest
from app.features.market_sentinel.service import MarketSentinelService
from app.features.market_sentinel.types import (
    AgentExplanationResult,
    MarketSignal,
    NewsSearchItem,
    UniverseTicker,
)


class FakeMarketDataProvider:
    def __init__(self, signals: list[MarketSignal]) -> None:
        self.signals = signals

    def fetch_signals(self, universe: list[UniverseTicker]) -> tuple[list[MarketSignal], list[str]]:
        return self.signals, []


class FakeNewsProvider:
    def __init__(self, news_items: list[NewsSearchItem]) -> None:
        self.news_items = news_items

    def search_news(
        self,
        entry: UniverseTicker,
        *,
        lookback_hours: int,
        max_results: int,
    ) -> list[NewsSearchItem]:
        return self.news_items[:max_results]


class FakeAgentsClient:
    def __init__(self, *, is_noise: bool = False, confidence_score: float = 0.8) -> None:
        self.is_noise = is_noise
        self.confidence_score = confidence_score

    def explain_event(
        self,
        *,
        signal: MarketSignal,
        news_items: list[NewsSearchItem],
        event_type: str,
        baseline_confidence_score: float,
        has_news_support: bool,
    ) -> AgentExplanationResult:
        return AgentExplanationResult(
            que_paso=f"{signal.ticker} se movio fuerte.",
            posible_causa="Catalizador de prueba.",
            por_que_importa="Escenario util para validar el pipeline.",
            confidence_score=self.confidence_score,
            is_noise=self.is_noise,
        )


def build_session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)()


def test_run_scan_persists_alert_without_news(monkeypatch) -> None:
    session = build_session()
    monkeypatch.setattr(
        "app.features.market_sentinel.service.load_universe",
        lambda path: [UniverseTicker(ticker="NVDA", company_name="NVIDIA")],
    )
    monkeypatch.setattr("app.features.market_sentinel.service.settings.market_sentinel_enabled", True)

    service = MarketSentinelService(
        session,
        market_data_provider=FakeMarketDataProvider(
            [
                MarketSignal(
                    ticker="NVDA",
                    company_name="NVIDIA",
                    price=100.0,
                    price_change_pct=3.1,
                    volume=1000.0,
                    volume_baseline=300.0,
                    volume_ratio=3.33,
                )
            ]
        ),
        news_provider=FakeNewsProvider([]),
        agents_client=FakeAgentsClient(),
    )

    response = service.run_scan()

    assert response.scan_run.alerts_created == 1
    assert response.scan_run.threshold_candidates == 1
    assert response.scan_run.signals_reviewed == 1
    assert response.alerts[0].has_news_support is False


def test_run_scan_marks_news_supported_alert(monkeypatch) -> None:
    session = build_session()
    monkeypatch.setattr(
        "app.features.market_sentinel.service.load_universe",
        lambda path: [UniverseTicker(ticker="XOM", company_name="Exxon Mobil")],
    )
    monkeypatch.setattr("app.features.market_sentinel.service.settings.market_sentinel_enabled", True)

    news_items = [
        NewsSearchItem(
            title="Oil rallies on shipping concerns",
            url="https://example.com/oil-rally",
            source="example",
            published_at=datetime.now(timezone.utc),
            relevance_score=0.91,
        )
    ]

    service = MarketSentinelService(
        session,
        market_data_provider=FakeMarketDataProvider(
            [
                MarketSignal(
                    ticker="XOM",
                    company_name="Exxon Mobil",
                    price=118.0,
                    price_change_pct=2.4,
                    volume=1800.0,
                    volume_baseline=500.0,
                    volume_ratio=3.6,
                )
            ]
        ),
        news_provider=FakeNewsProvider(news_items),
        agents_client=FakeAgentsClient(confidence_score=0.95),
    )

    response = service.run_scan()
    detail = service.get_alert(alert_id=response.alerts[0].id)

    assert response.alerts[0].has_news_support is True
    assert len(detail.news_items) == 1
    assert detail.confidence_score == 0.95


def test_run_scan_skips_noise_events(monkeypatch) -> None:
    session = build_session()
    monkeypatch.setattr(
        "app.features.market_sentinel.service.load_universe",
        lambda path: [UniverseTicker(ticker="AMD", company_name="Advanced Micro Devices")],
    )
    monkeypatch.setattr("app.features.market_sentinel.service.settings.market_sentinel_enabled", True)

    service = MarketSentinelService(
        session,
        market_data_provider=FakeMarketDataProvider(
            [
                MarketSignal(
                    ticker="AMD",
                    company_name="Advanced Micro Devices",
                    price=140.0,
                    price_change_pct=3.3,
                    volume=1400.0,
                    volume_baseline=400.0,
                    volume_ratio=3.5,
                )
            ]
        ),
        news_provider=FakeNewsProvider([]),
        agents_client=FakeAgentsClient(is_noise=True),
    )

    response = service.run_scan()

    assert response.scan_run.anomalies_found == 1
    assert response.scan_run.alerts_created == 0
    assert response.scan_run.noise_discarded == 1
    assert response.alerts == []


def test_run_scan_applies_cooldown_dedup(monkeypatch) -> None:
    session = build_session()
    monkeypatch.setattr(
        "app.features.market_sentinel.service.load_universe",
        lambda path: [UniverseTicker(ticker="PM", company_name="Philip Morris International")],
    )
    monkeypatch.setattr("app.features.market_sentinel.service.settings.market_sentinel_enabled", True)

    service = MarketSentinelService(
        session,
        market_data_provider=FakeMarketDataProvider(
            [
                MarketSignal(
                    ticker="PM",
                    company_name="Philip Morris International",
                    price=157.0,
                    price_change_pct=0.2,
                    volume=2200.0,
                    volume_baseline=700.0,
                    volume_ratio=3.14,
                )
            ]
        ),
        news_provider=FakeNewsProvider([]),
        agents_client=FakeAgentsClient(confidence_score=0.7),
    )

    service.update_config(
        UpdateMarketSentinelConfigRequest(alert_cooldown_hours=6)
    )
    first_response = service.run_scan()
    second_response = service.run_scan()

    assert first_response.scan_run.alerts_created == 1
    assert second_response.scan_run.alerts_created == 0
    assert second_response.scan_run.cooldown_suppressed == 1
