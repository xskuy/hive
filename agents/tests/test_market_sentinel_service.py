from __future__ import annotations

import pytest

from app.market_sentinel.schemas import MarketSentinelExplainRequest
from app.market_sentinel.service import MarketSentinelAgentService


class FakeAsyncChain:
    def __init__(self, payload=None, should_raise: bool = False) -> None:
        self.payload = payload
        self.should_raise = should_raise

    async def ainvoke(self, prompt: str):
        if self.should_raise:
            raise RuntimeError("chain failed")
        return self.payload


@pytest.mark.asyncio
async def test_market_sentinel_graph_returns_structured_response() -> None:
    service = MarketSentinelAgentService(
        explainer_chain=FakeAsyncChain(
            {
                "que_paso": "NVDA subio con fuerza.",
                "posible_causa": "Hubo una noticia favorable sobre demanda de chips.",
                "por_que_importa": "Puede anticipar continuidad si la noticia tiene fundamento.",
            }
        ),
        validator_chain=FakeAsyncChain(
            {
                "confidence_score": 0.84,
                "is_noise": False,
            }
        ),
    )

    response = await service.explain_candidate_event(
        MarketSentinelExplainRequest(
            ticker="NVDA",
            company_name="NVIDIA",
            event_type="price_volume_spike",
            price=120.0,
            price_change_pct=4.2,
            volume=2000.0,
            volume_baseline=500.0,
            volume_ratio=4.0,
            baseline_confidence_score=0.7,
            has_news_support=True,
            news_items=[],
        )
    )

    assert response.confidence_score == 0.84
    assert response.is_noise is False
    assert response.que_paso


@pytest.mark.asyncio
async def test_market_sentinel_graph_falls_back_when_llm_nodes_fail() -> None:
    service = MarketSentinelAgentService(
        explainer_chain=FakeAsyncChain(should_raise=True),
        validator_chain=FakeAsyncChain(should_raise=True),
    )

    response = await service.explain_candidate_event(
        MarketSentinelExplainRequest(
            ticker="AMD",
            company_name="Advanced Micro Devices",
            event_type="price_volume_spike",
            price=140.0,
            price_change_pct=3.4,
            volume=1400.0,
            volume_baseline=400.0,
            volume_ratio=3.5,
            baseline_confidence_score=0.7,
            has_news_support=False,
            news_items=[],
        )
    )

    assert "AMD" in response.que_paso
    assert response.confidence_score == 0.7
    assert response.is_noise is False
