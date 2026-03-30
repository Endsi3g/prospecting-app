-- =============================================================
-- SQL SETUP FOR REMOTE SUPABASE (CLOUD)
-- Paste this entire content into the SQL Editor of your project
-- =============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 1. Organizations ─────────────────────────────────────────
create table if not exists public.organizations (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    slug text unique not null,
    plan text default 'free',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table public.organizations enable row level security;

-- ── 2. Users ─────────────────────────────────────────────────
create table if not exists public.users (
    id uuid primary key default uuid_generate_v4(),
    auth_id uuid unique,
    organization_id uuid references public.organizations(id) on delete cascade,
    email text not null,
    full_name text,
    role text default 'member',
    avatar_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table public.users enable row level security;

-- ── 3. Companies (Prospected) ────────────────────────────────
create table if not exists public.companies (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    name text not null,
    website text,
    phone text,
    email text,
    address text,
    city text,
    region text default 'Québec',
    category text default 'Construction',
    sub_category text,
    source text,
    google_maps_url text,
    rating numeric(2,1),
    review_count integer default 0,
    enrichment_status text default 'pending',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table public.companies enable row level security;

-- ── 4. Contacts (Decision Makers) ────────────────────────────
create table if not exists public.contacts (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    company_id uuid references public.companies(id) on delete cascade,
    full_name text not null,
    email text,
    phone text,
    role_title text,
    role_confidence numeric(3,2) default 0.00,
    linkedin_url text,
    is_primary boolean default false,
    source text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table public.contacts enable row level security;

-- ── 5. Leads ─────────────────────────────────────────────────
create table if not exists public.leads (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    company_id uuid references public.companies(id) on delete cascade,
    contact_id uuid references public.contacts(id) on delete set null,
    campaign_id uuid,
    status text default 'new',
    fit_score numeric(3,2),
    contact_confidence numeric(3,2),
    personalization_score numeric(3,2),
    outcome_score numeric(3,2),
    notes text,
    assigned_to uuid references public.users(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table public.leads enable row level security;

-- ── 6. Campaigns ─────────────────────────────────────────────
create table if not exists public.campaigns (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    name text not null,
    description text,
    status text default 'draft',
    niche text default 'Construction',
    region text default 'Québec',
    created_by uuid references public.users(id),
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table public.campaigns enable row level security;

-- ── 8. Messages ──────────────────────────────────────────────
create table if not exists public.messages (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    lead_id uuid references public.leads(id) on delete cascade,
    campaign_id uuid references public.campaigns(id) on delete set null,
    from_email text,
    to_email text,
    subject text,
    body text,
    status text default 'draft',
    resend_id text,
    sent_at timestamptz,
    created_at timestamptz default now()
);
alter table public.messages enable row level security;

-- ── 14. Activity Logs ────────────────────────────────────────
create table if not exists public.activity_logs (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    user_id uuid references public.users(id) on delete set null,
    entity_type text not null,
    entity_id uuid,
    action text not null,
    metadata jsonb default '{}',
    created_at timestamptz default now()
);
alter table public.activity_logs enable row level security;

-- ── 15. Settings ─────────────────────────────────────────────
create table if not exists public.settings (
    id uuid primary key default uuid_generate_v4(),
    key text unique not null,
    value text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ── Initial Default Data ──────────────────────────────────────
insert into public.organizations (name, slug) values ('Uprising Studio', 'uprising-studio') on conflict do nothing;

-- ── Basic RLS Policies (Allow all for Service Role Key use) ──
create policy "Allow all companies" on public.companies for all using (true);
create policy "Allow all leads" on public.leads for all using (true);
create policy "Allow all contacts" on public.contacts for all using (true);
create policy "Allow all messages" on public.messages for all using (true);
create policy "Allow all activity_logs" on public.activity_logs for all using (true);
create policy "Allow all settings" on public.settings for all using (true);
