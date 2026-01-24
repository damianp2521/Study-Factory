-- FIX: Re-link beverage selections to new authorized_users IDs
-- The user_beverage_selections table has old user_ids that don't match new authorized_users

-- Option 1: If profiles table still has the original user IDs and beverage selection was linked to profiles
-- Check if user_beverage_selections.user_id matches profiles.id

-- First, let's check what data exists:
-- SELECT * FROM user_beverage_selections LIMIT 10;
-- SELECT id, name FROM authorized_users LIMIT 10;
-- SELECT id, name FROM profiles LIMIT 10;

-- If user_beverage_selections.user_id matches profiles.id, then we need to update the code
-- to use profiles instead of authorized_users for beverage functionality

-- OR we need to update user_beverage_selections to use the new authorized_users.id

-- STEP 1: Add a temp column to track the update
-- STEP 2: Update user_beverage_selections.user_id to match new authorized_users.id via name matching

-- This assumes that authorized_users.name matches profiles.name and 
-- user_beverage_selections.user_id originally pointed to profiles.id

UPDATE user_beverage_selections ubs
SET user_id = au.id
FROM profiles p
JOIN authorized_users au ON au.name = p.name
WHERE ubs.user_id = p.id;

-- After running, verify:
-- SELECT ubs.*, au.name 
-- FROM user_beverage_selections ubs 
-- JOIN authorized_users au ON ubs.user_id = au.id 
-- LIMIT 10;
