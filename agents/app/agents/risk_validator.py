import asyncio
from typing import Literal

from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_tavily import TavilySearch
from langgraph.config import get_stream_writer

from config import settings


RouteName = Literal["legal_deep_dive", "enhanced_analysis", "report_writer"]


class RiskRoutingDecision(BaseModel):
    risk_summary: str = Field(
        description="Markdown summary of the key legal, reputational, financial, and operational risks."
    )
    overall_risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    confidence: float = Field(ge=0.0, le=1.0)
    needs_legal_deep_dive: bool
    needs_enhanced_analysis: bool
    routing_reason: str = Field(
        description="One or two sentences explaining why the workflow should take the selected route."
    )


llm = ChatOpenAI(model="gpt-4.1-nano", api_key=settings.openai_api_key)
risk_chain = llm.with_structured_output(RiskRoutingDecision)

tavily = TavilySearch(
    max_results=5,
    search_depth="advanced",
    tavily_api_key=settings.tavily_api_key,
)


def resolve_risk_route(
    *,
    overall_risk_level: str,
    needs_legal_deep_dive: bool,
    needs_enhanced_analysis: bool,
) -> RouteName:
    # Legal deep dive only when BOTH the flag is set AND the risk is genuinely severe.
    # This prevents routine business litigation from always triggering the heavy branch.
    if needs_legal_deep_dive and overall_risk_level in ("HIGH", "CRITICAL"):
        return "legal_deep_dive"
    if needs_enhanced_analysis or overall_risk_level in ("HIGH", "CRITICAL"):
        return "enhanced_analysis"
    return "report_writer"


def _fallback_decision(company: str) -> RiskRoutingDecision:
    return RiskRoutingDecision(
        risk_summary=(
            f"## Risk Summary\n"
            f"- Legal risks: No conclusive legal or regulatory escalation was verified for {company}.\n"
            f"- Reputational risks: The available evidence was limited and did not justify a specialized branch.\n"
            f"- Financial risks: Some risk always remains, but the fallback path keeps the workflow moving.\n"
            f"- Operational risks: More evidence would be needed before escalating the analysis.\n"
            f"\nOverall risk score: MEDIUM"
        ),
        overall_risk_level="MEDIUM",
        confidence=0.35,
        needs_legal_deep_dive=False,
        needs_enhanced_analysis=False,
        routing_reason="Structured risk validation failed, so the workflow fell back to the standard reporting path.",
    )


async def risk_validator_node(state: dict) -> dict:
    writer = get_stream_writer()
    company = state["company_name"]
    research = "\n".join(state["research_data"])
    financial = "\n".join(state["financial_data"])
    writer({"step": "risk_validator", "status": "started"})

    queries = [
        f"{company} lawsuit legal issues court",
        f"{company} controversy scandal fraud allegations",
        f"{company} regulatory issues compliance violations",
    ]

    results = await asyncio.gather(*[tavily.ainvoke({"query": q}) for q in queries])

    combined = "\n\n".join(f"### Query: {q}\n{r}" for q, r in zip(queries, results))

    try:
        response = await risk_chain.ainvoke(
            f"""You are a risk analyst performing due diligence on "{company}".

Previous research:
{research}

Financial analysis:
{financial}

Risk-focused search results:
{combined}

Provide a structured risk assessment:
1. Legal risks (lawsuits, regulatory actions)
2. Reputational risks (controversies, negative press)
3. Financial risks (debt, cash flow concerns)
4. Operational risks (key person dependency, market risks)

For each risk found:
- Severity: HIGH / MEDIUM / LOW
- Confidence: how certain you are this is accurate
- Source: where you found this information

If no significant risks are found in a category, state that clearly.

Return a structured decision with:
- risk_summary
- overall_risk_level
- confidence
- needs_legal_deep_dive
- needs_enhanced_analysis
- routing_reason

Rules:
- CRITICAL only when the evidence points to material legal, regulatory, fraud, or existential business risk.
- HIGH when the company has serious unresolved issues that warrant deeper follow-up.
- MEDIUM when there are concerns but the evidence is incomplete or mixed.
- LOW when the risks look ordinary and manageable.
- Set at most one deep-dive flag to true.
- needs_legal_deep_dive = True ONLY when legal issues are central and material to the business:
  active government enforcement, criminal charges, class-action suits with billion-dollar exposure,
  or regulatory orders that threaten the core business model. Routine commercial disputes,
  minor antitrust inquiries, or standard IP litigation do NOT qualify.
- needs_enhanced_analysis = True when the main concern is business model, financial health,
  market position, or reputational risk without a dominant legal dimension.
- When in doubt between flags, prefer needs_enhanced_analysis over needs_legal_deep_dive."""
        )
        payload = RiskRoutingDecision.model_validate(response)
    except Exception:
        payload = _fallback_decision(company)

    selected_route = resolve_risk_route(
        overall_risk_level=payload.overall_risk_level,
        needs_legal_deep_dive=payload.needs_legal_deep_dive,
        needs_enhanced_analysis=payload.needs_enhanced_analysis,
    )

    writer(
        {
            "step": "risk_validator",
            "status": "completed",
            "route": selected_route,
            "riskLevel": payload.overall_risk_level,
            "routingReason": payload.routing_reason,
        }
    )
    return {
        "risk_data": [payload.risk_summary],
        "overall_risk_level": payload.overall_risk_level,
        "risk_confidence": payload.confidence,
        "needs_legal_deep_dive": payload.needs_legal_deep_dive,
        "needs_enhanced_analysis": payload.needs_enhanced_analysis,
        "routing_reason": payload.routing_reason,
        "selected_route": selected_route,
        "current_step": "risk_validator",
    }
