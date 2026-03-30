"""
Uprising Prospecting App — FastAPI Entry Point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import get_settings
from app.services.ollama import ollama_service
from app.api.health import router as health_router
from app.api.companies import router as companies_router
from app.api.leads import router as leads_router
from app.api.agents import router as agents_router
from app.api.contacts import router as contacts_router
from app.api.campaigns import router as campaigns_router
from app.api.outbox import router as outbox_router
from app.api.settings import router as settings_router
from app.api.analytics import router as analytics_router
from app.api.skills import router as skills_router
from app.api.orchestrator import router as orchestrator_router
from app.api.webhooks import router as webhooks_router



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    settings = get_settings()
    print(f"🔧 {settings.app_name} v{settings.app_version} starting...")
    print(f"🧠 Ollama → {settings.ollama_base_url} (model: {settings.ollama_model})")
    print(f"🏗️ Niche: {settings.default_niche} | Region: {settings.default_region}")

    # Check Ollama health on boot
    ollama_ok = await ollama_service.health_check()
    if ollama_ok:
        print("✅ Ollama is reachable and model is available.")
    else:
        print("⚠️  Ollama is not reachable or model not found. AI features will fail.")

    yield

    print("Shutting down...")


app = FastAPI(
    title="Uprising Prospecting API",
    description="Sales operating system for construction PME prospecting.",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ───────────────────────────────────────────────
app.include_router(health_router, prefix="/api", tags=["Health"])
app.include_router(companies_router, prefix="/api/companies", tags=["Companies"])
app.include_router(leads_router, prefix="/api/leads", tags=["Leads"])
app.include_router(agents_router, prefix="/api/agents", tags=["Agents"])
app.include_router(contacts_router, prefix="/api/contacts", tags=["Contacts"])
app.include_router(campaigns_router, prefix="/api/campaigns", tags=["Campaigns"])
app.include_router(outbox_router, prefix="/api/outbox", tags=["Outbox"])
app.include_router(settings_router, prefix="/api/settings", tags=["Settings"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(skills_router, prefix="/api/skills", tags=["Marketing Skills"])
app.include_router(orchestrator_router, prefix="/api/orchestrator", tags=["Master Orchestrator"])
app.include_router(webhooks_router, prefix="/api/webhooks", tags=["Webhooks"])

