-- ============================================================
-- TRUA IO — SUPABASE SCHEMA v1.0
-- Stack: Supabase (PostgreSQL + Auth + RLS)
-- Market: Tanzania | Compliance: PDPA 2022, CAN-SPAM, GDPR
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- ORGANIZATIONS (tenant root)
-- ============================================================
create table organizations (
  id                    uuid primary key default uuid_generate_v4(),
  name                  text not null,
  slug                  text unique not null,
  plan                  text not null default 'starter'
                          check (plan in ('starter','growth','agency','enterprise')),
  owner_id              uuid,
  domain                text,                   -- sender domain e.g. truaio.co.tz
  resend_domain_id      text,                   -- Resend domain ID
  resend_api_key_enc    text,                   -- encrypted Resend API key
  from_name             text not null default 'Trua IO',
  from_email            text,                   -- verified sender address
  physical_address      text,                   -- required for CAN-SPAM footer
  website_url           text,
  locale                text default 'en'
                          check (locale in ('en','sw')),   -- English or Swahili
  timezone              text default 'Africa/Dar_es_Salaam',
  country               text default 'TZ',
  -- email quota & warmup
  daily_send_limit      int not null default 200,
  warmup_active         boolean default true,
  warmup_day            int default 1,          -- warmup day counter
  -- compliance
  pdpa_registered       boolean default false,  -- Tanzania TCRA registration
  data_controller_name  text,
  privacy_policy_url    text,
  -- stripe
  stripe_customer_id    text,
  stripe_subscription   text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ============================================================
-- MEMBERS (users → orgs with roles)
-- ============================================================
create table members (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'sales_user'
                check (role in ('admin','sales_user','viewer')),
  invited_by  uuid references auth.users(id),
  accepted_at timestamptz,
  created_at  timestamptz default now(),
  unique(org_id, user_id)
);

-- ============================================================
-- CONTACTS
-- ============================================================
create table contacts (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id) on delete cascade,
  -- identity
  email           text not null,
  first_name      text,
  last_name       text,
  job_title       text,
  -- company
  company_name    text,
  company_size    text check (company_size in ('1-10','11-50','51-200','201-500','501-2000','2000+')),
  industry        text,                         -- 'logistics','tourism','finance','retail','ngo','government','tech','other'
  city            text,                         -- 'Dar es Salaam','Arusha','Mwanza','Other'
  region          text,
  country         text default 'TZ',
  website         text,
  phone           text,
  linkedin_url    text,
  brela_reg_no    text,                         -- Tanzania BRELA registration number
  -- enrichment
  enriched        boolean default false,
  enriched_at     timestamptz,
  enrichment_source text,                       -- 'csv','manual','ai_web','brela','linkedin_csv'
  -- lifecycle
  stage           text not null default 'cold'
                    check (stage in ('cold','contacted','replied','qualified','converted','unsubscribed','bounced')),
  lead_score      int default 0 check (lead_score between 0 and 100),
  tags            text[] default '{}',
  custom_fields   jsonb default '{}',
  notes           text,
  -- consent (PDPA 2022 + CAN-SPAM)
  opted_in        boolean not null default false,
  opted_in_at     timestamptz,
  opt_in_method   text,                         -- 'csv_import','manual','web_form','reply'
  opted_out       boolean not null default false,
  opted_out_at    timestamptz,
  opt_out_reason  text,
  -- tracking
  last_contacted  timestamptz,
  last_opened     timestamptz,
  last_replied    timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(org_id, email)
);

create index idx_contacts_org_stage   on contacts(org_id, stage);
create index idx_contacts_org_city    on contacts(org_id, city);
create index idx_contacts_org_industry on contacts(org_id, industry);
create index idx_contacts_email_trgm  on contacts using gin(email gin_trgm_ops);
create index idx_contacts_company_trgm on contacts using gin(company_name gin_trgm_ops);

-- ============================================================
-- CONSENT RECORDS (immutable audit trail — PDPA compliance)
-- ============================================================
create table consent_records (
  id              uuid primary key default uuid_generate_v4(),
  contact_id      uuid not null references contacts(id) on delete cascade,
  org_id          uuid not null references organizations(id),
  action          text not null check (action in ('opt_in','opt_out','re_opt_in','data_access_request','data_deletion_request')),
  channel         text not null check (channel in ('email','web_form','csv_import','manual','api')),
  ip_address      inet,
  user_agent      text,
  notes           text,
  recorded_at     timestamptz default now()
);

