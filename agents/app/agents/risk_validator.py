import asyncio

from langchain_openai import ChatOpenAI
from langchain_tavily import TavilySearch
from langgraph.config import get_stream_writer

from config import settings


llm = ChatOpenAI(model="gpt-4.1-nano", api_key=settings.openai_api_key)

tavily = TavilySearch(
    max_results=5,
    search_depth="advanced",
    tavily_api_key=settings.tavily_api_key,
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

    results = await asyncio.gather(
        *[tavily.ainvoke({"query": q}) for q in queries]
    )

    combined = "\n\n".join(
        f"### Query: {q}\n{r}" for q, r in zip(queries, results)
    )

    response = await llm.ainvoke(
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
End with an overall risk score: LOW / MEDIUM / HIGH / CRITICAL."""
    )

    writer({"step": "risk_validator", "status": "completed"})
    return {"risk_data": [response.content], "current_step": "risk_validator"}
