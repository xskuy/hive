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


async def legal_deep_dive_node(state: dict) -> dict:
    writer = get_stream_writer()
    company = state["company_name"]
    research = "\n".join(state["research_data"])
    financial = "\n".join(state["financial_data"])
    risk = "\n".join(state["risk_data"])
    writer({"step": "legal_deep_dive", "status": "started"})

    queries = [
        f"{company} SEC investigation regulatory enforcement",
        f"{company} lawsuit class action complaint settlement",
        f"{company} compliance violations penalties regulator",
    ]

    results = await asyncio.gather(*[tavily.ainvoke({"query": query}) for query in queries])

    combined = "\n\n".join(
        f"### Query: {query}\n{result}" for query, result in zip(queries, results)
    )

    response = await llm.ainvoke(
        f"""You are a legal and regulatory due diligence specialist reviewing "{company}".

Previous research:
{research}

Financial analysis:
{financial}

Current risk assessment:
{risk}

Additional legal and regulatory evidence:
{combined}

Write a concise legal deep dive covering:
1. Active or credible legal exposures
2. Regulatory agencies, jurisdictions, or enforcement signals involved
3. Potential financial or operational consequences
4. What remains uncertain and what would need verification

Use markdown and cite concrete dates, entities, and evidence when available."""
    )

    writer({"step": "legal_deep_dive", "status": "completed"})
    return {
        "deep_dive_data": [response.content],
        "current_step": "legal_deep_dive",
    }
