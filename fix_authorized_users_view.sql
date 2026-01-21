-- 1. Robustly drop authorized_users (checks if it's a table or view)
DO $$ 
DECLARE
    rel_kind "char";
BEGIN 
    SELECT relkind INTO rel_kind FROM pg_class WHERE relname = 'authorized_users' AND relnamespace = 'public'::regnamespace;
    
    IF rel_kind = 'v' THEN
        DROP VIEW public.authorized_users CASCADE;
    ELSIF rel_kind = 'r' THEN
        DROP TABLE public.authorized_users CASCADE;
    END IF; 
END $$;

-- 2. Add columns to profiles table safely
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS seat_number INTEGER;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Recreate the authorized_users VIEW correctly
CREATE OR REPLACE VIEW public.authorized_users AS
SELECT
    au.id,
    p.name,
    p.branch,
    p.role,
    p.seat_number,
    au.email,
    au.created_at
FROM auth.users au
JOIN public.profiles p ON au.id = p.id;

-- 4. Update the update_employee_info RPC function
CREATE OR REPLACE FUNCTION public.update_employee_info(
    target_id UUID,
    new_branch TEXT,
    new_role TEXT,
    new_seat_number INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Update profiles with the new seat number and updated_at
    UPDATE public.profiles
    SET
        branch = new_branch,
        role = new_role,
        seat_number = new_seat_number,
        updated_at = NOW()
    WHERE id = target_id;

    -- Update metadata for session sync
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
