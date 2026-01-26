
-- Allow Admins/Managers to insert vacation requests for ANY user
-- Also ensure they can see them.

-- 1. Insert Policy for Admins
DROP POLICY IF EXISTS "Admins can insert any vacation request" ON public.vacation_requests;
CREATE POLICY "Admins can insert any vacation request"
ON public.vacation_requests FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- 2. Select Policy for Admins (if not already there)
DROP POLICY IF EXISTS "Admins can view all vacation requests" ON public.vacation_requests;
CREATE POLICY "Admins can view all vacation requests"
ON public.vacation_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- 3. Update Policy for Admins (in case they need to approve/modify)
DROP POLICY IF EXISTS "Admins can update all vacation requests" ON public.vacation_requests;
CREATE POLICY "Admins can update all vacation requests"
ON public.vacation_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- 4. Delete Policy for Admins
DROP POLICY IF EXISTS "Admins can delete all vacation requests" ON public.vacation_requests;
CREATE POLICY "Admins can delete all vacation requests"
ON public.vacation_requests FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);
