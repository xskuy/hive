from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.market_sentinel.schemas import (
    AlertLifecycleEvaluationRequest,
    AlertLifecycleEvaluationResponse,
    MarketBriefingRequest,
    MarketBriefingResponse,
    MarketSentinelExplainRequest,
    MarketSentinelExplainResponse,
)
from app.market_sentinel.service import MarketSentinelAgentService
from config import settings


router = APIRouter()


def get_service() -> MarketSentinelAgentService:
    """Create a request-scoped Market Sentinel agent service."""
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is required for Market Sentinel agent flows.",
        )
    return MarketSentinelAgentService()


@router.post("/explain", response_model=MarketSentinelExplainResponse)
async def explain_market_event(
    request: MarketSentinelExplainRequest,
    service: MarketSentinelAgentService = Depends(get_service),
) -> MarketSentinelExplainResponse:
    """Explain and validate a candidate market event through LangGraph."""
    return await service.explain_candidate_event(request)


@router.post("/briefing", response_model=MarketBriefingResponse)
async def generate_briefing(
    request: MarketBriefingRequest,
    service: MarketSentinelAgentService = Depends(get_service),
) -> MarketBriefingResponse:
    """Generate a post-scan market briefing using historical memory."""
    return await service.generate_briefing(request)


@router.post("/lifecycle/evaluate", response_model=AlertLifecycleEvaluationResponse)
async def evaluate_alert_lifecycle(
    request: AlertLifecycleEvaluationRequest,
    service: MarketSentinelAgentService = Depends(get_service),
) -> AlertLifecycleEvaluationResponse:
    """Fan-out lifecycle evaluation for a batch of open alerts using LangGraph Send API."""
    return await service.evaluate_alert_lifecycle(request)
