import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.services.scraper import scrape_company_website
from app.services.ollama import ollama_service

router = APIRouter()

SKILLS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".agents", "skills")

class OrchestratorRequest(BaseModel):
    skill_id: str
    target_url: Optional[str] = None
    query: str

@router.post("/chat")
async def run_orchestrator(req: OrchestratorRequest):
    """
    The Core Marketing Brain.
    Takes a Skill ID, loads its Markdown instructions, crawls the Target URL (if provided),
    and executes the logic via the LLM to return a professional Marketing Audit/Copy.
    """
    
    # 1. Load the Skill Markdown
    skill_path = os.path.join(SKILLS_DIR, req.skill_id, "SKILL.md")
    if not os.path.exists(skill_path):
        raise HTTPException(status_code=404, detail=f"Skill '{req.skill_id}' not found.")
        
    with open(skill_path, "r", encoding="utf-8") as f:
        skill_content = f.read()
        
    # 2. Extract context via Deep Crawl4AI (If URL provided)
    crawled_context = ""
    if req.target_url and req.target_url.startswith("http"):
        print(f"🕷️ Crawl4AI Orchestrator running on: {req.target_url}")
        crawled_context = await scrape_company_website(req.target_url)
        
    # 3. Formulate the Ultimate Request
    system_prompt = f"""Tu es une Intelligence Marketing de niveau Expert.
Tu dois AGIR EXACTEMENT selon ces instructions officielles de compétence (Marketing Skill) :

--- INSTRUCTIONS DU SKILL ({req.skill_id.upper()}) ---
{skill_content}
--- FIN DES INSTRUCTIONS ---

Ne fais aucun commentaire sur les instructions elles-mêmes.
Réponds en Markdown structuré et professionnel. Parle en français.
"""

    user_prompt = ""
    if crawled_context:
        user_prompt += f"--- DONNÉES EXTRAITES DU SITE (CRAWL4AI DEEP SEARCH) ---\n{crawled_context}\n\n"
        
    user_prompt += f"Tâche de l'utilisateur : {req.query}"

    # 4. Generate via LLM
    try:
        final_prompt = f"{system_prompt}\n\n{user_prompt}\n\nRéponse :"
        response = await ollama_service.generate(model="llama3", prompt=final_prompt)
        return {"status": "success", "reply": response["result"]}
    except Exception as e:
        return {"status": "error", "reply": f"⚠️ Erreur LLM lors de l'exécution de l'Orchestrateur: {str(e)}"}
