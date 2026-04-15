from __future__ import annotations

import httpx

from app.features.market_sentinel.providers.agents_client import MarketSentinelAgentsClient
from app.features.market_sentinel.types import MarketSignal, NewsSearchItem


def test_agents_client_falls_back_when_remote_endpoint_fails(monkeypatch) -> None:
    client = MarketSentinelAgentsClient(base_url="http://localhost:8000", timeout_seconds=5.0)

    class StubHttpClient:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def __enter__(self) -> "StubHttpClient":
            return self

        def __exit__(self, exc_type, exc, tb) -> None:
            return None

        def get(self, url: str) -> httpx.Response:
            request = httpx.Request("GET", url)
            response = httpx.Response(404, request=request, json={"detail": "Not Found"})
            raise httpx.HTTPStatusError("not found", request=request, response=response)

        def post(self, url: str, json: dict[str, object]) -> httpx.Response:
            request = httpx.Request("POST", url)
            response = httpx.Response(404, request=request, json={"detail": "Not Found"})
            raise httpx.HTTPStatusError("not found", request=request, response=response)

    monkeypatch.setattr(httpx, "Client", StubHttpClient)

    result = client.explain_event(
        signal=MarketSignal(
            ticker="NVDA",
            company_name="NVIDIA",
            price=120.0,
            price_change_pct=4.2,
            volume=2000.0,
            volume_baseline=500.0,
            volume_ratio=4.0,
        ),
        news_items=[
            NewsSearchItem(
                title="NVIDIA rallies on AI demand",
                url="https://example.com/nvda",
                source="example",
                published_at=None,
                relevance_score=0.92,
            )
        ],
        event_type="price_volume_spike",
        baseline_confidence_score=0.7,
        has_news_support=True,
    )

    assert result.confidence_score == 0.7
    assert result.is_noise is False
    assert "NVDA" in result.que_paso
    assert "NVIDIA rallies on AI demand" in result.posible_causa


def test_agents_client_discovers_alternative_local_port(monkeypatch) -> None:
    client = MarketSentinelAgentsClient(base_url="http://localhost:8000", timeout_seconds=5.0)

    class StubHttpClient:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def __enter__(self) -> "StubHttpClient":
            return self

        def __exit__(self, exc_type, exc, tb) -> None:
            return None

        def get(self, url: str) -> httpx.Response:
            request = httpx.Request("GET", url)

            if url == "http://localhost:8002/openapi.json":
                return httpx.Response(
                    200,
                    request=request,
                    json={"paths": {"/api/market-sentinel/explain": {}}},
                )

            response = httpx.Response(404, request=request, json={"detail": "Not Found"})
            raise httpx.HTTPStatusError("not found", request=request, response=response)

        def post(self, url: str, json: dict[str, object]) -> httpx.Response:
            request = httpx.Request("POST", url)

            if url == "http://localhost:8002/api/market-sentinel/explain":
                return httpx.Response(
                    200,
                    request=request,
                    json={
                        "que_paso": "NVIDIA subio por noticia positiva.",
                        "posible_causa": "El mercado reacciono a la demanda de IA.",
                        "por_que_importa": "Puede sostener la tendencia.",
                        "confidence_score": 0.91,
                        "is_noise": False,
                    },
                )

            response = httpx.Response(404, request=request, json={"detail": "Not Found"})
            raise httpx.HTTPStatusError("not found", request=request, response=response)

    monkeypatch.setattr(httpx, "Client", StubHttpClient)

    result = client.explain_event(
        signal=MarketSignal(
            ticker="NVDA",
            company_name="NVIDIA",
            price=120.0,
            price_change_pct=4.2,
            volume=2000.0,
            volume_baseline=500.0,
            volume_ratio=4.0,
        ),
        news_items=[],
        event_type="price_volume_spike",
        baseline_confidence_score=0.7,
        has_news_support=False,
    )

    assert result.confidence_score == 0.91
    assert result.que_paso == "NVIDIA subio por noticia positiva."
    assert client._resolved_base_url == "http://localhost:8002"
