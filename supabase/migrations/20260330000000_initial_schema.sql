-- =============================================================
-- Uprising Prospecting App — Initial Schema
-- Construction PME focus | Multi-tenant | RLS-ready
-- =============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 1. Organizations ─────────────────────────────────────────
create table public.organizations (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    slug text unique not null,
    plan text default 'free',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table public.organizations enable row level security;

-- ── 2. Users ─────────────────────────────────────────────────
create table public.users (
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
create table public.companies (
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
create index idx_companies_category on public.companies(category);
create index idx_companies_city on public.companies(city);
create index idx_companies_org on public.companies(organization_id);

-- ── 4. Contacts (Decision Makers) ────────────────────────────
create table public.contacts (
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
create index idx_contacts_company on public.contacts(company_id);

-- ── 5. Leads ─────────────────────────────────────────────────
create table public.leads (
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
create index idx_leads_status on public.leads(status);
create index idx_leads_company on public.leads(company_id);
create index idx_leads_org on public.leads(organization_id);

-- ── 6. Campaigns ─────────────────────────────────────────────
create table public.campaigns (
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

-- ── 7. Campaign Steps ────────────────────────────────────────
create table public.campaign_steps (
    id uuid primary key default uuid_generate_v4(),
    campaign_id uuid references public.campaigns(id) on delete cascade,
    step_order integer not null default 1,
    step_type text default 'email',
    delay_days integer default 0,
    subject_template text,
    body_template text,
    created_at timestamptz default now()
);
alter table public.campaign_steps enable row level security;

-- ── 8. Messages ──────────────────────────────────────────────
create table public.messages (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    lead_id uuid references public.leads(id) on delete cascade,
    campaign_id uuid references public.campaigns(id) on delete set null,
    campaign_step_id uuid references public.campaign_steps(id) on delete set null,
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
create index idx_messages_lead on public.messages(lead_id);

-- ── 9. Message Events ────────────────────────────────────────
create table public.message_events (
    id uuid primary key default uuid_generate_v4(),
    message_id uuid references public.messages(id) on delete cascade,
    event_type text not null,
    payload jsonb default '{}',
    occurred_at timestamptz default now()
);
alter table public.message_events enable row level security;

-- ── 10. Tasks ────────────────────────────────────────────────
create table public.tasks (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    lead_id uuid references public.leads(id) on delete set null,
    assigned_to uuid references public.users(id) on delete set null,
    title text not null,
    description text,
    task_type text default 'follow_up',
    priority text default 'medium',
    status text default 'pending',
    due_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz default now()
);
alter table public.tasks enable row level security;

-- ── 11. Notes ────────────────────────────────────────────────
create table public.notes (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    lead_id uuid references public.leads(id) on delete cascade,
    company_id uuid references public.companies(id) on delete set null,
    author_id uuid references public.users(id) on delete set null,
    content text not null,
    created_at timestamptz default now()
);
alter table public.notes enable row level security;

-- ── 12. AI Generations ───────────────────────────────────────
create table public.ai_generations (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete set null,
    company_id uuid references public.companies(id) on delete set null,
    lead_id uuid references public.leads(id) on delete set null,
    agent_type text not null,
    model text not null,
    prompt_version text default 'v1.0',
    input_summary text,
    output jsonb default '{}',
    confidence numeric(3,2),
    latency_ms integer,
    human_score numeric(3,2),
    human_feedback text,
    created_at timestamptz default now()
);
alter table public.ai_generations enable row level security;
create index idx_ai_gen_agent on public.ai_generations(agent_type);
create index idx_ai_gen_company on public.ai_generations(company_id);

-- ── 13. Quality Reviews ──────────────────────────────────────
create table public.quality_reviews (
    id uuid primary key default uuid_generate_v4(),
    ai_generation_id uuid references public.ai_generations(id) on delete cascade,
    reviewer_id uuid references public.users(id) on delete set null,
    personalization_score numeric(3,2),
    clarity_score numeric(3,2),
    relevance_score numeric(3,2),
    accepted boolean default false,
    feedback text,
    created_at timestamptz default now()
);
alter table public.quality_reviews enable row level security;

-- ── 14. Activity Logs ────────────────────────────────────────
create table public.activity_logs (
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
create index idx_activity_org on public.activity_logs(organization_id);
create index idx_activity_entity on public.activity_logs(entity_type, entity_id);

-- =============================================================
-- Basic RLS Policies (org-scoped)
-- =============================================================
create policy "Users can view own org companies"
    on public.companies for select
    using (organization_id in (
        select organization_id from public.users where auth_id = auth.uid()
    ));

create policy "Users can insert own org companies"
    on public.companies for insert
    with check (organization_id in (
        select organization_id from public.users where auth_id = auth.uid()
    ));

create policy "Users can view own org leads"
    on public.leads for select
    using (organization_id in (
        select organization_id from public.users where auth_id = auth.uid()
    ));

create policy "Users can insert own org leads"
    on public.leads for insert
    with check (organization_id in (
        select organization_id from public.users where auth_id = auth.uid()
    ));
