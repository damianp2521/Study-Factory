-- ALL-IN-ONE FIX SCRIPT (UPDATED)
-- 1. Fix RLS for Beverage Selections
-- 2. ROBUSTLY Drop and Re-create Authorized Users View (handling if it's currently a table)

BEGIN;

-- === 1. BEVERAGE RLS FIX ===
ALTER TABLE user_beverage_selections ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Enable insert for staff and admin" ON user_beverage_selections;
DROP POLICY IF EXISTS "Enable update for staff and admin" ON user_beverage_selections;
DROP POLICY IF EXISTS "Enable upsert for staff and admin" ON user_beverage_selections;
DROP POLICY IF EXISTS "Staff can insert selections" ON user_beverage_selections;
DROP POLICY IF EXISTS "Staff can update selections" ON user_beverage_selections;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON user_beverage_selections;

-- Create Policies
CREATE POLICY "Enable insert for staff and admin" ON user_beverage_selections
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
    );

CREATE POLICY "Enable update for staff and admin" ON user_beverage_selections
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
    );

CREATE POLICY "Enable read access for all authenticated users" ON user_beverage_selections
    FOR SELECT USING (auth.role() = 'authenticated');

COMMIT;

-- === 2. AUTHORIZED USERS VIEW FIX (Robust Drop) ===
-- We use a DO block to securely check if it is a Table or a View and drop accordingly.
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

-- Re-create the view
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
