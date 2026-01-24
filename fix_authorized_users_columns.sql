-- FIX: Add missing columns to authorized_users table
-- The pre-registration schema fix removed seat_number column
-- This script adds it back

-- 1. Add seat_number column if it doesn't exist
ALTER TABLE public.authorized_users 
ADD COLUMN IF NOT EXISTS seat_number INTEGER;

-- 2. Allow Staff to manage (for seat/beverage management)
-- Update existing policy or create new one
DROP POLICY IF EXISTS "Staff can read authorized_users" ON public.authorized_users;
DROP POLICY IF EXISTS "Staff can update authorized_users" ON public.authorized_users;

CREATE POLICY "Staff can read authorized_users" 
ON public.authorized_users 
FOR SELECT 
TO authenticated 
USING (public.get_my_role() IN ('staff', 'admin'));

CREATE POLICY "Staff can update authorized_users" 
ON public.authorized_users 
FOR UPDATE 
TO authenticated 
USING (public.get_my_role() IN ('staff', 'admin'))
WITH CHECK (public.get_my_role() IN ('staff', 'admin'));

-- 3. Verify the table structure (run SELECT to check)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'authorized_users';
