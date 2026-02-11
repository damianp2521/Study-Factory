-- 1. Add linked_user_id column to pending_registrations
ALTER TABLE public.pending_registrations
ADD COLUMN IF NOT EXISTS linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Update handle_new_user trigger function
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
    v_pending_id UUID;
BEGIN
    v_name := new.raw_user_meta_data->>'name';
    
    -- 1. Get info from pending_registrations
    SELECT 
        id,
        branch, 
        role, 
        seat_number, 
        selection_1, 
        selection_2, 
        selection_3, 
        memo
    INTO 
        v_pending_id,
        v_branch, 
        v_role, 
        v_seat_number, 
        v_selection_1, 
        v_selection_2, 
        v_selection_3, 
        v_memo
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

    -- 5. LINK pending_registrations instead of DELETING
    IF v_pending_id IS NOT NULL THEN
        UPDATE public.pending_registrations 
        SET linked_user_id = new.id 
        WHERE id = v_pending_id;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
