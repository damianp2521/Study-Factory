-- 1. 근무표 배정 테이블 생성
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

-- 2. 보안 설정 (RLS 활성화)
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;

-- 3. 읽기 권한 설정
DROP POLICY IF EXISTS "Allow all authenticated users read staff_schedules" ON public.staff_schedules;
CREATE POLICY "Allow all authenticated users read staff_schedules" ON public.staff_schedules FOR SELECT USING (auth.role() = 'authenticated');

-- 4. 쓰기 권한 설정 (관리자 및 매니저)
DROP POLICY IF EXISTS "Allow admins/managers to manage staff_schedules" ON public.staff_schedules;
CREATE POLICY "Allow admins/managers to manage staff_schedules" ON public.staff_schedules 
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')));
