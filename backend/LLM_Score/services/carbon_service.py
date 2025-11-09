from __future__ import annotations

import re
from enum import Enum
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from LLM_Score.clients.llm_client import LLMClient, LLMCarbonEstimate
from LLM_Score.clients.search_client import SearchClient, SearchResult


class RetrievalStrategy(str, Enum):
    llm = "llm"
    search = "search"
    llm_search = "llm_search"
    auto = "auto"


CARBON_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*(g|kg)\s*(?:co2e|co2eq|co2)", re.IGNORECASE)


class CarbonService:
    def __init__(self, llm_client: Optional[LLMClient], search_client: Optional[SearchClient]) -> None:
        self.llm_client = llm_client
        self.search_client = search_client

    async def get_carbon_estimate(
        self,
        item_name: str,
        context: Optional[str],
        requested_strategy: RetrievalStrategy,
    ) -> Dict[str, Any]:
        strategy = self._resolve_strategy(requested_strategy, context)

        if strategy == RetrievalStrategy.search:
            return await self._search_only(item_name)
        if strategy == RetrievalStrategy.llm:
            return await self._llm_only(item_name, context)
        if strategy == RetrievalStrategy.llm_search:
            return await self._llm_with_search(item_name, context)

        raise HTTPException(status_code=503, detail="Unable to resolve a retrieval strategy")

    async def get_batch_estimates(
        self,
        items: List[Dict[str, Optional[str]]],
        requested_strategy: RetrievalStrategy,
        fallback_context: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        for item in items:
            name = item.get("name")
            if not name:
                raise HTTPException(status_code=422, detail="Each item must include a non-empty 'name'.")

            context = item.get("context") or fallback_context
            payload = await self.get_carbon_estimate(
                item_name=name,
                context=context,
                requested_strategy=requested_strategy,
            )
            results.append(payload)

        return results

    def _resolve_strategy(self, requested: RetrievalStrategy, context: Optional[str]) -> RetrievalStrategy:
        if requested != RetrievalStrategy.auto:
            return requested

        if self.search_client and self.search_client.is_configured and self.llm_client and self.llm_client.is_configured:
            return RetrievalStrategy.llm_search

        if self.llm_client and self.llm_client.is_configured:
            return RetrievalStrategy.llm

        if self.search_client and self.search_client.is_configured:
            return RetrievalStrategy.search

        raise HTTPException(status_code=503, detail="Neither LLM nor search providers are configured.")

    async def _search_only(self, item_name: str) -> Dict[str, Any]:
        if not self.search_client or not self.search_client.is_configured:
            raise HTTPException(status_code=503, detail="Search provider is not configured.")

        query = f"{item_name} product carbon footprint kg CO2e"
        results = await self.search_client.search(query=query, max_results=6)

        estimate = _extract_from_snippets(results)

        return {
            "item_name": item_name,
            "strategy": RetrievalStrategy.search.value,
            "emissions_kg_co2e": estimate.get("emissions_kg_co2e"),
            "confidence": estimate.get("confidence"),
            "methodology": estimate.get("methodology"),
            "references": estimate.get("references"),
            "evidence": [result.__dict__ for result in results],
        }

    async def _llm_only(self, item_name: str, context: Optional[str]) -> Dict[str, Any]:
        if not self.llm_client or not self.llm_client.is_configured:
            raise HTTPException(status_code=503, detail="LLM provider is not configured.")

        llm_response = await self.llm_client.estimate_carbon(item_name=item_name, context=context)
        return _format_llm_response(llm_response, RetrievalStrategy.llm.value)

    async def _llm_with_search(self, item_name: str, context: Optional[str]) -> Dict[str, Any]:
        if not self.search_client or not self.search_client.is_configured:
            raise HTTPException(status_code=503, detail="Search provider is not configured.")
        if not self.llm_client or not self.llm_client.is_configured:
            raise HTTPException(status_code=503, detail="LLM provider is not configured.")

        query = f"{item_name} product carbon emissions kg CO2e"
        results = await self.search_client.search(query=query, max_results=6)
        snippets = [f"{r.title}: {r.snippet} ({r.url})" for r in results]

        llm_response = await self.llm_client.estimate_carbon(
            item_name=item_name,
            context=context,
            search_snippets=snippets,
        )

        payload = _format_llm_response(llm_response, RetrievalStrategy.llm_search.value)
        payload["evidence"] = [result.__dict__ for result in results]
        return payload


def _extract_from_snippets(results: List[SearchResult]) -> Dict[str, Any]:
    for result in results:
        match = CARBON_PATTERN.search(result.snippet)
        if match:
            value = float(match.group(1))
            unit = match.group(2).lower()
            if unit == "g":
                value /= 1000

            return {
                "emissions_kg_co2e": value,
                "confidence": 0.4,
                "methodology": f"Parsed numeric value from public source '{result.title}'.",
                "references": [result.url],
            }

    return {
        "emissions_kg_co2e": None,
        "confidence": None,
        "methodology": "No numeric value detected in the snippets.",
        "references": [r.url for r in results[:3]],
    }


def _format_llm_response(llm_response: LLMCarbonEstimate, strategy: str) -> Dict[str, Any]:
    return {
        "item_name": llm_response.item_name,
        "strategy": strategy,
        "emissions_kg_co2e": llm_response.emissions_kg_co2e,
        "confidence": llm_response.confidence,
        "methodology": llm_response.methodology,
        "references": llm_response.references,
        "raw_response": llm_response.raw_response,
    }
