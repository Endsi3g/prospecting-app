"""
Leads API — Manage prospecting leads tied to companies and contacts.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_supabase_admin

router = APIRouter()


class LeadCreate(BaseModel):
    company_id: str
    contact_id: Optional[str] = None
    campaign_id: Optional[str] = None
    status: str = "new"
    fit_score: Optional[float] = None
    contact_confidence: Optional[float] = None
    notes: Optional[str] = None


class LeadUpdate(BaseModel):
    status: Optional[str] = None
    fit_score: Optional[float] = None
    contact_confidence: Optional[float] = None
    personalization_score: Optional[float] = None
    outcome_score: Optional[float] = None
    notes: Optional[str] = None


@router.get("/")
async def list_leads(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """List leads with optional status filter."""
    db = get_supabase_admin()
    query = db.table("leads").select("*, companies(*), contacts(*)")

    if status:
        query = query.eq("status", status)

    result = query.range(offset, offset + limit - 1).order("created_at", desc=True).execute()
    return {"data": result.data, "count": len(result.data)}


@router.get("/{lead_id}")
async def get_lead(lead_id: str):
    """Get a single lead with company and contact details."""
    db = get_supabase_admin()
    result = (
        db.table("leads")
        .select("*, companies(*), contacts(*)")
        .eq("id", lead_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    return result.data


@router.post("/")
async def create_lead(lead: LeadCreate):
    """Create a new lead."""
    db = get_supabase_admin()
    result = db.table("leads").insert(lead.model_dump(exclude_none=True)).execute()
    return result.data


@router.patch("/{lead_id}")
async def update_lead(lead_id: str, lead: LeadUpdate):
    """Update lead status or scores."""
    db = get_supabase_admin()
    update_data = lead.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = (
        db.table("leads")
        .update(update_data)
        .eq("id", lead_id)
        .execute()
    )
    return result.data
