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


async def researcher_node(state: dict) -> dict:
    writer = get_stream_writer()
    company = state["company_name"]
    writer({"step": "researcher", "status": "started"})

    queries = [
        f"{company} latest news 2025 2026",
        f"{company} founder CEO background",
        f"{company} company overview products services",
    ]

    results = await asyncio.gather(
        *[tavily.ainvoke({"query": q}) for q in queries]
    )

    combined = "\n\n".join(
        f"### Query: {q}\n{r}" for q, r in zip(queries, results)
    )

    response = await llm.ainvoke(
        f"""You are a company researcher. Based on the following search results about "{company}",
write a structured research brief covering:
1. Company overview (what they do, industry, size)
2. Recent news and developments
3. Founder/CEO background and social presence

Search results:
{combined}

Write a clear, factual summary. Cite sources where possible."""
    )

    writer({"step": "researcher", "status": "completed"})
    return {"research_data": [response.content], "current_step": "researcher"}
