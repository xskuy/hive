from __future__ import annotations

import pytest

from app.market_sentinel.schemas import MarketSentinelExplainRequest
from app.market_sentinel.service import MarketSentinelAgentService


class FakeAsyncChain:
    def __init__(self, payload=None, should_raise: bool = False) -> None:
        if isinstance(payload, list):
            self.payloads = payload
        else:
            self.payloads = [payload]
        self.should_raise = should_raise
        self.calls = 0
        self.prompts: list[str] = []

    async def ainvoke(self, prompt: str):
        self.calls += 1
        self.prompts.append(prompt)
        if self.should_raise:
            raise RuntimeError("chain failed")
        index = min(self.calls, len(self.payloads)) - 1
        return self.payloads[index]


def build_request() -> MarketSentinelExplainRequest:
    return MarketSentinelExplainRequest(
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


@pytest.mark.asyncio
async def test_market_sentinel_graph_returns_structured_response() -> None:
    critic = FakeAsyncChain(
        {
            "should_rewrite": False,
            "feedback": "",
        }
    )
    service = MarketSentinelAgentService(
        explainer_chain=FakeAsyncChain(
            {
                "que_paso": "NVDA subio con fuerza.",
                "posible_causa": "Hubo una noticia favorable sobre demanda de chips.",
                "por_que_importa": "Puede anticipar continuidad si la noticia tiene fundamento.",
            }
        ),
        critic_chain=critic,
        validator_chain=FakeAsyncChain(
            {
                "confidence_score": 0.84,
                "is_noise": False,
            }
        ),
    )

    response = await service.explain_candidate_event(build_request())

    assert response.confidence_score == 0.84
    assert response.is_noise is False
    assert response.que_paso
    assert response.critic_status == "passed"
    assert response.critic_feedback is None
    assert response.critic_revision_count == 0
    assert critic.calls == 1


@pytest.mark.asyncio
async def test_market_sentinel_graph_rewrites_explanation_twice_before_validation() -> None:
    explainer = FakeAsyncChain(
        [
            {
                "que_paso": "NVDA subio fuerte.",
                "posible_causa": "Hubo interes comprador.",
                "por_que_importa": "Podria importar.",
            },
            {
                "que_paso": "NVDA subio 4.2% con volumen anomalo.",
                "posible_causa": "El mercado reacciono a una noticia de demanda de chips.",
                "por_que_importa": "La noticia podria sostener el movimiento si se confirma.",
            },
            {
                "que_paso": "NVDA subio 4.2% con 4.0x de volumen frente a su baseline.",
                "posible_causa": "La demanda por chips de IA impulso compras tras una noticia favorable.",
                "por_que_importa": "El movimiento mezcla precio, volumen y un catalizador plausible que amerita seguimiento.",
            },
        ]
    )
    critic = FakeAsyncChain(
        [
            {
                "should_rewrite": True,
                "feedback": "Aclara mejor la causa concreta del movimiento.",
            },
            {
                "should_rewrite": True,
                "feedback": "Explica con mas detalle por que importa para el analista.",
            },
            {
                "should_rewrite": False,
                "feedback": "",
            },
        ]
    )
    service = MarketSentinelAgentService(
        explainer_chain=explainer,
        critic_chain=critic,
        validator_chain=FakeAsyncChain(
            {
                "confidence_score": 0.88,
                "is_noise": False,
            }
        ),
    )

    response = await service.explain_candidate_event(build_request())

    assert response.critic_status == "revised"
    assert response.critic_revision_count == 2
    assert response.critic_feedback == "Explica con mas detalle por que importa para el analista."
    assert explainer.calls == 3
    assert critic.calls == 3
    assert "Aclara mejor la causa concreta del movimiento." in explainer.prompts[1]
    assert "Explica con mas detalle por que importa para el analista." in explainer.prompts[2]


@pytest.mark.asyncio
async def test_market_sentinel_graph_caps_rewrites_after_two_loops() -> None:
    explainer = FakeAsyncChain(
        [
            {
                "que_paso": "NVDA subio fuerte.",
                "posible_causa": "Hubo interes comprador.",
                "por_que_importa": "Podria importar.",
            },
            {
                "que_paso": "NVDA subio con volumen fuera de rango.",
                "posible_causa": "Hubo flujo comprador inusual.",
                "por_que_importa": "Senal para revisar.",
            },
            {
                "que_paso": "NVDA mantuvo una subida con presion compradora.",
                "posible_causa": "La noticia y el volumen apoyan una senal aun incompleta.",
                "por_que_importa": "Todavia falta contexto para decidir su persistencia.",
            },
        ]
    )
    critic = FakeAsyncChain(
        [
            {
                "should_rewrite": True,
                "feedback": "Haz mas especifico que paso.",
            },
            {
                "should_rewrite": True,
                "feedback": "Conecta mejor la causa con la evidencia.",
            },
            {
                "should_rewrite": True,
                "feedback": "Todavia falta claridad sobre por que importa.",
            },
        ]
    )
    service = MarketSentinelAgentService(
        explainer_chain=explainer,
        critic_chain=critic,
        validator_chain=FakeAsyncChain(
            {
                "confidence_score": 0.81,
                "is_noise": False,
            }
        ),
    )

    response = await service.explain_candidate_event(build_request())

    assert response.critic_status == "max_revisions_reached"
    assert response.critic_revision_count == 2
    assert response.critic_feedback == "Todavia falta claridad sobre por que importa."
    assert explainer.calls == 3
    assert critic.calls == 3


@pytest.mark.asyncio
async def test_market_sentinel_graph_skips_critic_when_critic_chain_fails() -> None:
    service = MarketSentinelAgentService(
        explainer_chain=FakeAsyncChain(
            {
                "que_paso": "AMD subio con fuerza.",
                "posible_causa": "Hubo compras tras un reporte sectorial.",
                "por_que_importa": "Podria anticipar continuidad si el sector acompana.",
            }
        ),
        critic_chain=FakeAsyncChain(should_raise=True),
        validator_chain=FakeAsyncChain(
            {
                "confidence_score": 0.79,
                "is_noise": False,
            }
        ),
    )

    response = await service.explain_candidate_event(
        build_request().model_copy(
            update={
                "ticker": "AMD",
                "company_name": "Advanced Micro Devices",
                "price": 140.0,
                "price_change_pct": 3.4,
                "volume": 1400.0,
                "volume_baseline": 400.0,
                "volume_ratio": 3.5,
                "has_news_support": False,
            }
        )
    )

    assert response.critic_status == "skipped"
    assert response.critic_feedback is None
    assert response.critic_revision_count == 0


@pytest.mark.asyncio
async def test_market_sentinel_graph_falls_back_when_llm_nodes_fail() -> None:
    critic = FakeAsyncChain(
        {
            "should_rewrite": True,
            "feedback": "This feedback should never be used.",
        }
    )
    service = MarketSentinelAgentService(
        explainer_chain=FakeAsyncChain(should_raise=True),
        critic_chain=critic,
        validator_chain=FakeAsyncChain(should_raise=True),
    )

    response = await service.explain_candidate_event(
        build_request().model_copy(
            update={
                "ticker": "AMD",
                "company_name": "Advanced Micro Devices",
                "price": 140.0,
                "price_change_pct": 3.4,
                "volume": 1400.0,
                "volume_baseline": 400.0,
                "volume_ratio": 3.5,
                "has_news_support": False,
            }
        )
    )

    assert "AMD" in response.que_paso
    assert response.confidence_score == 0.7
    assert response.is_noise is False
    assert response.critic_status == "skipped"
    assert response.critic_feedback is None
    assert response.critic_revision_count == 0
    assert critic.calls == 0
