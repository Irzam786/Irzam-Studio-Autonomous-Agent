-- ==============================================================================
-- IRZAM STUDIO — AGENT JOB QUEUE CONTRACT & RPCS
-- Matches Part 4 specification: claim_agent_jobs, complete_agent_job,
-- fail_agent_job, enqueue_due_agent_schedules with job_type column.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.agent_job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    dedupe_key TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    next_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    locked_by TEXT,
    locked_at TIMESTAMP WITH TIME ZONE,
    lease_expires_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    result_summary TEXT,
    workflow_run_id TEXT,
    schedule_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_job_queue_status_next ON public.agent_job_queue (status, next_attempt_at) WHERE status IN ('pending', 'failed');
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_job_queue_dedupe ON public.agent_job_queue (dedupe_key) WHERE dedupe_key IS NOT NULL AND status IN ('pending', 'running');

-- 1. enqueue_due_agent_schedules RPC
CREATE OR REPLACE FUNCTION public.enqueue_due_agent_schedules(p_now TIMESTAMP WITH TIME ZONE DEFAULT now())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rec RECORD;
    v_enqueued INTEGER := 0;
    v_dedupe TEXT;
BEGIN
    FOR v_rec IN 
        SELECT id, schedule_key, workflow_type, interval_minutes, settings
        FROM public.agent_schedules
        WHERE enabled = true AND (next_run_at IS NULL OR next_run_at <= p_now)
    LOOP
        v_dedupe := v_rec.schedule_key || '-' || to_char(p_now, 'YYYYMMDDHH24MI');
        
        INSERT INTO public.agent_job_queue (
            job_type,
            payload,
            dedupe_key,
            schedule_id,
            status,
            next_attempt_at
        ) VALUES (
            v_rec.workflow_type,
            coalesce(v_rec.settings, '{}'::jsonb),
            v_dedupe,
            v_rec.id,
            'pending',
            p_now
        ) ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL AND status IN ('pending', 'running') DO NOTHING;

        IF FOUND THEN
            v_enqueued := v_enqueued + 1;
        END IF;

        UPDATE public.agent_schedules
        SET next_run_at = p_now + (interval_minutes || ' minutes')::interval,
            updated_at = now()
        WHERE id = v_rec.id;
    END LOOP;

    RETURN jsonb_build_object('enqueued', v_enqueued);
END;
$$;

-- 2. claim_agent_jobs RPC
CREATE OR REPLACE FUNCTION public.claim_agent_jobs(
    p_worker_id TEXT,
    p_limit INTEGER DEFAULT 10,
    p_lock_seconds INTEGER DEFAULT 600
)
RETURNS SETOF public.agent_job_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH due_jobs AS (
        SELECT id
        FROM public.agent_job_queue
        WHERE (
            status = 'pending' AND next_attempt_at <= now()
        ) OR (
            status = 'running' AND lease_expires_at < now() AND attempts < max_attempts
        )
        ORDER BY created_at ASC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.agent_job_queue q
    SET status = 'running',
        locked_by = p_worker_id,
        locked_at = now(),
        lease_expires_at = now() + (p_lock_seconds || ' seconds')::interval,
        attempts = q.attempts + 1,
        updated_at = now()
    FROM due_jobs
    WHERE q.id = due_jobs.id
    RETURNING q.*;
END;
$$;

-- 3. complete_agent_job RPC
CREATE OR REPLACE FUNCTION public.complete_agent_job(
    p_job_id UUID,
    p_worker_id TEXT,
    p_summary TEXT DEFAULT '',
    p_items_processed INTEGER DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.agent_job_queue
    SET status = 'completed',
        result_summary = p_summary,
        locked_by = NULL,
        lease_expires_at = NULL,
        updated_at = now()
    WHERE id = p_job_id;

    RETURN FOUND;
END;
$$;

-- 4. fail_agent_job RPC
CREATE OR REPLACE FUNCTION public.fail_agent_job(
    p_job_id UUID,
    p_worker_id TEXT,
    p_error TEXT DEFAULT '',
    p_retry_delay_seconds INTEGER DEFAULT 300
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.agent_job_queue
    SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
        last_error = p_error,
        next_attempt_at = now() + (p_retry_delay_seconds || ' seconds')::interval,
        locked_by = NULL,
        lease_expires_at = NULL,
        updated_at = now()
    WHERE id = p_job_id;

    RETURN FOUND;
END;
$$;

GRANT ALL ON TABLE public.agent_job_queue TO service_role;
REVOKE ALL ON TABLE public.agent_job_queue FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_due_agent_schedules TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_agent_jobs TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_agent_job TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_agent_job TO service_role;
