-- Irzam Studio secure schema alignment.
-- Applied to the connected Supabase project on 2026-11-04.
-- Additive changes only: existing business data is preserved.
create extension if not exists pgcrypto with schema extensions;

alter table public.system_config alter column pin_code drop not null;
alter table public.system_config
  add column if not exists google_maps_api_key text,
  add column if not exists tavily_api_key text,
  add column if not exists hunter_api_key text,
  add column if not exists prospeo_api_key text,
  add column if not exists daily_lead_target integer not null default 10,
  add column if not exists min_google_reviews integer not null default 50,
  add column if not exists research_schedule_pkt text not null default '17:00',
  add column if not exists outreach_schedule_pkt text not null default '18:00',
  add column if not exists report_schedule_pkt text not null default '22:00',
  add column if not exists secret_storage_migrated_at timestamptz;

-- Transfer the existing key/PIN directly inside Postgres to Supabase Vault.
do $$
declare v_key text; v_pin text;
begin
  select freellmapi_key, pin_code into v_key, v_pin
  from public.system_config where id=1 for update;
  if v_key is not null and length(trim(v_key))>0
     and not exists(select 1 from vault.secrets where name='irzam_freellmapi_key') then
    perform vault.create_secret(v_key,'irzam_freellmapi_key','Irzam Studio FreeLLMAPI credential; server-side only',null);
  end if;
  if v_pin is not null and length(trim(v_pin))>0
     and not exists(select 1 from vault.secrets where name='irzam_owner_pin') then
    perform vault.create_secret(v_pin,'irzam_owner_pin','Irzam Studio owner PIN; server-side only',null);
  end if;
  update public.system_config
  set freellmapi_key=null,pin_code=null,netlify_token=null,
      google_maps_api_key=null,tavily_api_key=null,hunter_api_key=null,prospeo_api_key=null,
      secret_storage_migrated_at=now(),updated_at=now()
  where id=1;
end $$;

