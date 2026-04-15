import json
import operator
from collections.abc import AsyncGenerator, Awaitable, Callable
from typing import Annotated, Any, Literal

from langgraph.graph import END, START, StateGraph
from langgraph.types import RetryPolicy
from typing_extensions import TypedDict

from app.agents.enhanced_analysis import enhanced_analysis_node
from app.agents.financial_analyst import financial_analyst_node
from app.agents.legal_deep_dive import legal_deep_dive_node
from app.agents.report_writer import report_writer_node
from app.agents.researcher import researcher_node
from app.agents.risk_validator import risk_validator_node


RouteName = Literal["legal_deep_dive", "enhanced_analysis", "report_writer"]
NodeCallable = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]


class DueDiligenceState(TypedDict):
    company_name: str
    research_data: Annotated[list[str], operator.add]
    financial_data: Annotated[list[str], operator.add]
    risk_data: Annotated[list[str], operator.add]
    deep_dive_data: Annotated[list[str], operator.add]
    report: str
    current_step: str
    overall_risk_level: str
    risk_confidence: float
    needs_legal_deep_dive: bool
    needs_enhanced_analysis: bool
    routing_reason: str
    selected_route: RouteName


retry = RetryPolicy(max_attempts=3, initial_interval=1.0)


def route_after_risk(state: DueDiligenceState) -> RouteName:
    selected_route = state.get("selected_route")
    if selected_route in {"legal_deep_dive", "enhanced_analysis", "report_writer"}:
        return selected_route
    return "report_writer"


def build_due_diligence_graph(
    *,
    researcher: NodeCallable = researcher_node,
    financial_analyst: NodeCallable = financial_analyst_node,
    risk_validator: NodeCallable = risk_validator_node,
    enhanced_analysis: NodeCallable = enhanced_analysis_node,
    legal_deep_dive: NodeCallable = legal_deep_dive_node,
    report_writer: NodeCallable = report_writer_node,
):
    graph = StateGraph(DueDiligenceState)

    graph.add_node("researcher", researcher, retry_policy=retry)
    graph.add_node("financial_analyst", financial_analyst, retry_policy=retry)
    graph.add_node("risk_validator", risk_validator, retry_policy=retry)
    graph.add_node("enhanced_analysis", enhanced_analysis, retry_policy=retry)
    graph.add_node("legal_deep_dive", legal_deep_dive, retry_policy=retry)
    graph.add_node("report_writer", report_writer)

    graph.add_edge(START, "researcher")
    graph.add_edge("researcher", "financial_analyst")
    graph.add_edge("financial_analyst", "risk_validator")
    graph.add_conditional_edges(
        "risk_validator",
        route_after_risk,
        {
            "legal_deep_dive": "legal_deep_dive",
            "enhanced_analysis": "enhanced_analysis",
            "report_writer": "report_writer",
        },
    )
    graph.add_edge("enhanced_analysis", "report_writer")
    graph.add_edge("legal_deep_dive", "report_writer")
    graph.add_edge("report_writer", END)

    return graph.compile()


dd_graph = build_due_diligence_graph()


async def run_due_diligence_stream(company_name: str) -> AsyncGenerator[dict, None]:
    input_state = {
        "company_name": company_name,
        "research_data": [],
        "financial_data": [],
        "risk_data": [],
        "deep_dive_data": [],
        "report": "",
        "current_step": "",
        "overall_risk_level": "",
        "risk_confidence": 0.0,
        "needs_legal_deep_dive": False,
        "needs_enhanced_analysis": False,
        "routing_reason": "",
        "selected_route": "report_writer",
    }

    async for chunk in dd_graph.astream(input_state, stream_mode="custom"):
        yield {"event": "progress", "data": json.dumps(chunk)}

    yield {"event": "done", "data": ""}
