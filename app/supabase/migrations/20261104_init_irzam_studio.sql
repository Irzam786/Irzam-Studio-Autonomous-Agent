-- ==============================================================================
-- IRZAM STUDIO — MASTER SUPABASE DATABASE SCHEMA MIGRATION
-- Authoritative Single Source of Truth: All 16 Modules
-- ==============================================================================

-- 1. System Master Configuration (Single-Row Enforcement id = 1)
CREATE TABLE IF NOT EXISTS public.system_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    freellmapi_key TEXT,
    pin_code TEXT,
    netlify_token TEXT,
    google_maps_api_key TEXT DEFAULT '',
    tavily_api_key TEXT DEFAULT '',
    hunter_api_key TEXT DEFAULT '',
    prospeo_api_key TEXT DEFAULT '',
    daily_lead_target INTEGER DEFAULT 10,
    min_google_reviews INTEGER DEFAULT 50,
    research_schedule_pkt TEXT DEFAULT '17:00',
    outreach_schedule_pkt TEXT DEFAULT '18:00',
    report_schedule_pkt TEXT DEFAULT '22:00',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT single_master_row CHECK (id = 1)
);

INSERT INTO public.system_config (id, updated_at)
VALUES (1, timezone('utc'::text, now()))
ON CONFLICT (id) DO NOTHING;

-- 2. Structured Operational Rules (Personal Training Memory)
CREATE TABLE IF NOT EXISTS public.agent_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('qualification', 'outreach_style', 'follow_up', 'timing', 'demo_preferences', 'daily_targets', 'general')),
    title TEXT NOT NULL,
    rule_text TEXT NOT NULL,
    parameters JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_rules_category ON public.agent_rules (category, is_active);

-- No sample training rules are inserted. Add only operator-approved rules through the authenticated app.

-- 3. Training Conversations & Messages
CREATE TABLE IF NOT EXISTS public.training_conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.training_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    extracted_rules_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_training_messages_thread ON public.training_messages (thread_id, created_at ASC);

-- 4. Leads & Prospective Outreach Table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    city TEXT DEFAULT 'Undisclosed',
    niche TEXT DEFAULT 'Technology',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'replied')),
    notes TEXT,
    demo_url TEXT,
    google_place_id TEXT,
    google_rating NUMERIC(3,2),
    google_reviews_count INTEGER DEFAULT 0,
    website TEXT,
    email_source TEXT DEFAULT 'website_research',
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_contacted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads (email);
CREATE INDEX IF NOT EXISTS idx_leads_reviews ON public.leads (google_reviews_count DESC);

-- 5. Outreach Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    niche TEXT NOT NULL,
    city TEXT DEFAULT 'All Cities',
    min_reviews INTEGER DEFAULT 50,
    daily_limit INTEGER DEFAULT 10,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    pitch_angle TEXT DEFAULT 'Interactive Prototype Demo',
    demo_slug TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- No sample campaign is inserted; campaigns are created by the operator.

-- 6. Hourly Outreach Queue Table (Persistent 1-email-per-hour slots)
CREATE TABLE IF NOT EXISTS public.outreach_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    business_name TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    attached_demo_url TEXT,
    scheduled_for_pkt TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('draft_generated', 'scheduled', 'sending', 'sent', 'failed', 'cancelled', 'replied', 'opted_out')),
    sent_via_email TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    followup_stage INTEGER DEFAULT 0,
    next_followup_due TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outreach_queue_status ON public.outreach_queue (status, scheduled_for_pkt);

-- 7. Connected Gmail OAuth Tokens & Quotas
CREATE TABLE IF NOT EXISTS public.gmail_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    label TEXT,
    connected BOOLEAN DEFAULT true,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    daily_send_quota INTEGER DEFAULT 500,
    sent_today INTEGER DEFAULT 0,
    inbox_unread_count INTEGER DEFAULT 0,
    reply_watcher_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_primary BOOLEAN DEFAULT false,
    token_scope TEXT DEFAULT 'https://mail.google.com/',
    refresh_token TEXT,
    access_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Client Demo Deployments & Hosting
