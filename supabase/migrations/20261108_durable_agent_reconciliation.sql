-- ==============================================================================
-- IRZAM STUDIO — MASTER DURABLE AGENT SCHEMA RECONCILIATION
-- Additive migration preserving all existing tables and data.
-- ==============================================================================

-- 1. Owner Authentication Settings
CREATE TABLE IF NOT EXISTS public.owner_auth_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    pin_hash TEXT NOT NULL,
    pin_salt TEXT,
    auth_version INTEGER NOT NULL DEFAULT 1,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT single_owner_auth_row CHECK (id = 1)
);

-- 2. Durable Agent Tasks
CREATE TABLE IF NOT EXISTS public.agent_tasks (
    id TEXT PRIMARY KEY DEFAULT ('task-' || gen_random_uuid()::text),
    thread_id TEXT,
    goal TEXT NOT NULL,
    workflow_type TEXT NOT NULL DEFAULT 'general',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'waiting_approval', 'completed', 'failed')),
    priority INTEGER NOT NULL DEFAULT 10,
    checkpoint JSONB NOT NULL DEFAULT '{}'::jsonb,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    requires_owner_approval BOOLEAN NOT NULL DEFAULT false,
    approval_prompt TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON public.agent_tasks (status, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_thread ON public.agent_tasks (thread_id);

-- 3. Agent Task Events (User-Visible Progress Timeline)
CREATE TABLE IF NOT EXISTS public.agent_task_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT NOT NULL REFERENCES public.agent_tasks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('thinking', 'tool_start', 'tool_result', 'checkpoint', 'status_change', 'error', 'complete')),
    message TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_task_events_task ON public.agent_task_events (task_id, created_at ASC);

-- 4. Durable Agent Memories & Provenance
CREATE TABLE IF NOT EXISTS public.agent_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('owner_profile', 'preference', 'decision', 'training_rule', 'business_context', 'client_context', 'lesson')),
    content TEXT NOT NULL,
    confidence NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    superseded_by UUID REFERENCES public.agent_memories(id),
    source_thread_id TEXT,
    source_message_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_memories_cat ON public.agent_memories (category, is_active);

-- 5. Seed Core Agent Schedules (Idempotent)
INSERT INTO public.agent_schedules (schedule_key, workflow_type, enabled, interval_minutes, timezone, next_run_at, settings)
VALUES
    ('agent_wake_cycle', 'agent_wake_cycle', true, 30, 'Asia/Karachi', now(), '{"description": "Autonomous worker wake cycle"}'::jsonb),
    ('inbox_watcher_hourly', 'inbox_watcher_hourly', true, 60, 'Asia/Karachi', now(), '{"description": "Hourly Gmail inbox sync and reply parser"}'::jsonb),
    ('daily_lead_discovery', 'daily_lead_discovery', true, 1440, 'Asia/Karachi', now(), '{"target_time_pkt": "17:00", "daily_target": 10, "min_reviews": 50}'::jsonb),
    ('outreach_slot_dispatch', 'outreach_slot_dispatch', true, 30, 'Asia/Karachi', now(), '{"slots_pkt": ["18:00", "18:30", "19:00", "19:30"]}'::jsonb),
    ('followup_processor', 'followup_processor', true, 120, 'Asia/Karachi', now(), '{"max_attempts": 2, "days_between": 3}'::jsonb),
    ('daily_report', 'daily_report', true, 1440, 'Asia/Karachi', now(), '{"target_time_pkt": "22:00"}'::jsonb),
    ('memory_maintenance', 'memory_maintenance', true, 720, 'Asia/Karachi', now(), '{"compact_threshold_turns": 40}'::jsonb)
ON CONFLICT (schedule_key) DO UPDATE
SET updated_at = now();

-- Enable RLS across new tables
ALTER TABLE public.owner_auth_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;
