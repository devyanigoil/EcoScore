from __future__ import annotations

import asyncio
import json
import os
from dataclasses import dataclass
from typing import Any, Iterable, List, Optional

from openai import OpenAI


@dataclass
class LLMCarbonEstimate:
    item_name: str
    emissions_kg_co2e: Optional[float]
    confidence: Optional[float]
    methodology: Optional[str]
    references: List[str]
    raw_response: Any


class LLMClient:
    """Simple wrapper around the OpenAI Chat Completions endpoint."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout_seconds: float = 45.0,
    ) -> None:
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.base_url = (base_url or os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")).rstrip("/")
        self.timeout_seconds = timeout_seconds
        self._client = None
        if self.api_key:
            client_kwargs: dict[str, Any] = {"api_key": self.api_key}
            if self.base_url:
                client_kwargs["base_url"] = self.base_url
            self._client = OpenAI(**client_kwargs)

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def estimate_carbon(
        self,
        item_name: str,
        context: Optional[str] = None,
        search_snippets: Optional[Iterable[str]] = None,
    ) -> LLMCarbonEstimate:
        if not self.api_key or not self._client:
            raise RuntimeError("OPENAI_API_KEY is not configured")

        snippets_block = ""
        if search_snippets:
            formatted = "\n".join(f"- {snippet}" for snippet in search_snippets)
            snippets_block = f"\nSupporting evidence:\n{formatted}"

        user_prompt = (
            f"Estimate the carbon emissions for the product '{item_name}'. "
            f"Prefer quantitative answers in kilograms of CO2e. "
            f"Return a JSON object with keys item_name, emissions_kg_co2e, confidence (0-1), "
            f"methodology, and references (list of URLs)."
        )

        if context:
            user_prompt += f"\nAdditional context:\n{context}"

        if snippets_block:
            user_prompt += snippets_block

        payload = {
            "model": self.model,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a sustainability analyst producing factual carbon footprint estimates. "
                        "Cite trustworthy public sources whenever possible."
                    ),
                },
                {"role": "user", "content": user_prompt},
            ],
            "timeout": self.timeout_seconds,
        }

        response = await asyncio.to_thread(
            self._client.chat.completions.create,
            **payload,
        )

        raw_text = _extract_content(response.choices[0].message.content)

        try:
            parsed = json.loads(raw_text)
        except json.JSONDecodeError:
            parsed = {
                "item_name": item_name,
                "emissions_kg_co2e": None,
                "confidence": None,
                "methodology": None,
                "references": [],
            }

        return LLMCarbonEstimate(
            item_name=parsed.get("item_name", item_name),
            emissions_kg_co2e=_to_float(parsed.get("emissions_kg_co2e")),
            confidence=_to_float(parsed.get("confidence")),
            methodology=parsed.get("methodology"),
            references=parsed.get("references") or [],
            raw_response=parsed,
        )


def _to_float(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _extract_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            else:
                text = getattr(part, "text", None)
                if text:
                    parts.append(text)
                elif isinstance(part, dict):
                    text_val = part.get("text")
                    if text_val:
                        parts.append(text_val)
        return "\n".join(parts)
    return str(content)
