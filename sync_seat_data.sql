-- SYNC seat_number from profiles to authorized_users
-- This restores seat data that was lost during the pre-registration schema update

-- 1. First, ensure the seat_number column exists
ALTER TABLE public.authorized_users 
ADD COLUMN IF NOT EXISTS seat_number INTEGER;

-- 2. Update authorized_users with seat_number from profiles
-- Matching by name since that's our unique identifier
UPDATE public.authorized_users au
SET seat_number = p.seat_number
FROM public.profiles p
WHERE au.name = p.name
AND p.seat_number IS NOT NULL;

-- 3. Verify the sync worked (check a few rows)
-- Run this to see results:
-- SELECT name, seat_number, branch FROM public.authorized_users WHERE seat_number IS NOT NULL;
