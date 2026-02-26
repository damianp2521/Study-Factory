-- Fix signup failure when pending registration has target_certificate.
-- Root cause:
-- - public.handle_new_user() called public.assign_user_certificate()
-- - assign_user_certificate() now enforces caller role (admin/staff/manager)
-- - Signup trigger runs without an authenticated profile role, so it raised
--   "Access denied" and signUp failed with "Database error saving new user".

BEGIN;

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
    v_meta_branch TEXT;
    v_cert_id UUID;
BEGIN
    v_name := btrim(new.raw_user_meta_data->>'name');
    v_meta_branch := btrim(new.raw_user_meta_data->>'branch');

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
      AND (
        v_meta_branch IS NULL
        OR v_meta_branch = ''
        OR branch = v_meta_branch
      )
    ORDER BY
      CASE
        WHEN v_meta_branch IS NOT NULL
             AND v_meta_branch <> ''
             AND branch = v_meta_branch THEN 0
        ELSE 1
      END,
      created_at DESC
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

    -- Do NOT call assign_user_certificate() here.
    -- That RPC enforces caller role and can fail inside signup trigger context.
    IF v_target_certificate IS NOT NULL AND btrim(v_target_certificate) <> '' THEN
        INSERT INTO public.certificate_options (name)
        VALUES (btrim(v_target_certificate))
        ON CONFLICT (name) DO UPDATE
        SET name = EXCLUDED.name
        RETURNING id INTO v_cert_id;

        IF v_cert_id IS NULL THEN
            SELECT id
            INTO v_cert_id
            FROM public.certificate_options
            WHERE name = btrim(v_target_certificate)
            LIMIT 1;
        END IF;

        IF v_cert_id IS NOT NULL THEN
            INSERT INTO public.user_certificates (user_id, certificate_id)
            VALUES (new.id, v_cert_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    DELETE FROM public.pending_registrations
    WHERE id = v_pending_id;

    RETURN new;
END;
$$;

COMMIT;
