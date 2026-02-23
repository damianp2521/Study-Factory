-- Auto-generate fixed leave attendance every Monday 00:00 (KST)
-- Prerequisite:
--   1) create_fixed_leave_schema.sql must already be applied
--   2) pg_cron extension must be enabled in Supabase

-- Enable pg_cron (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Keep per-week generation history to prevent duplicate weekly runs
CREATE TABLE IF NOT EXISTS public.fixed_leave_generation_weeks (
    week_start_date DATE PRIMARY KEY,
    week_end_date DATE NOT NULL,
    processed_count INTEGER NOT NULL DEFAULT 0,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generation_source TEXT NOT NULL DEFAULT 'cron'
);

ALTER TABLE public.fixed_leave_generation_weeks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read fixed leave generation logs" ON public.fixed_leave_generation_weeks;
CREATE POLICY "Admins can read fixed leave generation logs" ON public.fixed_leave_generation_weeks
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('staff', 'admin')
        )
    );

-- Generate fixed leaves for the current week in KST (Mon ~ Sun)
CREATE OR REPLACE FUNCTION public.generate_current_week_fixed_leaves_kst()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_kst_today DATE;
    v_week_start_date DATE;
    v_week_end_date DATE;
    v_processed_count INTEGER := 0;
    v_did_insert BOOLEAN := FALSE;
BEGIN
    v_kst_today := (NOW() AT TIME ZONE 'Asia/Seoul')::DATE;
    v_week_start_date := DATE_TRUNC('week', v_kst_today::TIMESTAMP)::DATE;
    v_week_end_date := v_week_start_date + 6;

    WITH inserted AS (
        INSERT INTO public.fixed_leave_generation_weeks (week_start_date, week_end_date, generation_source)
        VALUES (v_week_start_date, v_week_end_date, 'cron')
        ON CONFLICT (week_start_date) DO NOTHING
        RETURNING week_start_date
    )
    SELECT EXISTS(SELECT 1 FROM inserted) INTO v_did_insert;

    -- This week is already generated
    IF NOT v_did_insert THEN
        RETURN jsonb_build_object(
            'success', true,
            'skipped', true,
            'reason', 'already_generated',
            'week_start_date', v_week_start_date,
            'week_end_date', v_week_end_date,
            'processed_count', 0
        );
    END IF;

    v_processed_count := public.generate_fixed_leaves(v_week_start_date, v_week_end_date);

    UPDATE public.fixed_leave_generation_weeks
    SET processed_count = v_processed_count,
        generated_at = NOW()
    WHERE week_start_date = v_week_start_date;

    RETURN jsonb_build_object(
        'success', true,
        'skipped', false,
        'week_start_date', v_week_start_date,
        'week_end_date', v_week_end_date,
        'processed_count', v_processed_count
    );
END;
$$;

-- Schedule weekly run at Monday 00:00 KST (Sunday 15:00 UTC)
DO $job$
DECLARE
    target_job_name TEXT := 'auto-generate-fixed-leaves-weekly-kst';
    existing_job_id BIGINT;
BEGIN
    SELECT jobid
    INTO existing_job_id
    FROM cron.job
    WHERE jobname = target_job_name
    LIMIT 1;

    IF existing_job_id IS NOT NULL THEN
        PERFORM cron.unschedule(existing_job_id);
    END IF;

    PERFORM cron.schedule(
        target_job_name,
        '0 15 * * 0',
        $cron$SELECT public.generate_current_week_fixed_leaves_kst();$cron$
    );
END $job$;

-- Optional: run once immediately so current week is generated right away
SELECT public.generate_current_week_fixed_leaves_kst();
