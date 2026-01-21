-- Create attendance_logs table
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    period INTEGER NOT NULL CHECK (period >= 1 AND period <= 7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date, period)
);

-- Enable RLS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Read: Everyone can read (for shared dashboard/status)
CREATE POLICY "Everyone can read attendance" ON public.attendance_logs
    FOR SELECT USING (true);

-- 2. Insert: Authenticated users (Staff/Admin) can insert
CREATE POLICY "Staff/Admin can insert attendance" ON public.attendance_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Delete: Authenticated users can delete
CREATE POLICY "Staff/Admin can delete attendance" ON public.attendance_logs
    FOR DELETE USING (auth.role() = 'authenticated');
