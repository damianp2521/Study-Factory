BEGIN;

-- ------------------------------------------------------------------
-- 1) Weekly work-plan master table (one row per member per week)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_work_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    report_status TEXT NOT NULL DEFAULT 'draft' CHECK (report_status IN ('draft', 'reported', 're_reported')),
    reported_at TIMESTAMPTZ,
    last_re_reported_at TIMESTAMPTZ,
    admin_evaluation TEXT,
    evaluated_at TIMESTAMPTZ,
    evaluated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_work_plans_week_start
ON public.weekly_work_plans (week_start_date);

CREATE INDEX IF NOT EXISTS idx_weekly_work_plans_user_week
ON public.weekly_work_plans (user_id, week_start_date);

-- ------------------------------------------------------------------
-- 2) Weekly todo items (soft-delete for history visibility)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_work_plan_todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.weekly_work_plans(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_weekly_work_plan_todos_plan
ON public.weekly_work_plan_todos (plan_id, deleted_at, display_order, created_at);

-- ------------------------------------------------------------------
-- 3) Weekly work-plan activity log (creation/completion/edit/delete/report/evaluation)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_work_plan_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.weekly_work_plans(id) ON DELETE CASCADE,
    todo_id UUID REFERENCES public.weekly_work_plan_todos(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'CREATE_TODO',
        'UPDATE_TODO',
        'TOGGLE_TODO',
        'DELETE_TODO',
        'REPORT',
        'REREPORT',
        'EVALUATE'
    )),
    action_detail TEXT,
    before_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    after_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_work_plan_activity_logs_plan_created
ON public.weekly_work_plan_activity_logs (plan_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_work_plan_activity_logs_user_created
ON public.weekly_work_plan_activity_logs (user_id, created_at DESC);

-- ------------------------------------------------------------------
-- 4) Updated-at triggers
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_weekly_work_plans_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn_touch_weekly_work_plans$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$fn_touch_weekly_work_plans$;

DROP TRIGGER IF EXISTS trg_touch_weekly_work_plans_updated_at ON public.weekly_work_plans;
CREATE TRIGGER trg_touch_weekly_work_plans_updated_at
BEFORE UPDATE ON public.weekly_work_plans
FOR EACH ROW
EXECUTE FUNCTION public.touch_weekly_work_plans_updated_at();

CREATE OR REPLACE FUNCTION public.touch_weekly_work_plan_todos_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn_touch_weekly_work_plan_todos$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$fn_touch_weekly_work_plan_todos$;

DROP TRIGGER IF EXISTS trg_touch_weekly_work_plan_todos_updated_at ON public.weekly_work_plan_todos;
CREATE TRIGGER trg_touch_weekly_work_plan_todos_updated_at
BEFORE UPDATE ON public.weekly_work_plan_todos
FOR EACH ROW
EXECUTE FUNCTION public.touch_weekly_work_plan_todos_updated_at();

-- ------------------------------------------------------------------
-- 5) RLS
-- ------------------------------------------------------------------
ALTER TABLE public.weekly_work_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_work_plan_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_work_plan_activity_logs ENABLE ROW LEVEL SECURITY;

DO $do_drop_policies_weekly_work_plans$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'weekly_work_plans' AND policyname = 'weekly_work_plans_select_policy'
    ) THEN
        DROP POLICY weekly_work_plans_select_policy ON public.weekly_work_plans;
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'weekly_work_plans' AND policyname = 'weekly_work_plans_insert_policy'
    ) THEN
        DROP POLICY weekly_work_plans_insert_policy ON public.weekly_work_plans;
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'weekly_work_plans' AND policyname = 'weekly_work_plans_update_policy'
    ) THEN
        DROP POLICY weekly_work_plans_update_policy ON public.weekly_work_plans;
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'weekly_work_plans' AND policyname = 'weekly_work_plans_delete_policy'
    ) THEN
        DROP POLICY weekly_work_plans_delete_policy ON public.weekly_work_plans;
    END IF;
END $do_drop_policies_weekly_work_plans$;

CREATE POLICY weekly_work_plans_select_policy
ON public.weekly_work_plans
FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1
        FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role IN ('admin', 'staff', 'manager')
    )
);

CREATE POLICY weekly_work_plans_insert_policy
ON public.weekly_work_plans
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1
        FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role IN ('admin', 'staff', 'manager')
    )
);

