-- FINAL FIX: Synchronize IDs between authorized_users and profiles
-- This ensures that user_beverage_selections (linked to profiles.id) 
-- work correctly with authorized_users.

-- 1. Create a Mapping Temp Table
CREATE TEMP TABLE user_id_mapping AS
SELECT 
    au.name,
    au.id as old_authorized_id,
    p.id as permanent_profile_id
FROM public.authorized_users au
JOIN public.profiles p ON au.name = p.name
WHERE au.is_registered = true;

-- 2. Update authorized_users IDs to match profiles IDs
-- We need to do this carefully because ID is a PRIMARY KEY
-- First, update related records if any (not needed yet as we just made the table)
-- Then, update the IDs in authorized_users

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM user_id_mapping LOOP
        -- If IDs are already the same, skip
        IF r.old_authorized_id != r.permanent_profile_id THEN
            -- Update the ID (requires temp disabling FKs or doing it in a specific order)
            -- But since authorized_users is a standalone table right now:
            UPDATE public.authorized_users
            SET id = r.permanent_profile_id
            WHERE id = r.old_authorized_id;
        END IF;
    END LOOP;
END $$;

-- 3. Restore Beverages UI to use authorized_users
-- This ensures new pre-registered users (who don't have profiles yet)
-- can still have beverages assigned.

-- Note: user_beverage_selections table is currently linked to profiles.id.
-- Once we sync authorized_users.id = profiles.id, the JS code
-- can query user_beverage_selections using the IDs from authorized_users.

-- Clean up
DROP TABLE user_id_mapping;
