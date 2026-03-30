from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_supabase_admin

from app.api.agents import EmailReviewRequest, review_and_send

router = APIRouter()

@router.get("/")
async def get_outbox():
    """Retrieve all drafted emails waiting for review."""
    db = get_supabase_admin()
    
    # In a full normalized DB we'd query an `emails` table. 
    # Here we'll identify drafts through `ai_generations` of type `email_writer` 
    # joined visually with companies/contacts if needed, 
    # or by querying Leads with status = 'draft_ready'.
    
    # For now, let's fetch leads that might have drafts.
    leads_res = db.table("leads").select("*, companies(*), contacts(*)").eq("status", "draft_ready").execute()
    
    outbox = []
    
    # We pull the latest generated email for each of these leads
    for lead in leads_res.data:
         company_id = lead["company_id"]
         contact_id = lead["contact_id"]
         
         email_gen = db.table("ai_generations") \
             .select("output") \
             .eq("company_id", company_id) \
             .eq("agent_type", "email_writer") \
             .order("created_at", desc=True) \
             .limit(1) \
             .execute()
         
         if email_gen.data:
              draft = email_gen.data[0]["output"]
              outbox.append({
                  "lead_id": lead["id"],
                  "company": lead["companies"],
                  "contact": lead["contacts"],
                  "subject": draft.get("subject", "Sans objet"),
                  "body": draft.get("body", "")
              })
              
    return {"status": "success", "data": outbox}


class OutboxApproveRequest(BaseModel):
    lead_id: str
    target_email: str
    subject: str
    body: str

@router.post("/approve")
async def approve_and_send(req: OutboxApproveRequest):
    """Approves a draft, sends it via Resend, and marks lead as 'contacted'."""
    db = get_supabase_admin()
    
    # Fetch lead
    lead_res = db.table("leads").select("*").eq("id", req.lead_id).single().execute()
    if not lead_res.data:
         raise HTTPException(status_code=404, detail="Lead not found")
         
    lead = lead_res.data
    
    # Call the Reviewer / Send Agent
    review_req = EmailReviewRequest(
        company_id=lead["company_id"],
        contact_id=lead["contact_id"],
        email_subject=req.subject,
        email_body=req.body,
        target_email=req.target_email
    )
    
    result = await review_and_send(review_req)
    
    if result["status"] == "success":
         db.table("leads").update({"status": "contacted"}).eq("id", req.lead_id).execute()
         return {"status": "success", "message": "Email sent"}
    else:
         raise HTTPException(status_code=500, detail=result.get("reason", "Unknown failure"))
