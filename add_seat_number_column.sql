-- 1. Add seat_number column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS seat_number INTEGER;

-- 2. Update the authorized_users view to include seat_number
CREATE OR REPLACE VIEW public.authorized_users AS
SELECT
    au.id,
    p.name,
    p.branch,
    p.role,
    p.seat_number, -- Added seat_number
    au.email,
    au.created_at
FROM auth.users au
JOIN public.profiles p ON au.id = p.id;

-- 3. Update the update_employee_info RPC function to accept and update seat_number
CREATE OR REPLACE FUNCTION public.update_employee_info(
    target_id UUID,
    new_branch TEXT,
    new_role TEXT,
    new_seat_number INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Update profiles with the new seat number
    UPDATE public.profiles
    SET
        branch = new_branch,
        role = new_role,
        seat_number = new_seat_number,
        updated_at = NOW()
    WHERE id = target_id;

    -- Update metadata (optional, usually for session role/branch syncing)
    UPDATE auth.users
    SET raw_user_meta_data = 
        jsonb_set(
            jsonb_set(
                COALESCE(raw_user_meta_data, '{}'::jsonb),
                '{role}',
                to_jsonb(new_role)
            ),
            '{branch}',
            to_jsonb(new_branch)
        )
    WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
