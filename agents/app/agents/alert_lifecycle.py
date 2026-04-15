"""Alert Lifecycle State Machine — LangGraph agent.

Evaluates a batch of open Market Sentinel alerts in parallel using the Send API
and recommends state transitions (new → investigating → confirmed → watching →
resolved).  Each alert is evaluated independently so the graph can fan-out to
as many parallel branches as needed.
"""

from __future__ import annotations

import asyncio
from typing import Annotated, Any, Literal

from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.types import RetryPolicy, Send
from pydantic import BaseModel, Field
from typing_extensions import TypedDict

from config import settings


# ---------------------------------------------------------------------------
# State shapes
# ---------------------------------------------------------------------------

class AlertInput(TypedDict):
    """Single alert context fed into the per-alert evaluation branch."""

    alert_id: int
    ticker: str
    company_name: str
    event_type: str
    current_status: str
    confidence_score: float
    has_news_support: bool
    que_paso: str
    posible_causa: str
    created_at: str


class LifecycleDecision(BaseModel):
    """Structured LLM output for a single alert evaluation."""

    recommended_status: Literal["new", "investigating", "confirmed", "watching", "resolved"]
    reasoning: str = Field(
        description="One or two sentences explaining the recommended transition."
    )
    confidence: float = Field(ge=0.0, le=1.0)


class AlertEvaluationResult(TypedDict):
    """Result produced by a single alert evaluation branch."""

    alert_id: int
    ticker: str
    company_name: str
    current_status: str
    recommended_status: str
    reasoning: str
    confidence: float


class LifecycleBatchState(TypedDict):
    """Top-level state for the batch evaluation graph."""

    alerts: list[AlertInput]
    results: Annotated[list[AlertEvaluationResult], lambda a, b: a + b]


# ---------------------------------------------------------------------------
# LLM chain
# ---------------------------------------------------------------------------

retry = RetryPolicy(max_attempts=3, initial_interval=1.0)

_llm = ChatOpenAI(
    model=settings.market_sentinel_model_name,
    api_key=settings.openai_api_key,
    temperature=0,
)
_lifecycle_chain = _llm.with_structured_output(LifecycleDecision)

# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

STATUS_TRANSITIONS = {
    "new": ["investigating", "confirmed", "resolved"],
    "investigating": ["confirmed", "watching", "resolved"],
    "confirmed": ["watching", "resolved"],
    "watching": ["resolved", "confirmed"],
    "resolved": [],
}

_STATUS_DOCS = """
Alert statuses:
- new: Alert just created, not yet reviewed.
- investigating: Someone is actively looking into this.
- confirmed: The event is validated as significant and real.
- watching: Confirmed but monitoring for further developments.
- resolved: The situation has normalized or been closed.

Transition rules:
- Only advance forward (new → investigating → confirmed → watching → resolved).
- Return to "confirmed" from "watching" if new escalating evidence emerges.
- Recommend "resolved" only when the event has clearly normalized.
- If uncertain, keep the current status (recommend no change).
"""


def _fallback_decision(alert: AlertInput) -> AlertEvaluationResult:
    """Return a safe no-change decision when the LLM call fails."""
    return AlertEvaluationResult(
        alert_id=alert["alert_id"],
        ticker=alert["ticker"],
        company_name=alert["company_name"],
        current_status=alert["current_status"],
        recommended_status=alert["current_status"],
        reasoning="Lifecycle evaluation failed; keeping current status to avoid false transitions.",
        confidence=0.3,
    )


async def evaluate_single_alert(alert: AlertInput) -> dict[str, list[AlertEvaluationResult]]:
    """Evaluate one alert and return its lifecycle decision."""
    allowed = STATUS_TRANSITIONS.get(alert["current_status"], [])
    if not allowed:
        # Already resolved — nothing to evaluate
        return {"results": []}

    prompt = f"""{_STATUS_DOCS}

You are evaluating a Market Sentinel alert to determine if it should transition to a new status.

Alert details:
- Ticker: {alert["ticker"]} ({alert["company_name"]})
- Event type: {alert["event_type"]}
- Current status: {alert["current_status"]}
- Confidence score: {alert["confidence_score"]:.2f}
- Has news support: {alert["has_news_support"]}
- Created at: {alert["created_at"]}
- What happened: {alert["que_paso"]}
- Possible cause: {alert["posible_causa"]}

Allowed next statuses (besides keeping current): {', '.join(allowed)}

Evaluate whether this alert should:
1. Stay at its current status (no action needed), OR
2. Transition to one of the allowed next statuses.

Consider:
- High confidence (>0.7) + news support → lean toward "confirmed" or "watching"
- Low confidence (<0.4) + no news → lean toward "resolved" (likely noise that slipped through)
- "new" alerts with strong evidence → "investigating" or "confirmed"
- Long-standing "confirmed"/"watching" alerts → "resolved" if time has passed without escalation

Return recommended_status = current_status if no transition is warranted."""

    try:
        response = await _lifecycle_chain.ainvoke(prompt)
        decision = LifecycleDecision.model_validate(response)
    except Exception:
        return {"results": [_fallback_decision(alert)]}  # noqa: RET504

    # Validate the LLM respected the allowed transitions
    if (
        decision.recommended_status != alert["current_status"]
        and decision.recommended_status not in allowed
    ):
        decision = LifecycleDecision(
            recommended_status=alert["current_status"],  # type: ignore[arg-type]
            reasoning="LLM suggested an invalid transition; keeping current status.",
            confidence=0.5,
        )

    return {
        "results": [
            AlertEvaluationResult(
                alert_id=alert["alert_id"],
                ticker=alert["ticker"],
                company_name=alert["company_name"],
                current_status=alert["current_status"],
                recommended_status=decision.recommended_status,
                reasoning=decision.reasoning,
                confidence=decision.confidence,
            )
        ]
    }


def fan_out_alerts(state: LifecycleBatchState) -> list[Send]:
    """Distribute each alert to its own parallel evaluation branch."""
    return [
        Send("evaluate_single_alert", alert)
        for alert in state["alerts"]
        if alert["current_status"] != "resolved"
    ]


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------

def build_alert_lifecycle_graph():
    graph = StateGraph(LifecycleBatchState)

    graph.add_node(
        "evaluate_single_alert",
        evaluate_single_alert,
        retry_policy=retry,
    )

    # Fan-out: START → one branch per alert via Send API
    graph.add_conditional_edges(START, fan_out_alerts, ["evaluate_single_alert"])

    # All branches converge at END (results reducer merges them)
    graph.add_edge("evaluate_single_alert", END)

    return graph.compile()


alert_lifecycle_graph = build_alert_lifecycle_graph()
