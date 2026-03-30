import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.scraper import scrape_company_website
from app.services.ai_gateway import ai_gateway

router = APIRouter()

class OrchestratorRequest(BaseModel):
    query: str
    target_url: Optional[str] = None
    context: Optional[str] = None

class TeamOrchestrator:
    """
    A multi-agent team orchestrator demonstrating independent AI personas
    working sequentially to resolve complex prospecting tasks.
    Powered natively by Ollama with Groq API failover.
    """
    def __init__(self, goal: str, context: str):
        self.goal = goal
        self.context = context
        self.memory = []

    async def execute(self) -> Dict[str, Any]:
        # Agent 1: The Researcher (Parses the URL and the initial context)
        researcher_report = await self.run_agent(
            role="Lead Researcher",
            system="Tu es un chercheur expert en Market Intelligence B2B. Extrais les faits, les signaux d'intention et la proposition de valeur brute à partir du contexte fourni.",
            task=f"Analyse ce contexte et fournis un rapport de recherche très concis (bullet points) :\n{self.context}"
        )
        self.memory.append({"agent": "Researcher", "output": researcher_report})
        
        # Agent 2: The Strategist (Formulates the psychological angle)
        strategist_brief = await self.run_agent(
            role="Sales Strategist",
            system="Tu es un stratège commercial expert en psychologie d'achat (Anchoring, Loss Aversion, Status Quo Bias).",
            task=f"Goal: {self.goal}\nResearch: {researcher_report}\nDefine a conversion strategy. Focus on the cost of inaction (Loss Aversion) or the inefficiency of the current status quo."
        )
        self.memory.append({"agent": "Strategist", "output": strategist_brief})
        
        # Agent 3: The Copywriter (Structured Output)
        schema = {
            "type": "object",
            "properties": {
                "subject": {"type": "string"},
                "body": {"type": "string"},
                "critique": {"type": "string"}
            },
            "required": ["subject", "body"]
        }
        
        writer_response = await self.run_agent(
            role="Elite Copywriter",
            system="Tu es un copywriter B2B d'élite. Tu écris des emails courts, directs, sans jargon ('J'espère que vous allez bien' est interdit). Retourne uniquement du JSON.",
            task=f"Strategy: {strategist_brief}\nResearch: {researcher_report}\nGoal: {self.goal}\nDraft a hyper-personalized email in French.",
            response_format=schema
        )
        
        self.memory.append({"agent": "Copywriter", "output": writer_response})
        return writer_response


    async def run_agent(self, role: str, system: str, task: str, response_format: Optional[Dict] = None) -> Any:
        print(f"🤖 [Orchestrator] Activating Agent: {role}")
        
        result = await ai_gateway.generate(
            prompt=task,
            system_prompt=system,
            response_format=response_format,
            temperature=0.6,
        )

        # Standard check for structured vs raw text
        if response_format:
            return result.get("parsed", {})
        
        content = result.get("parsed", {}).get("raw_text", "")

        if not content:
            # Fallback if parsed as dict accidentally
            content = str(result.get("parsed", ""))
            
        print(f"✅ [{role}] Completed task.")
        return content

@router.post("/chat")
async def run_orchestrator(req: OrchestratorRequest):
    """
    The Master Entrypoint for the Team of Agents.
    Triggers a multi-step execution loop relying on local Ollama + Groq failover.
    """
    crawled_context = req.context or ""
    
    if req.target_url and req.target_url.startswith("http"):
        print(f"🕷️ Appending Deep Crawl context from: {req.target_url}")
        crawled_context += "\\n\\n--- SITE CRAWLE ---\\n"
        crawled_context += await scrape_company_website(req.target_url)
        
    orchestrator = TeamOrchestrator(goal=req.query, context=crawled_context)
    
    try:
        execution_result = await orchestrator.execute()
        
        return {
            "status": "success", 
            "reply": execution_result.get("body", execution_result) if isinstance(execution_result, dict) else execution_result,
            "subject": execution_result.get("subject", "") if isinstance(execution_result, dict) else "",
            "memory": orchestrator.memory
        }

    except Exception as e:
        return {"status": "error", "reply": f"⚠️ Multi-Agent Framework Failure: {str(e)}"}
