-- Allow Admins to View All Vacation Requests
-- This policy should be added to the supabase SQL editor

-- 1. Drop the policy if it already exists to avoid conflict
DROP POLICY IF EXISTS "Admins can view all vacation requests" ON public.vacation_requests;

-- 2. Create the policy
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
