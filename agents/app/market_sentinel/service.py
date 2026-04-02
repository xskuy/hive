from __future__ import annotations

from typing import Any

from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.types import RetryPolicy
from typing_extensions import TypedDict

from app.market_sentinel.schemas import (
    ExplanationDraft,
    MarketSentinelExplainRequest,
    MarketSentinelExplainResponse,
    ValidationDraft,
)
from config import settings


retry = RetryPolicy(max_attempts=3, initial_interval=1.0)


class MarketSentinelState(TypedDict):
    """Shared state for the Market Sentinel explanation flow."""

    ticker: str
    company_name: str
    event_type: str
    price: float
    price_change_pct: float
    volume: float
    volume_baseline: float
    volume_ratio: float
    baseline_confidence_score: float
    has_news_support: bool
    news_items: list[dict[str, Any]]
    context_block: str
    que_paso: str
    posible_causa: str
    por_que_importa: str
    confidence_score: float
    is_noise: bool


class MarketSentinelAgentService:
    """Explain and validate candidate market events through a small graph."""

    def __init__(
        self,
        *,
        explainer_chain: Any | None = None,
        validator_chain: Any | None = None,
    ) -> None:
        self.explainer_chain = explainer_chain or self._build_explainer_chain()
        self.validator_chain = validator_chain or self._build_validator_chain()
        self.graph = self._build_graph()

    async def explain_candidate_event(
        self,
        request: MarketSentinelExplainRequest,
    ) -> MarketSentinelExplainResponse:
        """Run the graph and return the final normalized response."""
        initial_state: MarketSentinelState = {
            **request.model_dump(mode="python"),
            "context_block": "",
            "que_paso": "",
            "posible_causa": "",
            "por_que_importa": "",
            "confidence_score": request.baseline_confidence_score,
            "is_noise": False,
        }

        result = await self.graph.ainvoke(initial_state)

        return MarketSentinelExplainResponse(
            que_paso=result["que_paso"],
            posible_causa=result["posible_causa"],
            por_que_importa=result["por_que_importa"],
            confidence_score=result["confidence_score"],
            is_noise=result["is_noise"],
        )

    def _build_graph(self):
        """Keep the graph linear until the product needs richer branching."""
        graph = StateGraph(MarketSentinelState)

        graph.add_node("context_builder", self._build_context_node)
        graph.add_node(
            "event_explainer",
            self._event_explainer_node,
            retry_policy=retry,
        )
        graph.add_node(
            "signal_validator",
            self._signal_validator_node,
            retry_policy=retry,
        )

        graph.add_edge(START, "context_builder")
        graph.add_edge("context_builder", "event_explainer")
        graph.add_edge("event_explainer", "signal_validator")
        graph.add_edge("signal_validator", END)

        return graph.compile()

    def _build_explainer_chain(self):
        """Create the structured-output LLM used for the explanation node."""
        return ChatOpenAI(
            model=settings.market_sentinel_model_name,
            api_key=settings.openai_api_key,
            temperature=0,
        ).with_structured_output(ExplanationDraft)

    def _build_validator_chain(self):
        """Create the structured-output LLM used for the validation node."""
        return ChatOpenAI(
            model=settings.market_sentinel_model_name,
            api_key=settings.openai_api_key,
            temperature=0,
        ).with_structured_output(ValidationDraft)

    def _build_context_node(self, state: MarketSentinelState) -> dict[str, str]:
        """Format raw event data once so the LLM nodes stay focused."""
        news_block = "\n".join(
            f"- {item['title']} | {item['source']} | {item['url']}"
            for item in state["news_items"]
        ) or "- No se encontro una noticia claramente relacionada."

        context_block = (
            f"Ticker: {state['ticker']}\n"
            f"Empresa: {state['company_name']}\n"
            f"Tipo de evento: {state['event_type']}\n"
            f"Precio actual: {state['price']}\n"
            f"Cambio de precio (%): {state['price_change_pct']}\n"
            f"Volumen actual: {state['volume']}\n"
            f"Volumen baseline: {state['volume_baseline']}\n"
            f"Ratio de volumen: {state['volume_ratio']}\n"
            f"Baseline confidence: {state['baseline_confidence_score']}\n"
            f"Noticias relacionadas:\n{news_block}"
        )

        return {"context_block": context_block}

    async def _event_explainer_node(
        self,
        state: MarketSentinelState,
    ) -> dict[str, str]:
        """Generate the three explanation fields consumed by the backend/UI."""
        try:
            response = await self.explainer_chain.ainvoke(
                f"""
Eres un analista de mercado.
Devuelve una explicacion corta y concreta en espanol.

{state["context_block"]}

Genera:
- que_paso
- posible_causa
- por_que_importa
"""
            )
            payload = ExplanationDraft.model_validate(response)
            return payload.model_dump()
        except Exception:
            return self._build_explanation_fallback(state)

    async def _signal_validator_node(
        self,
        state: MarketSentinelState,
    ) -> dict[str, float | bool]:
        """Use the LLM to decide how much confidence to keep and whether to suppress noise."""
        try:
            response = await self.validator_chain.ainvoke(
                f"""
Eres un validador de senales de mercado.
Decide si este evento merece alerta final o si es probablemente ruido.

{state["context_block"]}

Explicacion propuesta:
- que_paso: {state["que_paso"]}
- posible_causa: {state["posible_causa"]}
- por_que_importa: {state["por_que_importa"]}

Reglas:
- Usa como punto de partida confidence_score={state["baseline_confidence_score"]}.
- Sube la confianza si hay evidencia clara y consistente.
- Baja la confianza si falta contexto o la explicacion es debil.
- Marca is_noise=true si la evidencia no justifica una alerta final.
"""
            )
            payload = ValidationDraft.model_validate(response)
            return payload.model_dump()
        except Exception:
            return {
                "confidence_score": state["baseline_confidence_score"],
                "is_noise": False,
            }

    def _build_explanation_fallback(
        self,
        state: MarketSentinelState,
    ) -> dict[str, str]:
        """Keep the workflow usable when the explanation LLM fails."""
        direction = "subio" if state["price_change_pct"] >= 0 else "cayo"
        cause = (
            f"La noticia mas cercana fue: {state['news_items'][0]['title']}."
            if state["news_items"]
            else "No se encontro una noticia claramente relacionada en la ventana analizada."
        )

        return {
            "que_paso": (
                f"{state['ticker']} {direction} {abs(state['price_change_pct']):.2f}% "
                f"con un ratio de volumen de {state['volume_ratio']:.2f}x."
            ),
            "posible_causa": cause,
            "por_que_importa": (
                "El movimiento merece seguimiento porque combina precio, volumen y contexto "
                "informativo para separar ruido de una senal potencialmente relevante."
            ),
        }
