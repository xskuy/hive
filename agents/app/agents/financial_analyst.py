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


async def financial_analyst_node(state: dict) -> dict:
    writer = get_stream_writer()
    company = state["company_name"]
    research = "\n".join(state["research_data"])
    writer({"step": "financial_analyst", "status": "started"})

    queries = [
        f"{company} funding rounds investment valuation",
        f"{company} revenue financial performance",
        f"{company} financial statements SEC filings",
    ]

    results = await asyncio.gather(
        *[tavily.ainvoke({"query": q}) for q in queries]
    )

    combined = "\n\n".join(
        f"### Query: {q}\n{r}" for q, r in zip(queries, results)
    )

    response = await llm.ainvoke(
        f"""You are a financial analyst. Analyze the financial profile of "{company}".

Previous research:
{research}

Financial search results:
{combined}

Provide a structured financial analysis covering:
1. Funding history and valuation
2. Revenue and growth metrics
3. Financial health indicators
4. Key financial risks or concerns

Be specific with numbers and dates when available. Flag any data gaps."""
    )

    writer({"step": "financial_analyst", "status": "completed"})
    return {"financial_data": [response.content], "current_step": "financial_analyst"}
