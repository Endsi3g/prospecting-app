"""
Contacts API — CRUD and AI Automation trigger for contacts.
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
import os
import httpx
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_supabase_admin
import asyncio

def send_webhook_notification(message: str):
    webhook_url = os.getenv("WEBHOOK_URL")
    if not webhook_url:
        return
        
    try:
        # Very simple generic webhook dispatcher
        payload = {}
        if "discord.com" in webhook_url:
            payload = {"content": message}
        elif "api.telegram.org" in webhook_url:
            # Assuming format: https://api.telegram.org/bot<token>/sendMessage?chat_id=<id>
            # The user includes the full URL with query params
            payload = {"text": message}
        else:
            payload = {"text": message}
            
        httpx.post(webhook_url, json=payload, timeout=5.0)
    except Exception as e:
        print(f"⚠️ Failed to send webhook: {e}")

# Import agents directly
from app.api.agents import (
    CompanyResearchRequest, research_company,
    ProspectBriefRequest, generate_prospect_brief,
    EmailWriterRequest, write_email,
    EmailReviewRequest, review_and_send
)

router = APIRouter()

async def run_full_ai_pipeline(company_id: str, contact_id: str, contact_name: str, contact_role: str, contact_email: str):
    """Executes the AI workflow sequentially."""
    print(f"🚀 Starting AI Pipeline for Contact: {contact_id} at Company: {company_id}")
    
    try:
        # 0. Deep Company Research (Site Scrape)
        print("➡️ Running Company Research (Deep Scrape) Agent...")
        research_req = CompanyResearchRequest(company_id=company_id)
        # Using await for direct router calls containing async implementations
        await research_company(research_req)

        # 1. Prospect Brief
        print("➡️ Running Prospect Brief Agent...")
        brief_req = ProspectBriefRequest(company_id=company_id, contact_name=contact_name, contact_role=contact_role)
        await generate_prospect_brief(brief_req)
        
        # 2. Email Writer
        print("➡️ Running Email Writer Agent...")
        writer_req = EmailWriterRequest(company_id=company_id, contact_id=contact_id)
        email_result = await write_email(writer_req)
        
        subject = email_result["result"].get("subject", "Opportunité")
        body = email_result["result"].get("body", "")
        
        # 3. Save Draft to Outbox State
        print("➡️ Saving to Outbox (Draft Ready)...")
        db = get_supabase_admin()
        db.table("leads").update({"status": "draft_ready"}).eq("company_id", company_id).eq("contact_id", contact_id).execute()
        
        # 4. Notify via Webhook
        company = db.table("companies").select("name").eq("id", company_id).single().execute()
        company_name = company.data["name"] if company.data else "Inconnue"
        notification_msg = f"🎯 **Nouveau Draft !**\nLe *Deep Scraper* a terminé son analyse de **{company_name}**.\n✅ Un cold email hyper-personnalisé vous attend dans votre Boîte d'envoi !"
        send_webhook_notification(notification_msg)
        
        print("⏸️ Pipeline paused for Human-in-the-Loop review.")
        
    except Exception as e:
        print(f"❌ Pipeline failed: {str(e)}")


router = APIRouter()

class ContactCreate(BaseModel):
    company_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    linkedin_url: Optional[str] = None
    role: Optional[str] = None

@router.post("/")
async def create_contact(contact: ContactCreate, background_tasks: BackgroundTasks):
    """Create a new contact and trigger the full AI Pipeline."""
    db = get_supabase_admin()
    
    # 1. Start by verifying if company exists
    company_res = db.table("companies").select("*").eq("id", contact.company_id).single().execute()
    if not company_res.data:
        raise HTTPException(status_code=404, detail="Company not found")

    # 2. Insert Contact
    contact_data = contact.model_dump(exclude_none=True)
    contact_res = db.table("contacts").insert(contact_data).execute()
    
    if not contact_res.data:
        raise HTTPException(status_code=500, detail="Failed to create contact")
    
    new_contact = contact_res.data[0]
    
    # 3. Create a Lead (A lead is the combination of Company + Contact in Uprising's system)
    # The initial schema seems to map "Leads" directly to individuals or companies depending on table design.
    # Let's verify the schema of Leads. We assume it binds contact_id and company_id.
    lead_data = {
        "company_id": contact.company_id,
        "contact_id": new_contact["id"],
        "status": "new",
        "score_fit": 0,
        "score_confidence": 0,
        "score_personalization": 0,
        "score_outcome": 0
    }
    
    lead_res = db.table("leads").insert(lead_data).execute()
    new_lead = lead_res.data[0] if lead_res.data else None

    # 4. Trigger AI Pipeline
    background_tasks.add_task(
        run_full_ai_pipeline, 
        contact.company_id, 
        new_contact["id"], 
        new_contact["first_name"], 
        new_contact.get("role", "Inconnu"),
        new_contact.get("email", "")
    )
    
    return {
        "status": "success",
        "contact": new_contact,
        "lead": new_lead,
        "message": "Contact created. AI Pipeline triggered."
    }
