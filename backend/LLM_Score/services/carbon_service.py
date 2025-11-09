from __future__ import annotations

from typing import Any, Dict, List, Optional

from backend.LLM_Score.clients.llm_client import LLMClient


class CarbonService:
    """Minimal service that always uses the LLM client for estimates."""

    def __init__(self, llm_client: LLMClient) -> None:
        if not llm_client or not llm_client.is_configured:
            raise RuntimeError("LLM client is not configured. Set OPENAI_API_KEY before calling the service.")
        self.llm_client = llm_client

    async def estimate_item(self, item_name: str, context: Optional[str] = None) -> Dict[str, Any]:
        llm_response = await self.llm_client.estimate_carbon(item_name=item_name, context=context)
        return {
            "item_name": llm_response.item_name,
            "emissions_kg_co2e": llm_response.emissions_kg_co2e,
        }

    async def estimate_batch(
        self,
        items: List[Dict[str, Any]],
        fallback_context: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        for idx, item in enumerate(items, start=1):
            name = item.get("name")
            if not name:
                raise ValueError(f"Item #{idx} is missing a 'name' field.")

            context = item.get("context") or fallback_context
            results.append(await self.estimate_item(name, context))
        return results
