"""
Agents API — Trigger AI agents for prospecting intelligence.
Each endpoint runs a specific agent from the pipeline.
"""
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import resend
from dotenv import load_dotenv

from app.services.ollama import ollama_service
from app.core.database import get_supabase_admin
from app.services.scraper import scrape_company_website

load_dotenv()
resend.api_key = os.getenv("RESEND_API_KEY")

router = APIRouter()


# ── Agent: Company Research ─────────────────────────────────
class CompanyResearchRequest(BaseModel):
    company_id: str
    website: Optional[str] = None
    description: Optional[str] = None


@router.post("/research-company")
async def research_company(req: CompanyResearchRequest):
    """
    Agent 2 — Company Research Agent.
    Analyzes a construction company to extract business summary,
    services, positioning, and personalization opportunities.
    """
    db = get_supabase_admin()
    company = db.table("companies").select("*").eq("id", req.company_id).single().execute()

    if not company.data:
        raise HTTPException(status_code=404, detail="Company not found")

    company_data = company.data
    website = req.website or company_data.get("website", "")
    name = company_data.get("name", "Unknown")
    category = company_data.get("category", "Construction")

    system_prompt = """Tu es un analyste commercial spécialisé dans les PME de construction au Québec.
Tu dois analyser une entreprise de construction et produire un résumé structuré en JSON.
Sois factuel. Marque les hypothèses comme telles. Ne fabrique jamais de faits spécifiques non vérifiés."""

    # Trigger deep scraping to enrich the context
    scraped_context = ""
    if website:
         print(f"🕸️ Lancement du DeepScraping pour {name} ({website})...")
         scraped_context = await scrape_company_website(website)
         if scraped_context:
            print(f"📊 {len(scraped_context)} caractères extraits du site.")
         else:
            print("⚠️ Impossible d'extraire le texte du site. Utilisation du contexte de base.")

    prompt = f"""Analyse cette entreprise de construction.

--- INFORMATIONS DE BASE ---
Nom : {name}
Catégorie : {category}
Site web : {website}
Ville : {company_data.get('city', 'N/A')}

--- TEXTE EXTRAIT DU SITE WEB (DEEP SCRAPE) ---
{scraped_context if scraped_context else req.description or 'Aucune donnée site disponible.'}

--- TÂCHE ---
Produis un JSON avec les champs suivants :
- business_summary (string) : résumé de l'entreprise
- estimated_services (list[string]) : services probables offerts
- positioning (string) : positionnement estimé sur le marché
- marketing_maturity (string) : low / medium / high
- business_signals (list[string]) : signaux d'opportunité détectés
- personalization_hooks (list[string]) : accroches possibles pour un email
- uncertainty_zones (list[string]) : ce qui reste incertain
- confidence (float 0-1) : score de confiance global"""

    response_format = {
        "type": "object",
        "properties": {
            "business_summary": {"type": "string"},
            "estimated_services": {"type": "array", "items": {"type": "string"}},
            "positioning": {"type": "string"},
            "marketing_maturity": {"type": "string"},
            "business_signals": {"type": "array", "items": {"type": "string"}},
            "personalization_hooks": {"type": "array", "items": {"type": "string"}},
            "uncertainty_zones": {"type": "array", "items": {"type": "string"}},
            "confidence": {"type": "number"},
        },
    }

    result = await ollama_service.generate(
        prompt=prompt,
        system_prompt=system_prompt,
        response_format=response_format,
        temperature=0.4,
    )

    # Store the AI generation in the database
    generation_data = {
        "company_id": req.company_id,
        "agent_type": "company_research",
        "model": result.get("model", "kimi"),
        "prompt_version": "v1.0",
        "input_summary": f"Research for {name}",
        "output": result.get("parsed", {}),
        "latency_ms": result.get("latency_ms", 0),
        "confidence": result.get("parsed", {}).get("confidence", 0),
    }
    db.table("ai_generations").insert(generation_data).execute()

    return {
        "agent": "company_research",
        "company_id": req.company_id,
        "result": result.get("parsed", {}),
        "latency_ms": result.get("latency_ms", 0),
        "model": result.get("model", "kimi"),
    }


# ── Agent: Prospect Brief ──────────────────────────────────
class ProspectBriefRequest(BaseModel):
    company_id: str
    contact_name: Optional[str] = None
    contact_role: Optional[str] = None
    offer_description: str = "Services de site web, SEO et marketing digital pour entreprises de construction"


