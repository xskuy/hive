import asyncio

from langchain_openai import ChatOpenAI
from langchain_tavily import TavilySearch
from langgraph.config import get_stream_writer

from config import settings


llm = ChatOpenAI(model="gpt-4.1-nano", api_key=settings.openai_api_key)

tavily = TavilySearch(
    max_results=5,
    search_depth="advanced",
    topic="finance",
    tavily_api_key=settings.tavily_api_key,
)


async def enhanced_analysis_node(state: dict) -> dict:
    writer = get_stream_writer()
    company = state["company_name"]
    research = "\n".join(state["research_data"])
    financial = "\n".join(state["financial_data"])
    risk = "\n".join(state["risk_data"])
    writer({"step": "enhanced_analysis", "status": "started"})

    queries = [
        f"{company} customer concentration churn market competition",
        f"{company} cash burn debt liquidity runway profitability",
        f"{company} layoffs product delays execution issues",
    ]

    results = await asyncio.gather(*[tavily.ainvoke({"query": query}) for query in queries])

    combined = "\n\n".join(
        f"### Query: {query}\n{result}" for query, result in zip(queries, results)
    )

    response = await llm.ainvoke(
        f"""You are a senior due diligence analyst performing a focused follow-up on "{company}".

Previous research:
{research}

Financial analysis:
{financial}

Current risk assessment:
{risk}

Additional search results:
{combined}

Write a concise but high-signal follow-up covering:
1. The main drivers behind the elevated risk
2. Which risks are still unresolved
3. What evidence would reduce uncertainty
4. Whether the final recommendation should become more conservative

Use markdown and stay specific with dates, numbers, and evidence when available."""
    )

    writer({"step": "enhanced_analysis", "status": "completed"})
    return {
        "deep_dive_data": [response.content],
        "current_step": "enhanced_analysis",
    }
