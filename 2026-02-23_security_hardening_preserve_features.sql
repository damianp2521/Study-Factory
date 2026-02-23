-- Security hardening (preserve current app behavior)
-- 2026-02-23
-- NOTE:
-- - Keeps current functional flows (including 4-digit PIN UX in app layer)
-- - Tightens DB-side authorization for critical RPC + sensitive tables

BEGIN;

-- ------------------------------------------------------------------
-- 0) Canonical role helper
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT role FROM public.profiles WHERE id = auth.uid()),
        'member'
    );
$$;

-- ------------------------------------------------------------------
-- 1) Harden update_employee_info RPC
--    - only staff/admin/manager can call
--    - only admin can change role value
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_employee_info(
    target_id UUID,
    new_branch TEXT,
    new_role TEXT,
    new_seat_number INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role TEXT;
    target_current_role TEXT;
BEGIN
    caller_role := public.get_my_role();

    IF caller_role NOT IN ('admin', 'staff', 'manager') THEN
        RAISE EXCEPTION 'Access denied: only staff/admin can update employee info.';
    END IF;

    SELECT role
    INTO target_current_role
    FROM public.profiles
    WHERE id = target_id
    FOR UPDATE;

    IF target_current_role IS NULL THEN
        RAISE EXCEPTION 'Target user not found.';
    END IF;

    IF caller_role <> 'admin' AND new_role IS DISTINCT FROM target_current_role THEN
        RAISE EXCEPTION 'Access denied: only admin can change role.';
    END IF;

    UPDATE public.profiles
    SET
        branch = new_branch,
        role = new_role,
        seat_number = new_seat_number,
        updated_at = NOW()
    WHERE id = target_id;

    UPDATE auth.users
    SET raw_user_meta_data =
        jsonb_set(
            jsonb_set(
                jsonb_set(
                    COALESCE(raw_user_meta_data, '{}'::jsonb),
                    '{role}',
                    to_jsonb(new_role)
                ),
                '{branch}',
                to_jsonb(new_branch)
            ),
            '{seat_number}',
            COALESCE(to_jsonb(new_seat_number), 'null'::jsonb)
        )
    WHERE id = target_id;
END;
$$;

-- ------------------------------------------------------------------
-- 2) Harden certificate RPCs
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_user_certificate(target_user_id UUID, cert_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role TEXT;
    cert_id UUID;
    safe_cert_name TEXT;
BEGIN
    caller_role := public.get_my_role();
    IF caller_role NOT IN ('admin', 'staff', 'manager') THEN
        RAISE EXCEPTION 'Access denied: only staff/admin can assign certificates.';
    END IF;

    safe_cert_name := btrim(cert_name);
    IF safe_cert_name IS NULL OR safe_cert_name = '' THEN
        RAISE EXCEPTION 'Certificate name is required.';
    END IF;

    INSERT INTO public.certificate_options (name)
    VALUES (safe_cert_name)
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO cert_id;

    IF cert_id IS NULL THEN
        SELECT id INTO cert_id FROM public.certificate_options WHERE name = safe_cert_name;
    END IF;

    INSERT INTO public.user_certificates (user_id, certificate_id)
    VALUES (target_user_id, cert_id)
    ON CONFLICT DO NOTHING;

    RETURN cert_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_user_certificate(target_user_id UUID, cert_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role TEXT;
BEGIN
    caller_role := public.get_my_role();
    IF caller_role NOT IN ('admin', 'staff', 'manager') THEN
        RAISE EXCEPTION 'Access denied: only staff/admin can remove certificates.';
    END IF;

    DELETE FROM public.user_certificates
    WHERE user_id = target_user_id
      AND certificate_id = cert_id_param;
END;
$$;

-- ------------------------------------------------------------------
-- 3) Harden daily rollover RPC (prevent cross-user abuse)
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.perform_daily_rollover(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    today_date DATE;
    last_active_date DATE;
    target_date DATE;
    source_date DATE;
    source_todo RECORD;
    inserted_count INT := 0;
    caller_role TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    caller_role := public.get_my_role();
    IF auth.uid() <> target_user_id AND caller_role NOT IN ('admin', 'staff', 'manager') THEN
        RAISE EXCEPTION 'Access denied: cannot rollover another user''s todo.';
    END IF;

    today_date := (now() AT TIME ZONE 'Asia/Seoul')::DATE;
    IF (EXTRACT(HOUR FROM (now() AT TIME ZONE 'Asia/Seoul')) < 5) THEN
        today_date := today_date - 1;
    END IF;

    SELECT MAX(date)
    INTO last_active_date
    FROM public.daily_todos
    WHERE user_id = target_user_id;

    IF last_active_date IS NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'No history found');
    END IF;

    IF last_active_date >= today_date THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already up to date');
    END IF;

    target_date := last_active_date + 1;

    WHILE target_date <= today_date LOOP
        source_date := target_date - 1;

        FOR source_todo IN
            SELECT *
            FROM public.daily_todos
            WHERE user_id = target_user_id
              AND date = source_date
              AND is_completed = false
        LOOP
            PERFORM 1
            FROM public.daily_todos
            WHERE user_id = target_user_id
              AND date = target_date
              AND content = source_todo.content;

            IF NOT FOUND THEN
                INSERT INTO public.daily_todos (user_id, content, date, is_completed, created_at, updated_at)
                VALUES (target_user_id, source_todo.content, target_date, false, now(), now());
                inserted_count := inserted_count + 1;
            END IF;
        END LOOP;

        target_date := target_date + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'rolled_over_to', today_date,
        'last_active_was', last_active_date,
        'count', inserted_count
    );
