from fastapi import APIRouter
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.services.due_diligence import run_due_diligence_stream

router = APIRouter()


class DueDiligenceRequest(BaseModel):
    company_name: str


@router.post("/run")
async def run_due_diligence(request: DueDiligenceRequest):
    return EventSourceResponse(
        run_due_diligence_stream(request.company_name)
    )