CREATE POLICY weekly_work_plans_update_policy
ON public.weekly_work_plans
FOR UPDATE
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1
        FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role IN ('admin', 'staff', 'manager')
    )
)
WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1
        FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role IN ('admin', 'staff', 'manager')
    )
);

CREATE POLICY weekly_work_plans_delete_policy
ON public.weekly_work_plans
FOR DELETE
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1
        FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role IN ('admin', 'staff', 'manager')
    )
);

DO $do_drop_policies_weekly_work_plan_todos$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'weekly_work_plan_todos' AND policyname = 'weekly_work_plan_todos_select_policy'
    ) THEN
        DROP POLICY weekly_work_plan_todos_select_policy ON public.weekly_work_plan_todos;
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'weekly_work_plan_todos' AND policyname = 'weekly_work_plan_todos_insert_policy'
    ) THEN
        DROP POLICY weekly_work_plan_todos_insert_policy ON public.weekly_work_plan_todos;
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'weekly_work_plan_todos' AND policyname = 'weekly_work_plan_todos_update_policy'
    ) THEN
        DROP POLICY weekly_work_plan_todos_update_policy ON public.weekly_work_plan_todos;
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'weekly_work_plan_todos' AND policyname = 'weekly_work_plan_todos_delete_policy'
    ) THEN
        DROP POLICY weekly_work_plan_todos_delete_policy ON public.weekly_work_plan_todos;
    END IF;
END $do_drop_policies_weekly_work_plan_todos$;

CREATE POLICY weekly_work_plan_todos_select_policy
ON public.weekly_work_plan_todos
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.weekly_work_plans wp
        WHERE wp.id = weekly_work_plan_todos.plan_id
          AND (
              wp.user_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles me
                  WHERE me.id = auth.uid()
                    AND me.role IN ('admin', 'staff', 'manager')
              )
          )
    )
);

CREATE POLICY weekly_work_plan_todos_insert_policy
ON public.weekly_work_plan_todos
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.weekly_work_plans wp
        WHERE wp.id = weekly_work_plan_todos.plan_id
          AND (
              wp.user_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles me
                  WHERE me.id = auth.uid()
                    AND me.role IN ('admin', 'staff', 'manager')
              )
          )
    )
);

CREATE POLICY weekly_work_plan_todos_update_policy
ON public.weekly_work_plan_todos
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.weekly_work_plans wp
        WHERE wp.id = weekly_work_plan_todos.plan_id
          AND (
              wp.user_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles me
                  WHERE me.id = auth.uid()
                    AND me.role IN ('admin', 'staff', 'manager')
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.weekly_work_plans wp
        WHERE wp.id = weekly_work_plan_todos.plan_id
          AND (
              wp.user_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles me
                  WHERE me.id = auth.uid()
                    AND me.role IN ('admin', 'staff', 'manager')
              )
          )
    )
);

CREATE POLICY weekly_work_plan_todos_delete_policy
ON public.weekly_work_plan_todos
FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM public.weekly_work_plans wp
        WHERE wp.id = weekly_work_plan_todos.plan_id
          AND (
              wp.user_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles me
                  WHERE me.id = auth.uid()
                    AND me.role IN ('admin', 'staff', 'manager')
              )
          )
    )
);

DO $do_drop_policies_weekly_work_plan_logs$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'weekly_work_plan_activity_logs' AND policyname = 'weekly_work_plan_activity_logs_select_policy'
    ) THEN
        DROP POLICY weekly_work_plan_activity_logs_select_policy ON public.weekly_work_plan_activity_logs;
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'weekly_work_plan_activity_logs' AND policyname = 'weekly_work_plan_activity_logs_insert_policy'
    ) THEN
        DROP POLICY weekly_work_plan_activity_logs_insert_policy ON public.weekly_work_plan_activity_logs;
    END IF;
END $do_drop_policies_weekly_work_plan_logs$;

CREATE POLICY weekly_work_plan_activity_logs_select_policy
ON public.weekly_work_plan_activity_logs
FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1
        FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role IN ('admin', 'staff', 'manager')
    )
);

CREATE POLICY weekly_work_plan_activity_logs_insert_policy
ON public.weekly_work_plan_activity_logs
FOR INSERT
WITH CHECK (
    auth.uid() = actor_id
    OR EXISTS (
        SELECT 1
        FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role IN ('admin', 'staff', 'manager')
    )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_work_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_work_plan_todos TO authenticated;
GRANT SELECT, INSERT ON public.weekly_work_plan_activity_logs TO authenticated;

COMMIT;
