from __future__ import annotations

import asyncio
from typing import Any, Dict, List

from backend.LLM_Score.clients.llm_client import LLMClient
from backend.LLM_Score.services.carbon_service import CarbonService


def score_receipt(receipt_json: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Return per-item carbon estimates for a receipt-style JSON payload."""
    items = receipt_json.get("items_parsed")
    if not items:
        raise ValueError("Receipt JSON must include an 'items_parsed' list.")

    fallback_context = receipt_json.get("cleaned_text")
    llm_client = LLMClient()
    service = CarbonService(llm_client=llm_client)

    async def _run_batch() -> List[Dict[str, Any]]:
        return await service.estimate_batch(items, fallback_context=fallback_context)

    return asyncio.run(_run_batch())


__all__ = ["score_receipt"]