create rule no_update_consent as on update to consent_records do instead nothing;
create rule no_delete_consent as on delete to consent_records do instead nothing;

-- ============================================================
-- CAMPAIGNS
-- ============================================================
create table campaigns (
  id                uuid primary key default uuid_generate_v4(),
  org_id            uuid not null references organizations(id) on delete cascade,
  created_by        uuid references auth.users(id),
  name              text not null,
  description       text,
  -- targeting
  segment_filter    jsonb default '{}',         -- {industry, city, stage, tags, size}
  target_count      int default 0,
  -- content
  subject_line      text,
  preview_text      text,
  body_html         text,
  body_text         text,
  language          text default 'en' check (language in ('en','sw','both')),
  ai_generated      boolean default true,
  -- scheduling
  status            text not null default 'draft'
                      check (status in ('draft','scheduled','running','paused','completed','cancelled')),
  schedule_type     text default 'immediate' check (schedule_type in ('immediate','scheduled','triggered')),
  scheduled_at      timestamptz,
  send_window_start time default '08:00',       -- EAT
  send_window_end   time default '17:00',       -- EAT
  send_on_weekdays  boolean default true,
  rate_per_hour     int default 100,
  completed_at      timestamptz,
  -- stats (denormalized)
  sent_count        int default 0,
  delivered_count   int default 0,
  opened_count      int default 0,
  clicked_count     int default 0,
  replied_count     int default 0,
  bounced_count     int default 0,
  unsubscribed_count int default 0,
  -- compliance
  includes_unsubscribe boolean default true,
  includes_physical_address boolean default true,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index idx_campaigns_org_status on campaigns(org_id, status);

-- ============================================================
-- EMAILS (individual send records)
-- ============================================================
create table emails (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id),
  campaign_id     uuid references campaigns(id) on delete set null,
  contact_id      uuid not null references contacts(id) on delete cascade,
  -- content (personalized copy)
  subject         text not null,
  body_html       text not null,
  body_text       text,
  -- sending
  from_email      text not null,
  from_name       text not null,
  to_email        text not null,
  resend_email_id text,                         -- Resend message ID
  status          text not null default 'queued'
                    check (status in ('queued','sending','sent','delivered','bounced','failed','cancelled')),
  scheduled_at    timestamptz,
  sent_at         timestamptz,
  -- tracking
  opened          boolean default false,
  opened_at       timestamptz,
  clicked         boolean default false,
  clicked_at      timestamptz,
  replied         boolean default false,
  replied_at      timestamptz,
  bounced         boolean default false,
  bounce_type     text,                         -- 'hard','soft'
  bounce_reason   text,
  unsubscribed    boolean default false,
  unsubscribed_at timestamptz,
  -- AI metadata
  ai_generated    boolean default true,
  tokens_used     int default 0,
  model_used      text,
  error_message   text,
  retry_count     int default 0,
  created_at      timestamptz default now()
);

create index idx_emails_org_status     on emails(org_id, status, scheduled_at);
create index idx_emails_campaign       on emails(campaign_id);
create index idx_emails_contact        on emails(contact_id);
create index idx_emails_resend_id      on emails(resend_email_id) where resend_email_id is not null;
create index idx_emails_queued         on emails(scheduled_at) where status = 'queued';

-- ============================================================
-- EMAIL EVENTS (webhook events from Resend)
-- ============================================================
create table email_events (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id),
  email_id        uuid references emails(id) on delete cascade,
  resend_email_id text,
  event_type      text not null,               -- 'sent','delivered','opened','clicked','bounced','complained','unsubscribed'
  event_data      jsonb default '{}',
  occurred_at     timestamptz not null,
  created_at      timestamptz default now()
);

create index idx_email_events_email on email_events(email_id);
create index idx_email_events_type  on email_events(event_type, occurred_at);

-- ============================================================
-- UNSUBSCRIBE TOKENS (one-click unsubscribe links)
-- ============================================================
create table unsubscribe_tokens (
  id              uuid primary key default uuid_generate_v4(),
  token           text unique not null default encode(gen_random_bytes(32), 'hex'),
  email_id        uuid references emails(id) on delete cascade,
  contact_id      uuid not null references contacts(id) on delete cascade,
  org_id          uuid not null references organizations(id),
  used            boolean default false,
  used_at         timestamptz,
  reason          text,
  created_at      timestamptz default now()
);

