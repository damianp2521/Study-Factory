-- Update handle_new_user trigger function to transfer target_certificate
-- This adds certificate transfer functionality to the existing trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_branch TEXT;
    v_role TEXT;
    v_seat_number INTEGER;
    v_selection_1 UUID;
    v_selection_2 UUID;
    v_selection_3 UUID;
    v_memo TEXT;
    v_name TEXT;
    v_target_certificate TEXT;
BEGIN
    v_name := new.raw_user_meta_data->>'name';
    
    -- 1. Get info from pending_registrations (including target_certificate)
    SELECT 
        branch, 
        role, 
        seat_number, 
        selection_1, 
        selection_2, 
        selection_3, 
        memo,
        target_certificate
    INTO 
        v_branch, 
        v_role, 
        v_seat_number, 
        v_selection_1, 
        v_selection_2, 
        v_selection_3, 
        v_memo,
        v_target_certificate
    FROM public.pending_registrations 
    WHERE name = v_name;

    -- 2. Insert into profiles with seat_number
    INSERT INTO public.profiles (
        id, 
        name, 
        branch, 
        role, 
        email, 
        seat_number
    )
    VALUES (
        new.id,
        v_name,
        COALESCE(v_branch, new.raw_user_meta_data->>'branch', '망미점'),
        COALESCE(v_role, new.raw_user_meta_data->>'role', 'member'),
        new.email,
        v_seat_number
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        branch = COALESCE(public.profiles.branch, EXCLUDED.branch),
        role = COALESCE(public.profiles.role, EXCLUDED.role),
        seat_number = COALESCE(public.profiles.seat_number, EXCLUDED.seat_number);

    -- 3. Insert Beverage Selections (only if pending selections exist)
    IF v_selection_1 IS NOT NULL OR v_selection_2 IS NOT NULL OR v_selection_3 IS NOT NULL THEN
        INSERT INTO public.user_beverage_selections (
            user_id, 
            selection_1, 
            selection_2, 
            selection_3
        )
        VALUES (
            new.id, 
            v_selection_1, 
            v_selection_2, 
            v_selection_3
        )
        ON CONFLICT (user_id) DO UPDATE
        SET
            selection_1 = EXCLUDED.selection_1,
            selection_2 = EXCLUDED.selection_2,
            selection_3 = EXCLUDED.selection_3;
    END IF;

    -- 4. Insert Memo
    IF v_memo IS NOT NULL AND v_memo != '' THEN
        INSERT INTO public.member_memos (user_id, content)
        VALUES (new.id, v_memo);
    END IF;

    -- 5. Insert Target Certificate (if exists)
    IF v_target_certificate IS NOT NULL AND v_target_certificate != '' THEN
        -- Use assign_user_certificate RPC to add the certificate
        PERFORM public.assign_user_certificate(new.id, v_target_certificate);
    END IF;

    -- 6. Delete from pending_registrations
    IF v_name IS NOT NULL THEN
        DELETE FROM public.pending_registrations WHERE name = v_name;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
