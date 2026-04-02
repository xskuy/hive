from collections.abc import AsyncGenerator

from langchain_anthropic import ChatAnthropic
from langgraph.graph import END, StateGraph
from typing_extensions import TypedDict

from config import settings


class AgentState(TypedDict):
    messages: list
    result: str


llm = ChatAnthropic(
    model=settings.model_name,
    api_key=settings.anthropic_api_key,
)


def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    async def process(state: AgentState) -> AgentState:
        response = await llm.ainvoke(state["messages"])
        return {"messages": state["messages"] + [response], "result": response.content}

    graph.add_node("process", process)
    graph.set_entry_point("process")
    graph.add_edge("process", END)

    return graph.compile()


agent_graph = build_graph()


async def run_agent_stream(message: str, session_id: str | None) -> AsyncGenerator[str, None]:
    input_state = {"messages": [("human", message)], "result": ""}

    async for event in agent_graph.astream_events(input_state, version="v2"):
        kind = event["event"]
        if kind == "on_chat_model_stream":
            content = event["data"]["chunk"].content
            if content:
                yield {"event": "token", "data": content}

    yield {"event": "done", "data": ""}
