-- Allow Admins to View All Vacation Requests
-- This policy should be added to the supabase SQL editor

-- 1. Check existing policies (optional, for reference)
-- select * from pg_policies where table_name = 'vacation_requests';

-- 2. Drop existing restrictive policy if strictly necessary, 
--    BUT usually we just ADD a new permissive policy for Admins.
--    (Assuming existing policy is "Users can see own")

CREATE POLICY "Admins can view all vacation requests"
ON public.vacation_requests
FOR SELECT
TO authenticated
USING (
  exists (
    select 1 from public.authorized_users
    where id = auth.uid() and role = 'admin'
  )
);

-- Note: Ensure RLS is enabled
ALTER TABLE public.vacation_requests ENABLE ROW LEVEL SECURITY;
