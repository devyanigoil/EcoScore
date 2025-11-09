from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List, Optional

import httpx


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str


class SearchClient:
    """Thin wrapper around the Tavily search API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_url: Optional[str] = None,
        timeout_seconds: float = 15.0,
    ) -> None:
        self.api_key = api_key or os.getenv("TAVILY_API_KEY")
        self.api_url = api_url or os.getenv("TAVILY_API_URL", "https://api.tavily.com/search")
        self.timeout_seconds = timeout_seconds

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def search(self, query: str, max_results: int = 5) -> List[SearchResult]:
        if not self.api_key:
            raise RuntimeError("TAVILY_API_KEY is not configured")

        payload = {
            "api_key": self.api_key,
            "query": query,
            "search_depth": "advanced",
            "max_results": max_results,
        }

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(self.api_url, json=payload)
            response.raise_for_status()
            data = response.json()

        results = []
        for result in data.get("results", []):
            results.append(
                SearchResult(
                    title=result.get("title", "Untitled"),
                    url=result.get("url", ""),
                    snippet=result.get("content", ""),
                )
            )

        return results
