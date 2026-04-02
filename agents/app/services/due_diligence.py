import json
import operator
from collections.abc import AsyncGenerator
from typing import Annotated

from langgraph.graph import END, START, StateGraph
from langgraph.types import RetryPolicy
from typing_extensions import TypedDict

from app.agents.financial_analyst import financial_analyst_node
from app.agents.report_writer import report_writer_node
from app.agents.researcher import researcher_node
from app.agents.risk_validator import risk_validator_node


class DueDiligenceState(TypedDict):
    company_name: str
    research_data: Annotated[list[str], operator.add]
    financial_data: Annotated[list[str], operator.add]
    risk_data: Annotated[list[str], operator.add]
    report: str
    current_step: str


retry = RetryPolicy(max_attempts=3, initial_interval=1.0)


def build_due_diligence_graph():
    graph = StateGraph(DueDiligenceState)

    graph.add_node("researcher", researcher_node, retry=retry)
    graph.add_node("financial_analyst", financial_analyst_node, retry=retry)
    graph.add_node("risk_validator", risk_validator_node, retry=retry)
    graph.add_node("report_writer", report_writer_node)

    graph.add_edge(START, "researcher")
    graph.add_edge("researcher", "financial_analyst")
    graph.add_edge("financial_analyst", "risk_validator")
    graph.add_edge("risk_validator", "report_writer")
    graph.add_edge("report_writer", END)

    return graph.compile()


dd_graph = build_due_diligence_graph()


async def run_due_diligence_stream(company_name: str) -> AsyncGenerator[dict, None]:
    input_state = {
        "company_name": company_name,
        "research_data": [],
        "financial_data": [],
        "risk_data": [],
        "report": "",
        "current_step": "",
    }

    async for chunk in dd_graph.astream(input_state, stream_mode="custom"):
        yield {"event": "progress", "data": json.dumps(chunk)}

    yield {"event": "done", "data": ""}