create table if not exists public.agent_rules (
 id uuid primary key default gen_random_uuid(), category text not null default 'general', title text not null,
 rule_text text not null, parameters jsonb not null default '{}'::jsonb, is_active boolean not null default true,
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.training_conversations (
 id text primary key, title text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.training_messages (
 id uuid primary key default gen_random_uuid(), thread_id text not null,
 role text not null check(role in ('user','assistant')), content text not null,
 extracted_rules_count integer not null default 0, created_at timestamptz not null default now()
);

alter table public.leads
 add column if not exists niche text default 'Unclassified',
 add column if not exists notes text,
 add column if not exists demo_url text,
 add column if not exists google_place_id text,
 add column if not exists google_rating numeric(3,2),
 add column if not exists google_reviews_count integer not null default 0,
 add column if not exists website text,
 add column if not exists email_source text,
 add column if not exists email_verified boolean not null default false,
 add column if not exists updated_at timestamptz not null default now(),
 add column if not exists last_contacted_at timestamptz;

create table if not exists public.campaigns (
 id uuid primary key default gen_random_uuid(), name text not null, niche text not null,
 city text not null default 'All Cities', min_reviews integer not null default 50,
 daily_limit integer not null default 10, status text not null default 'paused'
 check(status in ('active','paused','completed')),
 pitch_angle text not null default 'Interactive Prototype Demo', demo_slug text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.outreach_queue (
 id uuid primary key default gen_random_uuid(), lead_id uuid references public.leads(id) on delete cascade,
 campaign_id uuid references public.campaigns(id) on delete set null, business_name text not null,
 recipient_email text not null, subject text not null, body text not null, attached_demo_url text,
 scheduled_for_pkt timestamptz not null,
 status text not null default 'draft_generated'
 check(status in ('draft_generated','scheduled','sending','sent','failed','cancelled','replied','opted_out')),
 sent_via_email text, sent_at timestamptz, error_message text, followup_stage integer not null default 0,
 next_followup_due timestamptz, created_at timestamptz not null default now()
);

alter table public.gmail_tokens alter column refresh_token drop not null;
alter table public.gmail_tokens
 add column if not exists label text, add column if not exists connected boolean not null default false,
 add column if not exists connected_at timestamptz, add column if not exists daily_send_quota integer not null default 500,
 add column if not exists sent_today integer not null default 0, add column if not exists inbox_unread_count integer not null default 0,
 add column if not exists reply_watcher_active boolean not null default false, add column if not exists last_sync_at timestamptz,
 add column if not exists is_primary boolean not null default false, add column if not exists token_scope text;

create table if not exists public.chat_sessions (
 id text primary key, title text not null, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), pinned boolean not null default false, messages jsonb not null default '[]'::jsonb
);
alter table public.chat_messages drop constraint if exists chat_messages_thread_id_fkey;
alter table public.chat_messages alter column thread_id type text using thread_id::text;
alter table public.chat_messages add column if not exists sender text, add column if not exists model_used text;

alter table public.client_demos
 add column if not exists slug text, add column if not exists title text, add column if not exists expires_at timestamptz,
 add column if not exists framework text default 'HTML5', add column if not exists html_content text,
 add column if not exists preview_url text, add column if not exists views integer not null default 0,
 add column if not exists status text not null default 'active', add column if not exists deploy_target text default 'netlify',
 add column if not exists live_netlify_url text;

create table if not exists public.integration_connections (
 id text primary key, provider text not null, integration_name text not null, category text not null default 'general',
 connection_status text not null default 'disconnected' check(connection_status in ('connected','disconnected','error','pending')),
 enabled_for_agent boolean not null default true, encrypted_secret_reference text, non_sensitive_config jsonb not null default '{}'::jsonb,
 connected_at timestamptz, updated_at timestamptz not null default now(), last_verified_at timestamptz, last_error text
);
create table if not exists public.integration_usage (
 id uuid primary key default gen_random_uuid(), provider text not null, month_year text not null,
 requests_count integer not null default 0, credits_used numeric(10,2) not null default 0,
 credits_limit numeric(10,2) not null default 1000, last_request_at timestamptz,
 constraint unique_provider_month unique(provider,month_year)
);
create table if not exists public.workflow_runs (
 id uuid primary key default gen_random_uuid(), workflow_type text not null,
 status text not null default 'queued' check(status in ('queued','running','completed','failed','cancelled','partial')),
 start_time timestamptz not null default now(), completion_time timestamptz, result_summary text,
 items_processed integer not null default 0, lead_id uuid references public.leads(id) on delete set null,
 error_details text, retry_count integer not null default 0
);
create table if not exists public.daily_reports (
 id uuid primary key default gen_random_uuid(), report_date date not null default current_date,
 generated_at_pkt timestamptz not null default now(), researched_count integer not null default 0,
 qualified_count integer not null default 0, google_reviews_checked integer not null default 0,
 emails_discovered integer not null default 0, emails_verified integer not null default 0,
 emails_scheduled integer not null default 0, emails_sent integer not null default 0,
 failed_attempts integer not null default 0, replies_received integer not null default 0,
 responses_generated integer not null default 0, followups_sent integer not null default 0,
 demos_generated integer not null default 0, quota_usage_summary jsonb not null default '{}'::jsonb,
 summary_text text not null default '', status text not null default 'saved'
);
create table if not exists public.suppression_list (
 id uuid primary key default gen_random_uuid(), email text not null unique,
 reason text not null default 'opt_out' check(reason in ('opt_out','bounce','manual_block')),
 created_at timestamptz not null default now()
);

create index if not exists idx_agent_rules_category on public.agent_rules(category,is_active);
create index if not exists idx_training_messages_thread on public.training_messages(thread_id,created_at);
create index if not exists idx_leads_status on public.leads(status);
create index if not exists idx_leads_reviews on public.leads(google_reviews_count desc);
create index if not exists idx_campaigns_status on public.campaigns(status);
create index if not exists idx_outreach_queue_due on public.outreach_queue(status,scheduled_for_pkt);
create index if not exists idx_daily_reports_date on public.daily_reports(generated_at_pkt desc);
create index if not exists idx_workflow_runs_start on public.workflow_runs(start_time desc);

-- No browser role may access operational records or tokens.
do $$
declare t text; tables text[]:=array[
 'system_config','agent_rules','training_conversations','training_messages','leads','campaigns',
 'outreach_queue','gmail_tokens','client_demos','chat_messages','chat_threads','chat_sessions',
 'integration_connections','integration_usage','workflow_runs','daily_reports','suppression_list'
];
begin
 foreach t in array tables loop
  if to_regclass('public.'||t) is not null then
   execute format('alter table public.%I enable row level security',t);
   execute format('alter table public.%I force row level security',t);
   execute format('revoke all on table public.%I from anon, authenticated',t);
   execute format('grant all on table public.%I to service_role',t);
  end if;
 end loop;
end $$;
revoke all on schema vault from public,anon,authenticated;
revoke all on all tables in schema vault from public,anon,authenticated;

create or replace function public.get_irzam_secret(secret_name text)
returns text language sql security definer set search_path=''
as $$
  select decrypted_secret from vault.decrypted_secrets where name=secret_name limit 1;
$$;
revoke all on function public.get_irzam_secret(text) from public,anon,authenticated;
grant execute on function public.get_irzam_secret(text) to service_role;
