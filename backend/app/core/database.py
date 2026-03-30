"""
Supabase client factory.
Provides both anon-level and service-role clients.
"""
from supabase import create_client, Client
from app.core.config import get_settings


def get_supabase_client() -> Client:
    """Returns a Supabase client using the anon key (RLS-enforced)."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def get_supabase_admin() -> Client:
    """Returns a Supabase client with service-role (bypasses RLS)."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