END;
$$;

-- ------------------------------------------------------------------
-- 4) Harden fixed-leave generation RPC
--    - authenticated caller must be staff/admin/manager
--    - internal cron call (no JWT context) is still allowed
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_fixed_leaves(target_start_date DATE, target_end_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    curr_date DATE;
    dow INTEGER;
    req RECORD;
    p INTEGER;
    inserted_count INTEGER := 0;
    caller_role TEXT;
    is_internal_call BOOLEAN := (auth.uid() IS NULL AND auth.role() IS NULL);
BEGIN
    IF NOT is_internal_call THEN
        caller_role := public.get_my_role();
        IF caller_role NOT IN ('admin', 'staff', 'manager') THEN
            RAISE EXCEPTION 'Access denied: only staff/admin can generate fixed leaves.';
        END IF;
    END IF;

    curr_date := target_start_date;
    WHILE curr_date <= target_end_date LOOP
        dow := EXTRACT(DOW FROM curr_date);

        FOR req IN
            SELECT *
            FROM public.fixed_leave_requests
            WHERE day_of_week = dow
        LOOP
            FOREACH p IN ARRAY req.periods
            LOOP
                INSERT INTO public.attendance_logs (user_id, date, period, status)
                VALUES (req.user_id, curr_date, p, req.reason)
                ON CONFLICT (user_id, date, period)
                DO UPDATE SET status = req.reason;

                inserted_count := inserted_count + 1;
            END LOOP;
        END LOOP;

        curr_date := curr_date + 1;
    END LOOP;

    RETURN inserted_count;
END;
$$;

-- ------------------------------------------------------------------
-- 5) Harden signup trigger:
--    - require pending_registrations row
--    - do NOT trust raw_user_meta_data.role for privilege
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pending_id UUID;
    v_name TEXT;
    v_branch TEXT;
    v_role TEXT;
    v_seat_number INTEGER;
    v_selection_1 UUID;
    v_selection_2 UUID;
    v_selection_3 UUID;
    v_memo TEXT;
    v_target_certificate TEXT;
BEGIN
    v_name := btrim(new.raw_user_meta_data->>'name');
    IF v_name IS NULL OR v_name = '' THEN
        RAISE EXCEPTION 'Signup denied: missing name.';
    END IF;

    SELECT
        id,
        branch,
        role,
        seat_number,
        selection_1,
        selection_2,
        selection_3,
        memo,
        target_certificate
    INTO
        v_pending_id,
        v_branch,
        v_role,
        v_seat_number,
        v_selection_1,
        v_selection_2,
        v_selection_3,
        v_memo,
        v_target_certificate
    FROM public.pending_registrations
    WHERE name = v_name
    LIMIT 1;

    IF v_pending_id IS NULL THEN
        RAISE EXCEPTION 'Signup denied: pre-registration record not found.';
    END IF;

    INSERT INTO public.profiles (id, name, branch, role, email, seat_number)
    VALUES (
        new.id,
        v_name,
        COALESCE(v_branch, '망미점'),
        COALESCE(v_role, 'member'),
        new.email,
        v_seat_number
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        branch = COALESCE(public.profiles.branch, EXCLUDED.branch),
        role = COALESCE(public.profiles.role, EXCLUDED.role),
        seat_number = COALESCE(public.profiles.seat_number, EXCLUDED.seat_number);

    IF v_selection_1 IS NOT NULL OR v_selection_2 IS NOT NULL OR v_selection_3 IS NOT NULL THEN
        INSERT INTO public.user_beverage_selections (user_id, selection_1, selection_2, selection_3)
        VALUES (new.id, v_selection_1, v_selection_2, v_selection_3)
        ON CONFLICT (user_id) DO UPDATE
        SET
            selection_1 = EXCLUDED.selection_1,
            selection_2 = EXCLUDED.selection_2,
            selection_3 = EXCLUDED.selection_3;
    END IF;

    IF v_memo IS NOT NULL AND btrim(v_memo) <> '' THEN
        INSERT INTO public.member_memos (user_id, content)
        VALUES (new.id, v_memo);
    END IF;

    IF v_target_certificate IS NOT NULL AND btrim(v_target_certificate) <> '' THEN
        PERFORM public.assign_user_certificate(new.id, v_target_certificate);
    END IF;

    DELETE FROM public.pending_registrations WHERE id = v_pending_id;

    RETURN new;
END;
$$;

-- ------------------------------------------------------------------
-- 6) Tighten RLS/GRANT for sensitive tables
-- ------------------------------------------------------------------

