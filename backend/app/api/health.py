"""
Health check endpoints.
"""
from fastapi import APIRouter
from app.services.ollama import ollama_service
from app.core.config import get_settings

router = APIRouter()


@router.get("/health")
async def health():
    settings = get_settings()
    ollama_ok = await ollama_service.health_check()
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
        "niche": settings.default_niche,
        "region": settings.default_region,
        "services": {
            "ollama": {
                "status": "connected" if ollama_ok else "unreachable",
                "model": settings.ollama_model,
                "url": settings.ollama_base_url,
            },
            "supabase": {
                "url": settings.supabase_url,
            },
        },
    }
