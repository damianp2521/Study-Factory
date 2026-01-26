-- Fix RLS policies for user_beverage_selections to ensure Staff can Upsert
-- This script drops existing policies and re-creates them to facilitate upsert (insert + update) permissions.

-- 1. Enable RLS (just in case)
ALTER TABLE user_beverage_selections ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies to start fresh
DROP POLICY IF EXISTS "Enable insert for staff and admin" ON user_beverage_selections;
DROP POLICY IF EXISTS "Enable update for staff and admin" ON user_beverage_selections;
DROP POLICY IF EXISTS "Enable upsert for staff and admin" ON user_beverage_selections;
-- Also drop policies that might have different names but same purpose
DROP POLICY IF EXISTS "Staff can insert selections" ON user_beverage_selections;
DROP POLICY IF EXISTS "Staff can update selections" ON user_beverage_selections;

-- 3. Create Policy for INSERT (Check auth user role)
CREATE POLICY "Enable insert for staff and admin" ON user_beverage_selections
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
    );

-- 4. Create Policy for UPDATE (Check auth user role)
-- Use 'USING' to determine if the row can be updated (based on who is DOING the update, not owning the row)
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

-- 5. Ensure SELECT is clear
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON user_beverage_selections;
CREATE POLICY "Enable read access for all authenticated users" ON user_beverage_selections
    FOR SELECT USING (auth.role() = 'authenticated');

-- 6. Verify beverage_options policies too (just in case specific logic relies on options)
ALTER TABLE beverage_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable insert for staff and admin" ON beverage_options;
DROP POLICY IF EXISTS "Enable delete for staff and admin" ON beverage_options;

CREATE POLICY "Enable insert for staff and admin" ON beverage_options
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
    );

CREATE POLICY "Enable delete for staff and admin" ON beverage_options
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
    );