CREATE TABLE IF NOT EXISTS public.client_demos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    client_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    framework TEXT DEFAULT 'Tailwind + HTML5',
    html_content TEXT,
    preview_url TEXT,
    views INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired')),
    deploy_target TEXT DEFAULT 'edge_sandbox' CHECK (deploy_target IN ('netlify', 'edge_sandbox')),
    live_netlify_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_client_demos_slug ON public.client_demos (slug);

-- 9. Persistent Chat Messages & Multi-turn Threads
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id TEXT NOT NULL,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model_used TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON public.chat_messages (thread_id, created_at ASC);

-- 10. Integration Connections & Statuses (Connector Marketplace)
CREATE TABLE IF NOT EXISTS public.integration_connections (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    integration_name TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    connection_status TEXT DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'pending')),
    enabled_for_agent BOOLEAN DEFAULT true,
    encrypted_secret_reference TEXT,
    non_sensitive_config JSONB DEFAULT '{}'::jsonb,
    connected_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    last_verified_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT
);

-- 11. Integration Usage Tracking & Cost Quotas
CREATE TABLE IF NOT EXISTS public.integration_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    month_year TEXT NOT NULL,
    requests_count INTEGER DEFAULT 0,
    credits_used NUMERIC(10, 2) DEFAULT 0,
    credits_limit NUMERIC(10, 2) DEFAULT 1000,
    last_request_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_provider_month UNIQUE (provider, month_year)
);

-- 12. Workflow Runs & Automation History
CREATE TABLE IF NOT EXISTS public.workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_type TEXT NOT NULL,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled', 'partial')),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completion_time TIMESTAMP WITH TIME ZONE,
    result_summary TEXT,
    items_processed INTEGER DEFAULT 0,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    error_details TEXT,
    retry_count INTEGER DEFAULT 0
);

-- 13. Daily Reports Table (10:00 PM PKT)
CREATE TABLE IF NOT EXISTS public.daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE DEFAULT CURRENT_DATE NOT NULL,
    generated_at_pkt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    researched_count INTEGER DEFAULT 0,
    qualified_count INTEGER DEFAULT 0,
    google_reviews_checked INTEGER DEFAULT 0,
    emails_discovered INTEGER DEFAULT 0,
    emails_verified INTEGER DEFAULT 0,
    emails_scheduled INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    failed_attempts INTEGER DEFAULT 0,
    replies_received INTEGER DEFAULT 0,
    responses_generated INTEGER DEFAULT 0,
    followups_sent INTEGER DEFAULT 0,
    demos_generated INTEGER DEFAULT 0,
    quota_usage_summary JSONB DEFAULT '{}'::jsonb,
    summary_text TEXT NOT NULL,
    status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'sent_to_email'))
);

-- 14. Email Suppression List (Opt-outs & Bounces)
CREATE TABLE IF NOT EXISTS public.suppression_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    reason TEXT DEFAULT 'opt_out' CHECK (reason IN ('opt_out', 'bounce', 'manual_block')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- RLS (Row Level Security) Policies
-- ==============================================================================
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_demos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppression_list ENABLE ROW LEVEL SECURITY;

-- Browser roles receive no access to operational tables. The server uses service_role.
REVOKE ALL ON TABLE
  public.system_config, public.agent_rules, public.training_conversations, public.training_messages,
  public.leads, public.campaigns, public.outreach_queue, public.gmail_tokens, public.client_demos,
  public.chat_messages, public.integration_connections, public.integration_usage, public.workflow_runs,
  public.daily_reports, public.suppression_list
FROM anon, authenticated;
GRANT ALL ON TABLE
  public.system_config, public.agent_rules, public.training_conversations, public.training_messages,
  public.leads, public.campaigns, public.outreach_queue, public.gmail_tokens, public.client_demos,
  public.chat_messages, public.integration_connections, public.integration_usage, public.workflow_runs,
  public.daily_reports, public.suppression_list
TO service_role;
