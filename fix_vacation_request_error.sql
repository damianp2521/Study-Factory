-- 0. Ensure 'email' column exists in profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 1. Fix Missing Profiles for Existing Users
-- (This fixes the immediate issue for the user who can't apply)
INSERT INTO public.profiles (id, name, branch, role, email)
SELECT 
  id, 
  raw_user_meta_data->>'name', 
  raw_user_meta_data->>'branch', 
  COALESCE(raw_user_meta_data->>'role', 'member'),
  email
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 2. Create/Update Trigger to Automate Profile Creation for Future Users
-- This ensures that when a new user signs up, a profile is automatically created in public.profiles.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, branch, role, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'branch',
    COALESCE(new.raw_user_meta_data->>'role', 'member'),
    new.email
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email; -- Update email if it changed
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to recreate it freshly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Ensure Vacation Requests RLS and Permissions are Correct
-- Verify table exists and permissions are granted
GRANT ALL ON public.vacation_requests TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- Ensure an INSERT policy exists for vacation_requests
DROP POLICY IF EXISTS "Users can insert their own requests" ON vacation_requests;
CREATE POLICY "Users can insert their own requests"
ON vacation_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Ensure a SELECT policy exists (so they can see what they inserted)
DROP POLICY IF EXISTS "Users can view their own requests" ON vacation_requests;
CREATE POLICY "Users can view their own requests"
ON vacation_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- (Optional) If Managers need to see requests, you might need a broader SELECT policy
-- But for now let's fix the Insert issue.
