-- RESTORE authorized_users TABLE to fix "Cannot insert into view" error.
-- This script transforms the current 'View' back into a real 'Table' to support Pre-registration.

-- 1. Backup existing Registered Users (from Auth + Profiles)
CREATE TEMP TABLE backup_registered_users AS 
SELECT 
    p.name, 
    p.branch, 
    p.role, 
    au.created_at,
    true as is_registered
FROM auth.users au
JOIN public.profiles p ON au.id = p.id;

-- 2. Drop the View (if it exists)
DROP VIEW IF EXISTS public.authorized_users;

-- 3. Create the Table
CREATE TABLE IF NOT EXISTS public.authorized_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    branch TEXT,
    role TEXT DEFAULT 'member',
    is_registered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure names are unique for lookup
    CONSTRAINT authorized_users_name_key UNIQUE (name)
);

-- 4. Restore Registered Users into the Table
-- converting conflicts (if any name duplicates exist, we skip or update)
INSERT INTO public.authorized_users (name, branch, role, is_registered, created_at)
SELECT name, branch, role, is_registered, created_at
FROM backup_registered_users
ON CONFLICT (name) DO UPDATE 
SET 
  branch = EXCLUDED.branch,
  role = EXCLUDED.role,
  is_registered = EXCLUDED.is_registered;

-- 5. Create Helper Function: mark_user_registered
-- Called by Login.jsx after successful sign-up
CREATE OR REPLACE FUNCTION public.mark_user_registered(user_name TEXT) 
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  UPDATE public.authorized_users
  SET 
    is_registered = true,
    updated_at = NOW()
  WHERE name = user_name;
END;
$$;

-- 6. Grant Permissions (Assuming anon/authenticated roles need access)
ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;

-- Allow Admins full access
CREATE POLICY "Admins can do everything on authorized_users" 
ON public.authorized_users 
FOR ALL 
TO authenticated 
USING (public.get_my_role() = 'admin') 
WITH CHECK (public.get_my_role() = 'admin');

-- Allow Public/Anon to READ (needed for Login check)
CREATE POLICY "Anyone can read authorized_users" 
ON public.authorized_users 
FOR SELECT 
TO public 
USING (true);

-- Clean up
DROP TABLE backup_registered_users;
