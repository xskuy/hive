from __future__ import annotations

from typing import Any, Literal

from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.types import RetryPolicy
from typing_extensions import TypedDict

from app.agents.alert_lifecycle import AlertInput, alert_lifecycle_graph
from app.agents.market_briefing import briefing_graph
from app.market_sentinel.schemas import (
    AlertLifecycleEvaluationRequest,
    AlertLifecycleEvaluationResponse,
    AlertStatusTransition,
    BriefingDraft,
    CritiqueDraft,
    CriticStatus,
    ExplanationDraft,
    MarketBriefingRequest,
    MarketBriefingResponse,
    MarketSentinelExplainRequest,
    MarketSentinelExplainResponse,
    ValidationDraft,
)
from config import settings


retry = RetryPolicy(max_attempts=3, initial_interval=1.0)
CriticRoute = Literal["event_explainer", "signal_validator"]


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
    critic_status: CriticStatus
    critic_feedback: str | None
    critic_revision_count: int
    critic_should_rewrite: bool
    used_explanation_fallback: bool


class MarketSentinelAgentService:
    """Explain and validate candidate market events through a bounded critique loop."""

    def __init__(
        self,
        *,
        explainer_chain: Any | None = None,
        critic_chain: Any | None = None,
        validator_chain: Any | None = None,
    ) -> None:
        self.explainer_chain = explainer_chain or self._build_explainer_chain()
        self.critic_chain = critic_chain or self._build_critic_chain()
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
            "critic_status": "skipped",
            "critic_feedback": None,
            "critic_revision_count": 0,
            "critic_should_rewrite": False,
            "used_explanation_fallback": False,
        }

        result = await self.graph.ainvoke(initial_state)

        return MarketSentinelExplainResponse(
            que_paso=result["que_paso"],
            posible_causa=result["posible_causa"],
            por_que_importa=result["por_que_importa"],
            confidence_score=result["confidence_score"],
            is_noise=result["is_noise"],
            critic_status=result["critic_status"],
            critic_feedback=result["critic_feedback"],
            critic_revision_count=result["critic_revision_count"],
        )

    def _build_graph(self):
        """Build the explanation flow with a bounded explainer/critic loop."""
        graph = StateGraph(MarketSentinelState)

        graph.add_node("context_builder", self._build_context_node)
        graph.add_node(
            "event_explainer",
            self._event_explainer_node,
            retry_policy=retry,
        )
        graph.add_node(
            "explanation_critic",
            self._explanation_critic_node,
            retry_policy=retry,
        )
        graph.add_node(
            "signal_validator",
            self._signal_validator_node,
            retry_policy=retry,
        )

        graph.add_edge(START, "context_builder")
        graph.add_edge("context_builder", "event_explainer")
        graph.add_edge("event_explainer", "explanation_critic")
        graph.add_conditional_edges(
            "explanation_critic",
            self._route_after_critic,
            {
                "event_explainer": "event_explainer",
                "signal_validator": "signal_validator",
            },
        )
        graph.add_edge("signal_validator", END)

        return graph.compile()

    def _build_explainer_chain(self):
        """Create the structured-output LLM used for the explanation node."""
        return ChatOpenAI(
            model=settings.market_sentinel_model_name,
            api_key=settings.openai_api_key,
            temperature=0,
        ).with_structured_output(ExplanationDraft)

    def _build_critic_chain(self):
        """Create the structured-output LLM used for the critic node."""
        return ChatOpenAI(
            model=settings.market_sentinel_model_name,
            api_key=settings.openai_api_key,
            temperature=0,
        ).with_structured_output(CritiqueDraft)

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
    ) -> dict[str, str | bool]:
        """Generate or rewrite the explanation used by downstream validation."""
        revision_directive = ""
        if state["critic_feedback"]:
            revision_directive = f"""
Ya existe un borrador previo.
Reescribe la explicacion corrigiendo exactamente este feedback del critic:
{state["critic_feedback"]}

No menciones la revision, al critic ni el proceso interno.
"""

        try:
            response = await self.explainer_chain.ainvoke(
                f"""
Eres un analista de mercado.
Devuelve una explicacion corta y concreta en espanol.

{state["context_block"]}
{revision_directive}

Genera:
- que_paso
- posible_causa
- por_que_importa
"""
            )
            payload = ExplanationDraft.model_validate(response)
            return {
                **payload.model_dump(),
                "used_explanation_fallback": False,
                "critic_should_rewrite": False,
            }
        except Exception:
            return {
                **self._build_explanation_fallback(state),
                "used_explanation_fallback": True,
                "critic_should_rewrite": False,
            }

    async def _explanation_critic_node(
        self,
        state: MarketSentinelState,
    ) -> dict[str, str | bool | int | None]:
        """Review the explanation and request at most two targeted rewrites."""
        if state["used_explanation_fallback"]:
            return {
                "critic_status": "skipped",
                "critic_should_rewrite": False,
            }

        try:
            response = await self.critic_chain.ainvoke(
                f"""
Eres un revisor critico de explicaciones de mercado.
Evalua si la explicacion propuesta es suficientemente clara, especifica y coherente con los datos.

{state["context_block"]}

Explicacion propuesta:
- que_paso: {state["que_paso"]}
- posible_causa: {state["posible_causa"]}
- por_que_importa: {state["por_que_importa"]}

Reglas:
- should_rewrite=true solo si hay un problema material que amerite reescritura.
- Usa feedback para describir la correccion concreta que debe hacer el explainer.
- Si la explicacion ya esta lista para validacion final, usa should_rewrite=false y feedback="".
"""
            )
            payload = CritiqueDraft.model_validate(response)
        except Exception:
            return {
                "critic_status": "skipped",
                "critic_should_rewrite": False,
            }

        feedback = payload.feedback.strip() or self._default_critic_feedback()
        revision_count = state["critic_revision_count"]

        if payload.should_rewrite:
            if revision_count < 2:
                return {
                    "critic_status": "revised",
                    "critic_feedback": feedback,
                    "critic_revision_count": revision_count + 1,
                    "critic_should_rewrite": True,
                }
            return {
                "critic_status": "max_revisions_reached",
                "critic_feedback": feedback,
                "critic_should_rewrite": False,
            }

        return {
            "critic_status": "revised" if revision_count > 0 else "passed",
            "critic_should_rewrite": False,
        }

    def _route_after_critic(self, state: MarketSentinelState) -> CriticRoute:
        """Loop back to the explainer only while the critic still requests rewrites."""
        if state["critic_should_rewrite"]:
            return "event_explainer"
        return "signal_validator"

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

    async def generate_briefing(
        self,
        request: MarketBriefingRequest,
    ) -> MarketBriefingResponse:
        """Run the briefing graph and return the post-scan intelligence summary."""
        initial_state = {
            "scan_run_id": request.scan_run_id,
            "current_alerts": [a.model_dump() for a in request.alerts],
            "ticker_histories": {},
            "sector_patterns": [],
            "briefing": "",
            "standout_ticker": None,
            "noise_warning": None,
        }

        result = await briefing_graph.ainvoke(initial_state)

        return MarketBriefingResponse(
            briefing=result["briefing"],
            sector_patterns=result["sector_patterns"],
            standout_ticker=result["standout_ticker"],
            noise_warning=result["noise_warning"],
        )

    async def evaluate_alert_lifecycle(
        self,
        request: AlertLifecycleEvaluationRequest,
    ) -> AlertLifecycleEvaluationResponse:
        """Fan-out alert evaluation using the LangGraph lifecycle graph."""
        alerts_input = [AlertInput(**item.model_dump()) for item in request.alerts]

        result = await alert_lifecycle_graph.ainvoke(
            {"alerts": alerts_input, "results": []}
        )

        transitions = [
            AlertStatusTransition(
                alert_id=r["alert_id"],
                ticker=r["ticker"],
                company_name=r["company_name"],
                current_status=r["current_status"],
                recommended_status=r["recommended_status"],
                reasoning=r["reasoning"],
                confidence=r["confidence"],
            )
            for r in result.get("results", [])
        ]
        return AlertLifecycleEvaluationResponse(transitions=transitions)

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

    def _default_critic_feedback(self) -> str:
        """Fallback feedback when the critic requests a rewrite but returns no guidance."""
        return (
            "Haz la explicacion mas especifica, coherente con los datos y clara para un analista."
        )
