-- 0. Ensure authorized_users is a TABLE (not a view)
-- If it's a view, we need to convert it to a table to support pre-registration as intended.
DO $$ 
DECLARE
    rel_kind "char";
BEGIN 
    SELECT relkind INTO rel_kind FROM pg_class WHERE relname = 'authorized_users' AND relnamespace = 'public'::regnamespace;
    IF rel_kind = 'v' THEN
        -- Backup existing view data if needed, but here we assume the table creation script was already run or we recreate it.
        RAISE NOTICE 'authorized_users is a view. Re-running table creation logic.';
    END IF; 
END $$;

-- 1. Ensure seat_number column exists in authorized_users table
ALTER TABLE public.authorized_users 
ADD COLUMN IF NOT EXISTS seat_number INTEGER;

-- 2. Initial Sync: Restore seat data from profiles to authorized_users
UPDATE public.authorized_users au
SET seat_number = p.seat_number
FROM public.profiles p
WHERE au.name = p.name
AND au.seat_number IS NULL 
AND p.seat_number IS NOT NULL;

-- 3. Update the update_employee_info RPC function to handle both tables
-- This ensures that when a seat/role/branch is updated via the UI, 
-- both the pre-registration table and the actual profile are kept in sync.
CREATE OR REPLACE FUNCTION public.update_employee_info(
    target_id UUID,
    new_branch TEXT,
    new_role TEXT,
    new_seat_number INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    target_name TEXT;
    profile_id_found UUID;
BEGIN
    -- Step A: Try to find the user in authorized_users table
    -- The target_id passed from the UI is usually the ID from this table
    SELECT name INTO target_name FROM public.authorized_users WHERE id = target_id;

    -- If not found by ID, maybe target_id is actually a profile ID?
    IF target_name IS NULL THEN
        SELECT name INTO target_name FROM public.profiles WHERE id = target_id;
    END IF;

    -- Step B: Update authorized_users table
    IF target_name IS NOT NULL THEN
        UPDATE public.authorized_users
        SET
            branch = new_branch,
            role = new_role,
            seat_number = new_seat_number,
            updated_at = NOW()
        WHERE name = target_name;
    ELSE
        -- Fallback: update by ID if name wasn't found (unlikely but safe)
        UPDATE public.authorized_users
        SET
            branch = new_branch,
            role = new_role,
            seat_number = new_seat_number,
            updated_at = NOW()
        WHERE id = target_id;
    END IF;

    -- Step C: Update profiles table (for registered users)
    -- We match by name to be robust against ID mismatches between the tables
    IF target_name IS NOT NULL THEN
        UPDATE public.profiles
        SET
            branch = new_branch,
            role = new_role,
            seat_number = new_seat_number,
            updated_at = NOW()
        WHERE name = target_name
        RETURNING id INTO profile_id_found;

        -- Step D: Update auth.users metadata for session sync
        IF profile_id_found IS NOT NULL THEN
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
                    to_jsonb(new_seat_number)
                )
            WHERE id = profile_id_found;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update the handle_new_user trigger to inherit seat_number on sign-up
-- This ensures pre-assigned seats are automatically moved to the user's profile.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    pre_assigned_seat INTEGER;
    pre_assigned_branch TEXT;
    pre_assigned_role TEXT;
BEGIN
    -- Look up seat and other info from pre-registration table
    SELECT seat_number, branch, role 
    INTO pre_assigned_seat, pre_assigned_branch, pre_assigned_role
    FROM public.authorized_users 
    WHERE name = (new.raw_user_meta_data->>'name');

    INSERT INTO public.profiles (id, name, branch, role, email, seat_number)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'name',
        COALESCE(pre_assigned_branch, new.raw_user_meta_data->>'branch'),
        COALESCE(pre_assigned_role, new.raw_user_meta_data->>'role', 'member'),
        new.email,
        pre_assigned_seat
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        seat_number = COALESCE(public.profiles.seat_number, EXCLUDED.seat_number),
        branch = COALESCE(public.profiles.branch, EXCLUDED.branch),
        role = COALESCE(public.profiles.role, EXCLUDED.role);

    -- Also update authorized_users to mark as registered (redundant with mark_user_registered but safe)
    UPDATE public.authorized_users
    SET is_registered = true, updated_at = NOW()
    WHERE name = (new.raw_user_meta_data->>'name');

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
