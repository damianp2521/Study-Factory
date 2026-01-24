-- Create tables for Staff Work Schedule

-- 1. Table for available staff names per branch (for the assignment dropdowns)
CREATE TABLE IF NOT EXISTS public.branch_staff_names (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch, staff_name)
);

-- 2. Table for the actual weekly assignments
-- Simplified: 1 row per slot (Day x Shift x Role)
CREATE TABLE IF NOT EXISTS public.staff_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch TEXT NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    shift TEXT NOT NULL CHECK (shift IN ('morning', 'afternoon')),
    role TEXT NOT NULL CHECK (role IN ('dish', 'sub')),
    staff_name TEXT DEFAULT '미지정',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch, day_of_week, shift, role)
);

-- Row Level Security (RLS)
ALTER TABLE public.branch_staff_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read (or restrict to staff role if preferred)
CREATE POLICY "Allow all authenticated users read branch_staff_names" ON public.branch_staff_names FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all authenticated users read staff_schedules" ON public.staff_schedules FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admins/managers to modify
-- Assuming role column exists in profiles or we use a custom metadata check. 
-- For simplicity in this project context, we often allow authenticated or specific roles.
CREATE POLICY "Allow admins/managers to manage branch_staff_names" ON public.branch_staff_names 
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')));

CREATE POLICY "Allow admins/managers to manage staff_schedules" ON public.staff_schedules 
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')));
