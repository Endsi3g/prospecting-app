"""
AI Gateway — Intelligent routing between local LLMs (Ollama) and Cloud Fallbacks (Groq).
Provides seamless failover to guarantee pipeline execution.
"""
import os
import time
import json
from typing import Any
from pydantic import BaseModel
from app.services.ollama import ollama_service

class AIGateway:
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.primary_model = "kimi" # or whatever the default Ollama model is configured to
        self.fallback_model = "llama3-8b-8192" # Fast Groq model matching OLLAMA capabilities

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        response_format: dict | None = None,
        temperature: float = 0.5,
    ) -> dict[str, Any]:
        """
        Attempts to generate via Ollama. If Ollama is offline or times out,
        falls back to Groq Cloud.
        """
        try:
            # 1. Primary Direct Attempt (Ollama)
            print("🧠 [AIGateway] Attempting generation via Local Ollama...")
            result = await ollama_service.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                response_format=response_format,
                temperature=temperature
            )
            return result
            
        except Exception as ollama_err:
            print(f"⚠️ [AIGateway] Ollama failed: {str(ollama_err)}. Falling back to Groq...")
            
            # 2. Fallback Attempt (Groq)
            if not self.groq_api_key:
                print("❌ [AIGateway] No GROQ_API_KEY found. Fallback impossible.")
                raise ollama_err
                
            return await self._generate_via_groq(
                prompt=prompt,
                system_prompt=system_prompt,
                response_format=response_format,
                temperature=temperature
            )

    async def _generate_via_groq(
        self,
        prompt: str,
        system_prompt: str = "",
        response_format: dict | None = None,
        temperature: float = 0.5,
    ) -> dict[str, Any]:
        # Using groq safely in async via run_in_executor or async Groq client
        from groq import AsyncGroq
        
        start = time.perf_counter_ns()
        client = AsyncGroq(api_key=self.groq_api_key)
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
            
        # Groq specific JSON mode handling
        # It requires the word "JSON" in the prompt if response_format is used
        extended_prompt = prompt
        if response_format:
            extended_prompt += "\n\nYou MUST return your answer in valid JSON format matching this schema: " + json.dumps(response_format)
            
        messages.append({"role": "user", "content": extended_prompt})
        
        kwargs = {
            "messages": messages,
            "model": self.fallback_model,
            "temperature": temperature,
        }
        
        if response_format:
            kwargs["response_format"] = {"type": "json_object"}
            
        try:
            chat_completion = await client.chat.completions.create(**kwargs)
            raw_response = chat_completion.choices[0].message.content
            
            elapsed_ms = (time.perf_counter_ns() - start) // 1_000_000
            
            # Parse JSON
            parsed = {}
            if response_format:
                try:
                    parsed = json.loads(raw_response)
                except json.JSONDecodeError:
                    parsed = {"raw_text": raw_response}
            else:
                parsed = {"raw_text": raw_response}
                
            return {
                "parsed": parsed,
                "model": f"groq-{self.fallback_model}",
                "latency_ms": elapsed_ms,
                "done": True,
            }
            
        except Exception as e:
            print(f"❌ [AIGateway] Groq Fallback completely failed: {str(e)}")
            raise e

# Singleton
ai_gateway = AIGateway()
