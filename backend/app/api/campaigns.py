"""
Campaigns API — CRUD for outreach campaigns.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_supabase_admin

router = APIRouter()

class CampaignCreate(BaseModel):
    name: str
    status: Optional[str] = "draft"
    metrics_sent: Optional[int] = 0
    metrics_opened: Optional[int] = 0
    metrics_replied: Optional[int] = 0

@router.get("/")
async def list_campaigns():
    db = get_supabase_admin()
    res = db.table("campaigns").select("*").execute()
    return {"data": res.data}

@router.post("/")
async def create_campaign(campaign: CampaignCreate):
    db = get_supabase_admin()
    res = db.table("campaigns").insert(campaign.model_dump(exclude_none=True)).execute()
    return res.data