-- incoming_employees
DO $$
DECLARE p RECORD;
BEGIN
    FOR p IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'incoming_employees'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.incoming_employees', p.policyname);
    END LOOP;
END $$;

ALTER TABLE public.incoming_employees ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.incoming_employees FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.incoming_employees TO authenticated;

CREATE POLICY incoming_employees_select_staff_admin
ON public.incoming_employees
FOR SELECT
USING (public.get_my_role() IN ('admin', 'staff', 'manager'));

CREATE POLICY incoming_employees_insert_staff_admin
ON public.incoming_employees
FOR INSERT
WITH CHECK (public.get_my_role() IN ('admin', 'staff', 'manager'));

CREATE POLICY incoming_employees_update_staff_admin
ON public.incoming_employees
FOR UPDATE
USING (public.get_my_role() IN ('admin', 'staff', 'manager'))
WITH CHECK (public.get_my_role() IN ('admin', 'staff', 'manager'));

CREATE POLICY incoming_employees_delete_staff_admin
ON public.incoming_employees
FOR DELETE
USING (public.get_my_role() IN ('admin', 'staff', 'manager'));

-- attendance_memos
DO $$
DECLARE p RECORD;
BEGIN
    FOR p IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'attendance_memos'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.attendance_memos', p.policyname);
    END LOOP;
END $$;

ALTER TABLE public.attendance_memos ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.attendance_memos TO authenticated;

CREATE POLICY attendance_memos_select_staff_admin
ON public.attendance_memos
FOR SELECT
USING (public.get_my_role() IN ('admin', 'staff', 'manager'));

CREATE POLICY attendance_memos_insert_staff_admin
ON public.attendance_memos
FOR INSERT
WITH CHECK (public.get_my_role() IN ('admin', 'staff', 'manager'));

CREATE POLICY attendance_memos_update_staff_admin
ON public.attendance_memos
FOR UPDATE
USING (public.get_my_role() IN ('admin', 'staff', 'manager'))
WITH CHECK (public.get_my_role() IN ('admin', 'staff', 'manager'));

CREATE POLICY attendance_memos_delete_staff_admin
ON public.attendance_memos
FOR DELETE
USING (public.get_my_role() IN ('admin', 'staff', 'manager'));

-- member_memos
DO $$
DECLARE p RECORD;
BEGIN
    FOR p IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'member_memos'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.member_memos', p.policyname);
    END LOOP;
END $$;

ALTER TABLE public.member_memos ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.member_memos TO authenticated;

CREATE POLICY member_memos_select_staff_admin
ON public.member_memos
FOR SELECT
USING (public.get_my_role() IN ('admin', 'staff', 'manager'));

CREATE POLICY member_memos_insert_staff_admin
ON public.member_memos
FOR INSERT
WITH CHECK (public.get_my_role() IN ('admin', 'staff', 'manager'));

CREATE POLICY member_memos_update_staff_admin
ON public.member_memos
FOR UPDATE
USING (public.get_my_role() IN ('admin', 'staff', 'manager'))
WITH CHECK (public.get_my_role() IN ('admin', 'staff', 'manager'));

CREATE POLICY member_memos_delete_staff_admin
ON public.member_memos
FOR DELETE
USING (public.get_my_role() IN ('admin', 'staff', 'manager'));

-- attendance_logs
DO $$
DECLARE p RECORD;
BEGIN
    FOR p IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'attendance_logs'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.attendance_logs', p.policyname);
    END LOOP;
END $$;

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.attendance_logs TO authenticated;

CREATE POLICY attendance_logs_select_own_or_staff_admin
ON public.attendance_logs
FOR SELECT
USING (
    auth.uid() = user_id
    OR public.get_my_role() IN ('admin', 'staff', 'manager')
);

CREATE POLICY attendance_logs_insert_own_or_staff_admin
ON public.attendance_logs
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    OR public.get_my_role() IN ('admin', 'staff', 'manager')
);

CREATE POLICY attendance_logs_update_own_or_staff_admin
ON public.attendance_logs
FOR UPDATE
USING (
    auth.uid() = user_id
    OR public.get_my_role() IN ('admin', 'staff', 'manager')
)
WITH CHECK (
    auth.uid() = user_id
    OR public.get_my_role() IN ('admin', 'staff', 'manager')
);

CREATE POLICY attendance_logs_delete_own_or_staff_admin
ON public.attendance_logs
FOR DELETE
USING (
    auth.uid() = user_id
    OR public.get_my_role() IN ('admin', 'staff', 'manager')
);

-- ------------------------------------------------------------------
-- 7) Function execute grants (defensive)
-- ------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.update_employee_info(UUID, TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_employee_info(UUID, TEXT, TEXT, INTEGER) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.assign_user_certificate(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_user_certificate(UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.remove_user_certificate(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_user_certificate(UUID, UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.perform_daily_rollover(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.perform_daily_rollover(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_fixed_leaves(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_fixed_leaves(DATE, DATE) TO authenticated;

DO $$
BEGIN
    IF to_regprocedure('public.complete_registration(text)') IS NOT NULL THEN
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.complete_registration(text) FROM PUBLIC, anon, authenticated';
    END IF;
END $$;

COMMIT;