-- ============================================================
-- BOT CONVERSATIONS (chat interface sessions)
-- ============================================================
create table bot_sessions (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id),
  title           text,
  messages        jsonb not null default '[]',  -- [{role, content, timestamp}]
  context         jsonb default '{}',           -- current campaign context
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- AI AGENT CONFIG (prompt management)
-- ============================================================
create table agent_configs (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id) on delete cascade,
  name            text not null,
  type            text not null
                    check (type in ('email_drafter','subject_line','personalizer','enricher','bot_assistant')),
  model           text not null default 'claude-sonnet-4-20250514',
  system_prompt   text not null,
  language        text default 'en',
  tone            text default 'professional',
  temperature     numeric(3,2) default 0.7,
  max_tokens      int default 800,
  is_active       boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- AI USAGE LOG (token budgets + billing)
-- ============================================================
create table ai_usage_log (
  id                uuid primary key default uuid_generate_v4(),
  org_id            uuid not null references organizations(id),
  agent_config_id   uuid references agent_configs(id),
  campaign_id       uuid references campaigns(id),
  email_id          uuid references emails(id),
  model             text not null,
  prompt_tokens     int not null default 0,
  completion_tokens int not null default 0,
  total_tokens      int not null default 0,
  cost_usd          numeric(10,6),
  purpose           text,                       -- 'email_draft','subject_gen','enrichment','bot_chat'
  created_at        timestamptz default now()
);

create index idx_ai_usage_org_date on ai_usage_log(org_id, created_at);

-- ============================================================
-- DATA ACCESS REQUESTS (PDPA 2022 compliance)
-- ============================================================
create table data_requests (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id),
  contact_email   text not null,
  request_type    text not null check (request_type in ('access','correction','deletion','portability')),
  status          text not null default 'pending'
                    check (status in ('pending','in_progress','completed','rejected')),
  notes           text,
  handled_by      uuid references auth.users(id),
  received_at     timestamptz default now(),
  completed_at    timestamptz
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table organizations    enable row level security;
alter table members          enable row level security;
alter table contacts         enable row level security;
alter table consent_records  enable row level security;
alter table campaigns        enable row level security;
alter table emails           enable row level security;
alter table email_events     enable row level security;
alter table unsubscribe_tokens enable row level security;
alter table bot_sessions     enable row level security;
alter table agent_configs    enable row level security;
alter table ai_usage_log     enable row level security;
alter table data_requests    enable row level security;

create or replace function my_org_ids()
returns setof uuid language sql security definer stable as $$
  select org_id from members where user_id = auth.uid()
$$;

create policy "org_access"        on organizations    for all using (id in (select my_org_ids()));
create policy "member_access"     on members          for all using (org_id in (select my_org_ids()));
create policy "contact_access"    on contacts         for all using (org_id in (select my_org_ids()));
create policy "consent_read"      on consent_records  for select using (org_id in (select my_org_ids()));
create policy "campaign_access"   on campaigns        for all using (org_id in (select my_org_ids()));
create policy "email_access"      on emails           for all using (org_id in (select my_org_ids()));
create policy "event_access"      on email_events     for all using (org_id in (select my_org_ids()));
create policy "unsub_access"      on unsubscribe_tokens for all using (org_id in (select my_org_ids()));
create policy "bot_access"        on bot_sessions     for all using (org_id in (select my_org_ids()));
create policy "agent_access"      on agent_configs    for all using (org_id in (select my_org_ids()));
create policy "ai_log_read"       on ai_usage_log     for select using (org_id in (select my_org_ids()));
create policy "data_req_access"   on data_requests    for all using (org_id in (select my_org_ids()));

-- Public unsubscribe (token-based, no auth required)
create policy "public_unsub" on unsubscribe_tokens for select using (true);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_orgs_updated      before update on organizations  for each row execute function set_updated_at();
create trigger trg_contacts_updated  before update on contacts        for each row execute function set_updated_at();
create trigger trg_campaigns_updated before update on campaigns       for each row execute function set_updated_at();
create trigger trg_agent_updated     before update on agent_configs   for each row execute function set_updated_at();
create trigger trg_bot_updated       before update on bot_sessions    for each row execute function set_updated_at();

-- ============================================================
-- SEED: DEFAULT AGENT CONFIGS
-- ============================================================
-- Insert via application after org creation (org_id required)
-- Templates stored in application code, not hardcoded here

-- ============================================================
-- INDEXES FOR SCHEDULER (critical path)
-- ============================================================
create index idx_emails_scheduler on emails(scheduled_at, status)
  where status = 'queued' and scheduled_at is not null;
