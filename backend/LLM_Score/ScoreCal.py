from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from .auth import verify_firebase_token
from .services import CarbonService, RetrievalStrategy


class CarbonRequest(BaseModel):
    item_name: str = Field(..., min_length=2, description="Product name to lookup.")
    context: Optional[str] = Field(None, description="Optional hints (manufacturer, location, etc.).")
    strategy: RetrievalStrategy = Field(
        RetrievalStrategy.llm,
        description="How the service should gather data (llm, search, llm_search, auto).",
    )


class ReceiptItem(BaseModel):
    name: str = Field(..., min_length=2, description="Name parsed from a receipt line item.")
    qty: Optional[float] = Field(None, description="Quantity parsed from receipt data.")
    unit_price: Optional[float] = Field(None, description="Unit price parsed from receipt data.")
    total: Optional[float] = Field(None, description="Total line price parsed from receipt data.")
    currency: Optional[str] = Field(None, description="Currency code parsed from receipt data.")
    context: Optional[str] = Field(None, description="Optional context specific to this item.")


class CarbonBatchRequest(BaseModel):
    items_parsed: List[ReceiptItem] = Field(
        ...,
        min_length=1,
        description="Parsed items to score for carbon emissions.",
    )
    strategy: RetrievalStrategy = Field(
        RetrievalStrategy.llm,
        description="Retrieval strategy applied to every item in the batch.",
    )
    context: Optional[str] = Field(
        None,
        description="Optional context shared by every item.",
    )
    cleaned_text: Optional[str] = Field(
        None,
        description="Optional raw receipt text; used as fallback context for each item.",
    )


class CarbonEstimateResponse(BaseModel):
    item_name: str
    emissions_kg_co2e: Optional[float] = None


def _maybe_bool(env_value: Optional[str]) -> bool:
    return str(env_value).lower() in {"1", "true", "yes"}


async def authenticate_user(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    if _maybe_bool(os.getenv("SKIP_AUTH")):
        return {"uid": "local-dev"}

    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Authorization header must be 'Bearer <token>'")

    decoded = verify_firebase_token(token)
    return decoded


def create_score_router(carbon_service: CarbonService) -> APIRouter:
    router = APIRouter()

    @router.get("/healthz")
    async def healthcheck() -> Dict[str, str]:
        return {"status": "ok"}

    @router.post("/carbonscore", response_model=CarbonEstimateResponse)
    async def carbon_emissions(
        request: CarbonRequest,
        _user: Dict[str, Any] = Depends(authenticate_user),
    ) -> CarbonEstimateResponse:
        payload = await carbon_service.get_carbon_estimate(
            item_name=request.item_name,
            context=request.context,
            requested_strategy=request.strategy,
        )
        return CarbonEstimateResponse(**payload)

    @router.post("/carbonscore/batch", response_model=List[CarbonEstimateResponse])
    async def carbon_emissions_batch(
        request: CarbonBatchRequest,
        _user: Dict[str, Any] = Depends(authenticate_user),
    ) -> List[CarbonEstimateResponse]:
        fallback_context = request.context or request.cleaned_text
        batch_items = [{"name": item.name, "context": item.context} for item in request.items_parsed]

        payloads = await carbon_service.get_batch_estimates(
            items=batch_items,
            requested_strategy=request.strategy,
            fallback_context=fallback_context,
        )
        return [CarbonEstimateResponse(**payload) for payload in payloads]
        

    return router


__all__ = [
    "create_score_router",
    "CarbonRequest",
    "CarbonBatchRequest",
    "CarbonEstimateResponse",
]
