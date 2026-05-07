-- ============================================================
-- AI CEM PLATFORM — SUPABASE SCHEMA
-- CREOVA Solutions | Multi-tenant, RLS-enforced
-- ============================================================

-- EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for fuzzy search on contacts

-- ============================================================
-- 1. ORGANIZATIONS (top-level tenant)
-- ============================================================
create table organizations (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text unique not null,
  plan          text not null default 'starter' check (plan in ('starter','growth','agency','enterprise')),
  owner_id      uuid,                          -- set after auth.users insert
  whatsapp_bsp  text default 'meta',           -- 'meta' | '360dialog' | 'twilio'
  locale        text default 'en',             -- 'en' | 'sw' | 'fr'
  country_code  text default 'TZ',
  stripe_customer_id text,
  msg_quota     int not null default 2000,     -- monthly message allowance
  msg_used      int not null default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- 2. WORKSPACES (sub-accounts under an org — for agencies)
-- ============================================================
create table workspaces (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id) on delete cascade,
  name            text not null,
  whatsapp_number text,                        -- E.164 format
  whatsapp_token  text,                        -- encrypted BSP token
  meta_phone_id   text,                        -- Meta Cloud API phone_number_id
  is_default      boolean default false,
  created_at      timestamptz default now()
);

-- ============================================================
-- 3. MEMBERS (users → orgs, with roles)
-- ============================================================
create table members (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'member' check (role in ('owner','admin','member','viewer')),
  created_at  timestamptz default now(),
  unique(org_id, user_id)
);

-- ============================================================
-- 4. CONTACTS
-- ============================================================
create table contacts (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id) on delete cascade,
  workspace_id    uuid references workspaces(id),
  phone           text not null,               -- E.164
  email           text,
  first_name      text,
  last_name       text,
  company         text,
  industry        text,
  role_title      text,
  country         text,
  language        text default 'en',           -- preferred language
  tags            text[] default '{}',
  custom_fields   jsonb default '{}',
  lead_score      int default 0 check (lead_score between 0 and 100),
  stage           text default 'cold' check (stage in ('cold','warm','hot','qualified','customer','churned')),
  source          text,                        -- 'csv_import' | 'api' | 'form' | 'manual'
  opted_in        boolean not null default false,
  opted_in_at     timestamptz,
  opted_out_at    timestamptz,
  last_contacted  timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(org_id, phone)
);
create index idx_contacts_org_stage on contacts(org_id, stage);
create index idx_contacts_phone_trgm on contacts using gin(phone gin_trgm_ops);

-- ============================================================
-- 5. CONSENT RECORDS (immutable audit log)
-- ============================================================
create table consent_records (
  id            uuid primary key default uuid_generate_v4(),
  contact_id    uuid not null references contacts(id) on delete cascade,
  org_id        uuid not null references organizations(id),
  action        text not null check (action in ('opt_in','opt_out','re_opt_in')),
  channel       text not null check (channel in ('whatsapp','email','sms')),
  method        text not null,                 -- 'keyword_reply' | 'web_form' | 'csv_import_consent' | 'api'
  ip_address    inet,
  user_agent    text,
  recorded_at   timestamptz default now()
);
-- immutable — no updates or deletes
create rule no_update_consent as on update to consent_records do instead nothing;
create rule no_delete_consent as on delete to consent_records do instead nothing;

-- ============================================================
-- 6. CONVERSATIONS
-- ============================================================
create table conversations (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id) on delete cascade,
  workspace_id    uuid references workspaces(id),
  contact_id      uuid not null references contacts(id),
  channel         text not null default 'whatsapp' check (channel in ('whatsapp','email','sms','rcs')),
  status          text not null default 'open' check (status in ('open','pending','resolved','archived')),
  assigned_to     uuid references auth.users(id),
  campaign_id     uuid,                        -- fk set after campaigns table
  intent          text,                        -- AI-detected: 'interested' | 'not_interested' | 'needs_info' | 'ready_to_buy'
  sentiment       text,                        -- AI-detected: 'positive' | 'neutral' | 'negative'
  summary         text,                        -- AI-generated conversation summary
  last_message_at timestamptz,
  opened_at       timestamptz,
  resolved_at     timestamptz,
  created_at      timestamptz default now()
);
create index idx_conversations_org_status on conversations(org_id, status);
create index idx_conversations_contact on conversations(contact_id);

-- ============================================================
-- 7. MESSAGES
-- ============================================================
create table messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  org_id          uuid not null references organizations(id),
  direction       text not null check (direction in ('outbound','inbound')),
  channel         text not null default 'whatsapp',
  content         text not null,
  media_url       text,
  media_type      text,                        -- 'image' | 'document' | 'audio' | 'video'
  wa_message_id   text,                        -- WhatsApp message ID from Meta
  status          text default 'pending' check (status in ('pending','sent','delivered','read','failed')),
  ai_generated    boolean default false,
  tokens_used     int default 0,
  error_code      text,
  sent_at         timestamptz,
  delivered_at    timestamptz,
  read_at         timestamptz,
  created_at      timestamptz default now()
);
create index idx_messages_conversation on messages(conversation_id, created_at);
create index idx_messages_wa_id on messages(wa_message_id) where wa_message_id is not null;

