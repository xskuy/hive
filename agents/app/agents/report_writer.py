from langchain_openai import ChatOpenAI
from langgraph.config import get_stream_writer

from config import settings


llm = ChatOpenAI(
    model="moonshot-v1-auto",
    base_url="https://api.moonshot.ai/v1",
    api_key=settings.moonshot_api_key,
)


async def report_writer_node(state: dict) -> dict:
    writer = get_stream_writer()
    company = state["company_name"]
    research = "\n".join(state["research_data"])
    financial = "\n".join(state["financial_data"])
    risk = "\n".join(state["risk_data"])
    deep_dive = "\n\n".join(state.get("deep_dive_data", []))
    selected_route = state.get("selected_route", "report_writer")
    overall_risk_level = state.get("overall_risk_level", "UNKNOWN")
    routing_reason = state.get("routing_reason", "")
    writer({"step": "report_writer", "status": "started"})

    response = await llm.ainvoke(
        f"""You are a professional report writer creating a due diligence report for "{company}".

Using the following data from our research team, compile a comprehensive due diligence report.

RESEARCH DATA:
{research}

FINANCIAL ANALYSIS:
{financial}

RISK ASSESSMENT:
{risk}

ROUTING DECISION:
- route: {selected_route}
- overall_risk_level: {overall_risk_level}
- routing_reason: {routing_reason}

SPECIALIZED FOLLOW-UP:
{deep_dive or "No specialized deep dive was required."}

Write the report in markdown with these sections:

# Due Diligence Report: {company}

## Executive Summary
(2-3 paragraph overview with key findings and recommendation)

## Company Overview
(What they do, industry, founding, leadership)

## Financial Analysis
(Funding, revenue, growth, financial health)

## Risk Assessment
(Legal, reputational, financial, operational risks with severity)

## Specialized Follow-Up
(Only if a legal or enhanced analysis branch was executed. Summarize the extra findings briefly.)

## Key Findings
(Bulleted list of most important discoveries)

## Recommendation
(Clear recommendation: PROCEED / PROCEED WITH CAUTION / DO NOT PROCEED, with justification)

Be professional, factual, and cite specific data points. Flag any areas where data was insufficient."""
    )

    writer({"step": "report_writer", "status": "completed", "report": response.content})
    return {"report": response.content, "current_step": "report_writer"}
