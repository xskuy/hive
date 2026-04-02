from fastapi import APIRouter
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.services.orchestrator import run_agent_stream

router = APIRouter()


class AgentRequest(BaseModel):
    message: str
    session_id: str | None = None


@router.post("/run")
async def run_agent(request: AgentRequest):
    return EventSourceResponse(
        run_agent_stream(request.message, request.session_id)
    )
