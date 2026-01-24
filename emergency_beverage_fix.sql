-- RECOVERY SCRIPT: Restore ID mapping and Beverage Selections
-- This script fixes the "Split Brain" ID issue by matching authorized_users.id back to profiles.id

-- 1. Ensure seat_number exists in authorized_users (just in case)
ALTER TABLE public.authorized_users ADD COLUMN IF NOT EXISTS seat_number INTEGER;

-- 2. Create a mapping table to avoid updating Primary Keys in place immediately
CREATE TEMP TABLE user_recovery_map AS
SELECT 
    au.id as old_id,
    p.id as permanent_id,
    au.name
FROM public.authorized_users au
JOIN public.profiles p ON au.name = p.name
WHERE au.is_registered = true;

-- 3. Delete registered users from authorized_users and RE-INSERT them with CORRECT IDs
-- This is much safer than trying to UPDATE Primary Keys while they are in use.

-- First, back up the current authorized_users data for these people
CREATE TEMP TABLE au_backup AS 
SELECT * FROM public.authorized_users 
WHERE name IN (SELECT name FROM user_recovery_map);

-- Delete them from authorized_users
DELETE FROM public.authorized_users 
WHERE name IN (SELECT name FROM user_recovery_map);

-- Re-insert them with IDs from profiles
INSERT INTO public.authorized_users (id, name, branch, role, is_registered, seat_number, created_at, updated_at)
SELECT 
    m.permanent_id,
    b.name,
    b.branch,
    b.role,
    b.is_registered,
    b.seat_number,
    b.created_at,
    b.updated_at
FROM au_backup b
JOIN user_recovery_map m ON b.name = m.name;

-- 4. Sync seat_number from profiles (last catch-all)
UPDATE public.authorized_users au
SET seat_number = p.seat_number
FROM public.profiles p
WHERE au.name = p.name
AND p.seat_number IS NOT NULL;

-- 5. Logic check:
-- Now authorized_users.id === profiles.id for all registered users.
-- user_beverage_selections (which points to profiles.id) should now properly JOIN.

-- Verification query (Run manually in SQL Editor):
-- SELECT au.name, au.seat_number, ubs.selection_1 
-- FROM authorized_users au 
-- JOIN user_beverage_selections ubs ON au.id = ubs.user_id 
-- LIMIT 10;
