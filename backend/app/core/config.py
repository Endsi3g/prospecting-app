"""
Core configuration for the Uprising Prospecting App.
Loads from .env file and exposes typed settings.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────
    app_name: str = "Uprising Prospecting"
    app_version: str = "0.1.0"
    debug: bool = True

    # ── Supabase ─────────────────────────────────────────
    supabase_url: str = "http://127.0.0.1:54321"
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # ── Ollama (Local AI) ────────────────────────────────
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "kimi"

    # ── Resend (Email) ───────────────────────────────────
    resend_api_key: str = ""

    # ── Construction Niche Defaults ──────────────────────
    default_niche: str = "Construction"
    default_region: str = "Québec"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