@router.post("/prospect-brief")
async def generate_prospect_brief(req: ProspectBriefRequest):
    """
    Agent 4 — Prospect Brief Agent.
    Creates an actionable brief for the email writing pipeline.
    """
    db = get_supabase_admin()
    company = db.table("companies").select("*").eq("id", req.company_id).single().execute()

    if not company.data:
        raise HTTPException(status_code=404, detail="Company not found")

    company_data = company.data
    name = company_data.get("name", "Unknown")

    # Try to fetch existing research
    research = (
        db.table("ai_generations")
        .select("output")
        .eq("company_id", req.company_id)
        .eq("agent_type", "company_research")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    research_context = research.data[0]["output"] if research.data else {}

    system_prompt = """Tu es un stratège commercial qui prépare des briefs de prospection pour une agence de marketing digital.
Ton client cible est une PME de construction au Québec.
Tu dois produire un brief structuré en JSON pour guider la rédaction d'un email de prospection."""

    prompt = f"""Prépare un brief de prospection pour cette entreprise de construction :

Nom : {name}
Catégorie : {company_data.get('category', 'Construction')}
Ville : {company_data.get('city', 'N/A')}
Contact : {req.contact_name or 'Non identifié'} ({req.contact_role or 'Rôle inconnu'})
Offre de l'agence : {req.offer_description}

Contexte de recherche disponible :
{research_context}

Produis un JSON avec :
- business_summary (string)
- probable_pain_points (list[string])
- personalization_hooks (list[string])
- recommended_angle (string)
- objections_probables (list[string])
- suggested_cta (string)
- confidence (float 0-1)"""

    response_format = {
        "type": "object",
        "properties": {
            "business_summary": {"type": "string"},
            "probable_pain_points": {"type": "array", "items": {"type": "string"}},
            "personalization_hooks": {"type": "array", "items": {"type": "string"}},
            "recommended_angle": {"type": "string"},
            "objections_probables": {"type": "array", "items": {"type": "string"}},
            "suggested_cta": {"type": "string"},
            "confidence": {"type": "number"},
        },
    }

    result = await ollama_service.generate(
        prompt=prompt,
        system_prompt=system_prompt,
        response_format=response_format,
        temperature=0.5,
    )

    # Store the AI generation
    generation_data = {
        "company_id": req.company_id,
        "agent_type": "prospect_brief",
        "model": result.get("model", "kimi"),
        "prompt_version": "v1.0",
        "input_summary": f"Brief for {name}",
        "output": result.get("parsed", {}),
        "latency_ms": result.get("latency_ms", 0),
        "confidence": result.get("parsed", {}).get("confidence", 0),
    }
    db.table("ai_generations").insert(generation_data).execute()

    return {
        "agent": "prospect_brief",
        "company_id": req.company_id,
        "result": result.get("parsed", {}),
        "latency_ms": result.get("latency_ms", 0),
        "model": result.get("model", "kimi"),
    }


# ── Agent: Contact Finder ──────────────────────────────────
class ContactFinderRequest(BaseModel):
    company_id: str

@router.post("/find-contact")
async def find_contact(req: ContactFinderRequest):
    """
    Agent 3 — Contact Finder Agent.
    Searches DuckDuckGo for LinkedIn profiles matching the company.
    """
    db = get_supabase_admin()
    company = db.table("companies").select("name").eq("id", req.company_id).single().execute()
    
    if not company.data:
         raise HTTPException(status_code=404, detail="Company not found")
         
    company_name = company.data["name"]
    query = f'site:ca.linkedin.com/in/ OR site:linkedin.com/in/ "Directeur" OR "Propriétaire" OR "Président" "{company_name}"'
    
    import httpx
    from bs4 import BeautifulSoup
    
    try:
         headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
         async with httpx.AsyncClient() as client:
              res = await client.get(f"https://html.duckduckgo.com/html/?q={query}", headers=headers, timeout=10.0)
         
         if res.status_code == 200:
              soup = BeautifulSoup(res.text, "html.parser")
              results = soup.find_all("a", class_="result__url", limit=3)
              titles = soup.find_all("a", class_="result__a", limit=3)
              
              if results and titles:
                   first_title = titles[0].text
                   # usually format: "Jean Dupont - Propriétaire - Construction ABC ..."
                   parts = first_title.split(" - ")
                   fullname = parts[0] if parts else "Contact"
                   role = parts[1] if len(parts) > 1 else "Décideur"
                   
                   names = fullname.split(" ")
                   first_name = names[0]
                   last_name = " ".join(names[1:]) if len(names) > 1 else ""
                   
                   # Guess email:
                   domain = company_name.lower().replace(" ", "").replace(".", "") + ".com"
                   email = f"{first_name.lower()}@{domain}"
                   
                   return {
                       "agent": "contact_finder",
                       "company_id": req.company_id,
                       "result": {
                           "first_name": first_name,
                           "last_name": last_name,
                           "email": email,
                           "role": role,
                           "confidence": 0.7
                       }
                   }
    except Exception as e:
         print(f"ContactFinder failed: {e}")
         
    # Fallback to smart dummy
    return {
        "agent": "contact_finder",
        "company_id": req.company_id,
        "result": {
            "first_name": "Décideur",
            "last_name": "Inconnu",
            "email": "contact@entreprise.com",
            "role": "Propriétaire",
            "confidence": 0.2
        }
    }


# ── Agent: Email Writer ────────────────────────────────────
class EmailWriterRequest(BaseModel):
    company_id: str
    contact_id: str

@router.post("/write-email")
async def write_email(req: EmailWriterRequest):
    """
    Agent 6 — Email Writer Agent.
    Generates personalized cold email copy using previous AI context.
    """
    db = get_supabase_admin()
    
    # Needs company info, research summary, and brief
    company = db.table("companies").select("*").eq("id", req.company_id).single().execute()
    contact = db.table("contacts").select("*").eq("id", req.contact_id).single().execute()

    if not company.data or not contact.data:
         raise HTTPException(status_code=404, detail="Data not found")
         
    research = db.table("ai_generations").select("output").eq("company_id", req.company_id).eq("agent_type", "prospect_brief").order("created_at", desc=True).limit(1).execute()
    brief = research.data[0]["output"] if research.data else {}

    system_prompt = "Tu es un copywriter d'élite en prospection B2B. Tu n'utilises pas de jargon compliqué, tes phrases sont courtes et impactantes."
    
    prompt = f"""Rédige un cold email B2B en français (informel mais professionnel) pour {contact.data.get('first_name', '')} {contact.data.get('last_name', '')}, {contact.data.get('role', '')} chez {company.data.get('name', '')}.
    
Contexte Brief :
{brief}

Directives :
1. Objet court (max 4 mots, en minuscules de préférence)
2. Une accroche hyper personnalisée au problème de l'entreprise
3. Un Call to Action clair (un appel de 10-15min)
4. Pas de formalités lourdes ('Cordialement', 'Bien à vous'). Juste une conclusion avec le prénom.

Retourne UNIQUEMENT un JSON :
- subject: L'objet de l'email
- body: Le corps complet de l'email
- confidence: Score de certitude sur la personnalisation (0-1)"""

    response_format = {
        "type": "object",
        "properties": {
            "subject": {"type": "string"},
            "body": {"type": "string"},
            "confidence": {"type": "number"},
        },
    }

    result = await ollama_service.generate(prompt=prompt, system_prompt=system_prompt, response_format=response_format)
    
    generation_data = {
        "company_id": req.company_id,
        "agent_type": "email_writer",
        "output": result.get("parsed", {}),
        "latency_ms": result.get("latency_ms", 0),
        "confidence": result.get("parsed", {}).get("confidence", 0),
    }
    db.table("ai_generations").insert(generation_data).execute()

    return {
        "agent": "email_writer",
        "result": result.get("parsed", {})
    }


# ── Agent: Email Reviewer ──────────────────────────────────
class EmailReviewRequest(BaseModel):
    company_id: str
    contact_id: str
    email_subject: str
    email_body: str
    target_email: str

@router.post("/review-and-send")
async def review_and_send(req: EmailReviewRequest):
    """
    Agent 7 — Email Reviewer Agent.
    Validates formatting and triggers live push to Resend API.
    """
    if "[Nom" in req.email_body or "[" in req.email_body:
       # Auto-fail
       return {"status": "failed", "reason": "Placeholder text found in generation"}
       
    # Simple formatting validation logic...
    if not resend.api_key:
       raise HTTPException(status_code=500, detail="Missing RESEND_API_KEY in .env")
       
    try:
         params = {
            "from": "Acquisition <onboarding@resend.dev>",
            "to": [req.target_email],
            "subject": req.email_subject,
            "text": req.email_body
         }
         resend_response = resend.Emails.send(params)
         
         # Log activity
         db = get_supabase_admin()
         db.table("activity_logs").insert({"action": "email_sent", "entity_id": req.contact_id, "details": {"resend_id": resend_response["id"]}}).execute()
         
         return {"status": "success", "resend_id": resend_response["id"]}
         
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))