-- ============================================================
-- 8. CAMPAIGNS
-- ============================================================
create table campaigns (
  id                uuid primary key default uuid_generate_v4(),
  org_id            uuid not null references organizations(id) on delete cascade,
  workspace_id      uuid references workspaces(id),
  created_by        uuid references auth.users(id),
  name              text not null,
  description       text,
  channel           text not null default 'whatsapp',
  type              text not null default 'outreach' check (type in ('outreach','nurture','reactivation','broadcast','abandoned_cart')),
  status            text not null default 'draft' check (status in ('draft','scheduled','running','paused','completed','cancelled')),
  ai_generated      boolean default true,
  template_id       uuid,                      -- fk to wa_templates
  segment_filter    jsonb default '{}',        -- contact filter criteria
  schedule_at       timestamptz,
  completed_at      timestamptz,
  -- stats (denormalized for dashboard speed)
  total_contacts    int default 0,
  sent_count        int default 0,
  delivered_count   int default 0,
  read_count        int default 0,
  replied_count     int default 0,
  qualified_count   int default 0,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- add FK back to conversations
alter table conversations add constraint fk_conv_campaign
  foreign key (campaign_id) references campaigns(id) on delete set null;

-- ============================================================
-- 9. WHATSAPP TEMPLATES
-- ============================================================
create table wa_templates (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id) on delete cascade,
  workspace_id    uuid references workspaces(id),
  name            text not null,
  language        text not null default 'en',
  category        text not null check (category in ('marketing','utility','authentication')),
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  components      jsonb not null,              -- Meta template components structure
  meta_template_id text,
  ai_generated    boolean default false,
  created_at      timestamptz default now()
);

-- ============================================================
-- 10. DEALS / CRM PIPELINE
-- ============================================================
create table deals (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id) on delete cascade,
  contact_id      uuid not null references contacts(id),
  conversation_id uuid references conversations(id),
  assigned_to     uuid references auth.users(id),
  title           text not null,
  value           numeric(12,2),
  currency        text default 'USD',
  stage           text not null default 'lead' check (stage in ('lead','qualified','proposal','negotiation','won','lost')),
  probability     int default 0 check (probability between 0 and 100),
  expected_close  date,
  closed_at       timestamptz,
  lost_reason     text,
  notes           text,
  custom_fields   jsonb default '{}',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index idx_deals_org_stage on deals(org_id, stage);

-- ============================================================
-- 11. AI AGENT CONFIGS
-- ============================================================
create table agent_configs (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id) on delete cascade,
  workspace_id    uuid references workspaces(id),
  name            text not null,
  type            text not null check (type in ('outreach','qualifier','support','followup','cart_recovery')),
  model           text not null default 'claude-sonnet-4-20250514',
  system_prompt   text not null,
  language        text default 'en',           -- 'en' | 'sw' | 'auto'
  tone            text default 'professional', -- 'professional' | 'friendly' | 'casual'
  max_tokens      int default 500,
  temperature     numeric(3,2) default 0.7,
  is_active       boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- 12. AI USAGE LOG (for billing & token budgets)
-- ============================================================
create table ai_usage_log (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id),
  workspace_id    uuid references workspaces(id),
  agent_config_id uuid references agent_configs(id),
  model           text not null,
  prompt_tokens   int not null default 0,
  completion_tokens int not null default 0,
  total_tokens    int not null default 0,
  cost_usd        numeric(10,6),
  purpose         text,                        -- 'outreach_gen' | 'qualification' | 'summary' | 'scoring'
  created_at      timestamptz default now()
);
create index idx_ai_usage_org_date on ai_usage_log(org_id, created_at);

-- ============================================================
-- 13. WEBHOOKS LOG (incoming WhatsApp events)
-- ============================================================
create table webhook_events (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid references workspaces(id),
  event_type      text not null,               -- 'message' | 'status_update' | 'template_status'
  wa_message_id   text,
  payload         jsonb not null,
  processed       boolean default false,
  processed_at    timestamptz,
  error           text,
  created_at      timestamptz default now()
);
create index idx_webhooks_unprocessed on webhook_events(processed, created_at) where processed = false;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table organizations    enable row level security;
alter table workspaces       enable row level security;
alter table members          enable row level security;
alter table contacts         enable row level security;
alter table consent_records  enable row level security;
alter table conversations    enable row level security;
alter table messages         enable row level security;
alter table campaigns        enable row level security;
alter table wa_templates     enable row level security;
alter table deals            enable row level security;
alter table agent_configs    enable row level security;
alter table ai_usage_log     enable row level security;

-- Helper function: get org_ids for current user
create or replace function my_org_ids()
returns setof uuid language sql security definer stable as $$
  select org_id from members where user_id = auth.uid()
$$;

-- RLS policies (org-scoped for all tables)
create policy "members_own_org" on organizations for all using (id in (select my_org_ids()));
create policy "members_own_workspaces" on workspaces for all using (org_id in (select my_org_ids()));
create policy "members_own_members" on members for all using (org_id in (select my_org_ids()));
create policy "members_own_contacts" on contacts for all using (org_id in (select my_org_ids()));
create policy "members_own_consent" on consent_records for select using (org_id in (select my_org_ids()));
create policy "members_own_conversations" on conversations for all using (org_id in (select my_org_ids()));
create policy "members_own_messages" on messages for all using (org_id in (select my_org_ids()));
create policy "members_own_campaigns" on campaigns for all using (org_id in (select my_org_ids()));
create policy "members_own_templates" on wa_templates for all using (org_id in (select my_org_ids()));
create policy "members_own_deals" on deals for all using (org_id in (select my_org_ids()));
create policy "members_own_agents" on agent_configs for all using (org_id in (select my_org_ids()));
create policy "members_own_ai_log" on ai_usage_log for select using (org_id in (select my_org_ids()));

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_organizations_updated before update on organizations for each row execute function set_updated_at();
create trigger trg_contacts_updated      before update on contacts      for each row execute function set_updated_at();
create trigger trg_campaigns_updated     before update on campaigns     for each row execute function set_updated_at();
create trigger trg_deals_updated         before update on deals         for each row execute function set_updated_at();
create trigger trg_agent_configs_updated before update on agent_configs for each row execute function set_updated_at();
