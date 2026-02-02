-- 1. Add is_public_todo to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_public_todo BOOLEAN DEFAULT FALSE;

-- 2. Update authorized_users View to include is_public_todo
DROP VIEW IF EXISTS public.authorized_users CASCADE;

CREATE OR REPLACE VIEW public.authorized_users AS
SELECT
    au.id,
    p.name,
    p.branch,
    p.role,
    p.seat_number,
    p.is_public_todo,
    au.email,
    au.created_at
FROM auth.users au
JOIN public.profiles p ON au.id = p.id;

-- 3. Create Daily Todos Table
CREATE TABLE IF NOT EXISTS public.daily_todos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    date DATE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.daily_todos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_todos
CREATE POLICY "Users can manage their own todos" 
ON public.daily_todos
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view public todos of others" 
ON public.daily_todos
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = daily_todos.user_id 
        AND is_public_todo = true
    )
);

-- 4. Create Certificate Options Table
CREATE TABLE IF NOT EXISTS public.certificate_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.certificate_options ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read certificates
CREATE POLICY "Everyone can read certificate options" 
ON public.certificate_options FOR SELECT USING (true);

-- Allow authenticated users to add certificates (for flexibility, or restrict to admin via RPC if preferred, but open is easier for now)
CREATE POLICY "Authenticated users can add certificate options" 
ON public.certificate_options FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 5. Create User Certificates Table
CREATE TABLE IF NOT EXISTS public.user_certificates (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    certificate_id UUID REFERENCES public.certificate_options(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, certificate_id)
);

ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_certificates
CREATE POLICY "Everyone can view user certificates" 
ON public.user_certificates FOR SELECT USING (true);

-- Only Admins/Staff can manage user certificates
-- (Assuming 'admin' or 'staff' role check found in profiles or metadata.
--  For simplicity, we'll use a policy that checks the `authorized_users` view or similar.)

CREATE POLICY "Admins and Staff can manage user certificates" 
ON public.user_certificates
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'staff', 'manager') -- Adjust roles as per your system
    )
);

-- 6. RPC to Toggle Public Visibility
CREATE OR REPLACE FUNCTION toggle_todo_visibility(target_value BOOLEAN)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET is_public_todo = target_value
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC to Add User Certificate (Helper for Admin)
CREATE OR REPLACE FUNCTION assign_user_certificate(target_user_id UUID, cert_name TEXT)
RETURNS UUID AS $$
DECLARE
    cert_id UUID;
BEGIN
    -- Get or Create Certificate
    INSERT INTO public.certificate_options (name)
    VALUES (cert_name)
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name -- Dummy update to return ID
    RETURNING id INTO cert_id;
    
    -- If not returned (existed), fetch it
    IF cert_id IS NULL THEN
        SELECT id INTO cert_id FROM public.certificate_options WHERE name = cert_name;
    END IF;

    -- Assign to User
    INSERT INTO public.user_certificates (user_id, certificate_id)
    VALUES (target_user_id, cert_id)
    ON CONFLICT DO NOTHING;

    RETURN cert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC to Remove User Certificate
CREATE OR REPLACE FUNCTION remove_user_certificate(target_user_id UUID, cert_id_param UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.user_certificates
    WHERE user_id = target_user_id AND certificate_id = cert_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
