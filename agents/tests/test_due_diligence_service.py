from __future__ import annotations

import pytest

from app.services.due_diligence import build_due_diligence_graph, route_after_risk


def initial_state() -> dict:
    return {
        "company_name": "Acme",
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


@pytest.mark.asyncio
async def test_due_diligence_routes_critical_cases_to_legal_deep_dive() -> None:
    visited: list[str] = []

    async def researcher(_: dict) -> dict:
        visited.append("researcher")
        return {"research_data": ["research"], "current_step": "researcher"}

    async def financial_analyst(_: dict) -> dict:
        visited.append("financial_analyst")
        return {"financial_data": ["financial"], "current_step": "financial_analyst"}

    async def risk_validator(_: dict) -> dict:
        visited.append("risk_validator")
        return {
            "risk_data": ["critical risk"],
            "overall_risk_level": "CRITICAL",
            "risk_confidence": 0.92,
            "needs_legal_deep_dive": True,
            "needs_enhanced_analysis": False,
            "routing_reason": "Material legal exposure requires specialist review.",
            "selected_route": "legal_deep_dive",
            "current_step": "risk_validator",
        }

    async def enhanced_analysis(_: dict) -> dict:
        visited.append("enhanced_analysis")
        return {"deep_dive_data": ["enhanced"], "current_step": "enhanced_analysis"}

    async def legal_deep_dive(_: dict) -> dict:
        visited.append("legal_deep_dive")
        return {"deep_dive_data": ["legal"], "current_step": "legal_deep_dive"}

    async def report_writer(state: dict) -> dict:
        visited.append("report_writer")
        return {"report": "\n".join(state["deep_dive_data"]), "current_step": "report_writer"}

    graph = build_due_diligence_graph(
        researcher=researcher,
        financial_analyst=financial_analyst,
        risk_validator=risk_validator,
        enhanced_analysis=enhanced_analysis,
        legal_deep_dive=legal_deep_dive,
        report_writer=report_writer,
    )

    result = await graph.ainvoke(initial_state())

    assert visited == [
        "researcher",
        "financial_analyst",
        "risk_validator",
        "legal_deep_dive",
        "report_writer",
    ]
    assert result["selected_route"] == "legal_deep_dive"
    assert result["report"] == "legal"


@pytest.mark.asyncio
async def test_due_diligence_routes_high_risk_to_enhanced_analysis() -> None:
    visited: list[str] = []

    async def researcher(_: dict) -> dict:
        visited.append("researcher")
        return {"research_data": ["research"], "current_step": "researcher"}

    async def financial_analyst(_: dict) -> dict:
        visited.append("financial_analyst")
        return {"financial_data": ["financial"], "current_step": "financial_analyst"}

    async def risk_validator(_: dict) -> dict:
        visited.append("risk_validator")
        return {
            "risk_data": ["high risk"],
            "overall_risk_level": "HIGH",
            "risk_confidence": 0.77,
            "needs_legal_deep_dive": False,
            "needs_enhanced_analysis": True,
            "routing_reason": "High business risk warrants a deeper review.",
            "selected_route": "enhanced_analysis",
            "current_step": "risk_validator",
        }

    async def enhanced_analysis(_: dict) -> dict:
        visited.append("enhanced_analysis")
        return {"deep_dive_data": ["enhanced"], "current_step": "enhanced_analysis"}

    async def legal_deep_dive(_: dict) -> dict:
        visited.append("legal_deep_dive")
        return {"deep_dive_data": ["legal"], "current_step": "legal_deep_dive"}

    async def report_writer(state: dict) -> dict:
        visited.append("report_writer")
        return {"report": "\n".join(state["deep_dive_data"]), "current_step": "report_writer"}

    graph = build_due_diligence_graph(
        researcher=researcher,
        financial_analyst=financial_analyst,
        risk_validator=risk_validator,
        enhanced_analysis=enhanced_analysis,
        legal_deep_dive=legal_deep_dive,
        report_writer=report_writer,
    )

    result = await graph.ainvoke(initial_state())

    assert visited == [
        "researcher",
        "financial_analyst",
        "risk_validator",
        "enhanced_analysis",
        "report_writer",
    ]
    assert result["selected_route"] == "enhanced_analysis"
    assert result["report"] == "enhanced"


def test_route_after_risk_defaults_to_report_writer() -> None:
    assert route_after_risk({"selected_route": "report_writer"}) == "report_writer"
    assert route_after_risk({"selected_route": "unexpected"}) == "report_writer"
