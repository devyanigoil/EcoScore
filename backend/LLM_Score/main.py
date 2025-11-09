from __future__ import annotations

from fastapi import FastAPI

from .ScoreCal import create_score_router
from .clients import LLMClient, SearchClient
from .services import CarbonService


def build_app() -> FastAPI:
    app = FastAPI(
        title="Carbon Score API",
        version="0.1.0",
        description="Lookup service that estimates carbon emissions per product.",
    )

    llm_client = LLMClient()
    search_client = SearchClient()
    carbon_service = CarbonService(llm_client=llm_client, search_client=search_client)

    router = create_score_router(carbon_service)
    app.include_router(router)

    return app


app = build_app()
