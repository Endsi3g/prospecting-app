from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.core.database import get_supabase_admin
from app.services.ollama import ollama_service

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class AnalyticsChatRequest(BaseModel):
    messages: List[ChatMessage]

@router.post("/chat")
async def analytics_chat(req: AnalyticsChatRequest):
    """
    Weekly Analytics AI Chat.
    Injects internal DB metrics into the prompt context to make the LLM aware of the user's CRM state.
    """
    db = get_supabase_admin()
    
    # Gathering Metrics silently
    try:
        leads_res = db.table("leads").select("id", count="exact").execute()
        leads_count = leads_res.count or 0
        
        comps_res = db.table("companies").select("id", count="exact").execute()
        comps_count = comps_res.count or 0
        
        camps_res = db.table("campaigns").select("id", count="exact").execute()
        camps_count = camps_res.count or 0
        
        ai_res = db.table("ai_generations").select("id", count="exact").execute()
        gens_count = ai_res.count or 0
        
        # Determine "drafts"
        drafts_res = db.table("leads").select("id", count="exact").eq("status", "draft_ready").execute()
        draft_count = drafts_res.count or 0
        
        contacted_res = db.table("leads").select("id", count="exact").eq("status", "contacted").execute()
        contacted_count = contacted_res.count or 0
    except Exception as e:
        print("Analytics DB pull failed:", e)
        leads_count = comps_count = camps_count = gens_count = draft_count = contacted_count = "Inconnus"

    system_context = f"""Tu es 'Groq Analyst', l'Intelligence Artificielle intégrée à l'Uprising Sales OS.
Ton rôle est d'analyser les performances de prospection de l'utilisateur et de lui donner des conseils stratégiques.

Voici les métriques actuelles en temps réel de sa base de données CRM :
- Leads Totaux : {leads_count}
- Entreprises Sourcées : {comps_count}
- Campagnes Créées : {camps_count}
- Tâches IA complétées en arrière-plan : {gens_count}
- Cold Emails dans la Boîte d'envoi (Attente de validation) : {draft_count}
- Prospects officiellement contactés : {contacted_count}

Instructions:
- Parle français de manière professionnelle mais énergique.
- Utilise les données fournies pour répondre à ses questions sur "la semaine", "les stats" ou "l'outreach".
- Formate tes réponses en Markdown (ajoute des bullet points, des emojis, et du gras).
- Sois bref et percutant.
"""

    # Formuler la demande
    prompt_history = "\n".join([f"{m.role}: {m.content}" for m in req.messages if m.role != "system"])
    final_prompt = f"{system_context}\n\nHistorique de conversation :\n{prompt_history}\n\nRéponse complète :"
    
    # Call to Ollama via typical method
    try:
        response = await ollama_service.generate(
           model="llama3", 
           prompt=final_prompt
        )
        return {"status": "success", "reply": response["result"]}
    except Exception as e:
        # Fallback pseudo-AI if api keys or local offline is broken
        return {
            "status": "partial", 
            "reply": f"🧠 *Mode Offline / Pas de clé API configurée.*\n\nCependant, voici vos stats brutes :\n- Contactés : **{contacted_count}**\n- Brouillons en attente : **{draft_count}**\n- Leads sourcés : **{leads_count}**.\n\nAssurez-vous que l'Agent Kimi ou Ollama est branché dans les paramètres pour une analyse prédictive complète !"
        }
