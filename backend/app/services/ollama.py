"""
Ollama Service — Local AI integration for structured JSON outputs.
Connects to the local Ollama instance running the Kimi model.
"""
import httpx
import json
import time
from typing import Any
from pydantic import BaseModel
from app.core.config import get_settings


class AgentOutput(BaseModel):
    """Standard output envelope for every agent call."""
    status: str
    confidence: float
    input_summary: str
    output: dict[str, Any]
    risk_flags: list[str]
    requires_human_review: bool
    model: str
    prompt_version: str
    latency_ms: int


class OllamaService:
    """Wrapper around the local Ollama HTTP API for structured generation."""

    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.ollama_base_url
        self.model = self.settings.ollama_model

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        response_format: dict | None = None,
        temperature: float = 0.7,
    ) -> dict[str, Any]:
        """
        Send a generation request to Ollama.
        Uses structured output (JSON mode) when response_format is provided.
        """
        start = time.perf_counter_ns()

        payload: dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
            },
        }

        if system_prompt:
            payload["system"] = system_prompt

        if response_format:
            payload["format"] = response_format

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json=payload,
            )
            response.raise_for_status()

        elapsed_ms = (time.perf_counter_ns() - start) // 1_000_000
        result = response.json()

        raw_response = result.get("response", "")

        # Attempt to parse as JSON
        try:
            parsed = json.loads(raw_response)
        except json.JSONDecodeError:
            parsed = {"raw_text": raw_response}

        return {
            "parsed": parsed,
            "model": result.get("model", self.model),
            "latency_ms": elapsed_ms,
            "done": result.get("done", False),
        }

    async def chat(
        self,
        messages: list[dict[str, str]],
        response_format: dict | None = None,
        temperature: float = 0.7,
    ) -> dict[str, Any]:
        """
        Send a chat-style request to Ollama (multi-turn).
        """
        start = time.perf_counter_ns()

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
            },
        }

        if response_format:
            payload["format"] = response_format

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json=payload,
            )
            response.raise_for_status()

        elapsed_ms = (time.perf_counter_ns() - start) // 1_000_000
        result = response.json()

        raw_content = result.get("message", {}).get("content", "")

        try:
            parsed = json.loads(raw_content)
        except json.JSONDecodeError:
            parsed = {"raw_text": raw_content}

        return {
            "parsed": parsed,
            "model": result.get("model", self.model),
            "latency_ms": elapsed_ms,
            "done": result.get("done", False),
        }

    async def health_check(self) -> bool:
        """Verify Ollama is reachable and the model is available."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                tags = response.json()
                available_models = [
                    m.get("name", "") for m in tags.get("models", [])
                ]
                return any(self.model in name for name in available_models)
        except Exception:
            return False


# Singleton
ollama_service = OllamaService()
