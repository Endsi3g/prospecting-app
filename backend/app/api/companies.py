"""
Companies API — CRUD for prospected construction companies.
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_supabase_admin
from app.services.scraper import run_gmaps_scraper

router = APIRouter()


class CompanyCreate(BaseModel):
    name: str
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = "Québec"
    category: Optional[str] = "Construction"
    sub_category: Optional[str] = None
    source: Optional[str] = None
    google_maps_url: Optional[str] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    category: Optional[str] = None
    sub_category: Optional[str] = None
    source: Optional[str] = None
    google_maps_url: Optional[str] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None


@router.get("/")
async def list_companies(
    category: Optional[str] = None,
    city: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """List companies with optional filters."""
    db = get_supabase_admin()
    query = db.table("companies").select("*")

    if category:
        query = query.eq("category", category)
    if city:
        query = query.eq("city", city)

    result = query.range(offset, offset + limit - 1).execute()
    return {"data": result.data, "count": len(result.data)}


@router.get("/{company_id}")
async def get_company(company_id: str):
    """Get a single company by ID."""
    db = get_supabase_admin()
    result = db.table("companies").select("*").eq("id", company_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Company not found")
    return result.data


@router.post("/")
async def create_company(company: CompanyCreate):
    """Create a new company."""
    db = get_supabase_admin()
    result = db.table("companies").insert(company.model_dump(exclude_none=True)).execute()
    return result.data


@router.patch("/{company_id}")
async def update_company(company_id: str, company: CompanyUpdate):
    """Update a company."""
    db = get_supabase_admin()
    update_data = company.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = (
        db.table("companies")
        .update(update_data)
        .eq("id", company_id)
        .execute()
    )
    return result.data


@router.delete("/{company_id}")
async def delete_company(company_id: str):
    """Delete a company."""
    db = get_supabase_admin()
    db.table("companies").delete().eq("id", company_id).execute()
    return {"status": "deleted", "id": company_id}


class ImportRequest(BaseModel):
    query: str
    max_results: Optional[int] = 5

@router.post("/import/gmaps")
async def import_gmaps(req: ImportRequest):
    """Trigger the automated Google Maps scraper."""
    results = await run_gmaps_scraper(req.query, req.max_results)
    
    db = get_supabase_admin()
    imported_count = 0
    
    for c in results:
        company_data = {
            "name": c.get("name"),
            "city": c.get("city"),
            "rating": c.get("rating"),
            "review_count": c.get("review_count"),
            "source": c.get("source", "google_maps"),
            "category": "Construction"
        }
        res = db.table("companies").insert(company_data).execute()
        if res.data:
            imported_count += 1
            
    return {
        "status": "success",
        "message": f"Scraped and imported {imported_count} companies from Google Maps.",
        "data": results
    }

