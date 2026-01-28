-- 사원 사전 등록을 위한 pending_registrations 테이블 생성
-- authorized_users가 뷰이므로 INSERT가 불가능하여 별도 테이블 필요

-- 1. pending_registrations 테이블 생성
CREATE TABLE IF NOT EXISTS public.pending_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    branch TEXT NOT NULL DEFAULT '망미점',
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLS 활성화
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

-- 3. 정책 설정 - 모든 인증된 사용자가 읽기 가능 (회원가입 시 확인용)
DROP POLICY IF EXISTS "Anyone can read pending_registrations" ON public.pending_registrations;
CREATE POLICY "Anyone can read pending_registrations"
    ON public.pending_registrations FOR SELECT
    USING (true);

-- 관리자/스탭만 추가/삭제 가능
DROP POLICY IF EXISTS "Admin can manage pending_registrations" ON public.pending_registrations;
CREATE POLICY "Admin can manage pending_registrations"
    ON public.pending_registrations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'staff')
        )
    );

-- 4. 인증되지 않은 사용자도 읽기 가능 (회원가입 전 확인용)
DROP POLICY IF EXISTS "Anon can read pending_registrations" ON public.pending_registrations;
CREATE POLICY "Anon can read pending_registrations"
    ON public.pending_registrations FOR SELECT
    TO anon
    USING (true);

-- 5. 회원가입 완료 시 pending_registrations에서 삭제하는 함수 (SECURITY DEFINER로 RLS 우회)
CREATE OR REPLACE FUNCTION public.complete_registration(user_name TEXT)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.pending_registrations
    WHERE name = user_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. handle_new_user 트리거 함수 업데이트 - pending_registrations에서 정보 조회 및 자동 삭제
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    pre_assigned_branch TEXT;
    pre_assigned_role TEXT;
    user_name TEXT;
BEGIN
    user_name := new.raw_user_meta_data->>'name';
    
    -- pending_registrations에서 사전 등록 정보 조회
    SELECT branch, role 
    INTO pre_assigned_branch, pre_assigned_role
    FROM public.pending_registrations 
    WHERE name = user_name;

    -- profiles 테이블에 사용자 정보 삽입
    INSERT INTO public.profiles (id, name, branch, role, email)
    VALUES (
        new.id,
        user_name,
        COALESCE(pre_assigned_branch, new.raw_user_meta_data->>'branch'),
        COALESCE(pre_assigned_role, new.raw_user_meta_data->>'role', 'member'),
        new.email
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        branch = COALESCE(public.profiles.branch, EXCLUDED.branch),
        role = COALESCE(public.profiles.role, EXCLUDED.role);

    -- 가입 완료 후 pending_registrations에서 자동 삭제
    DELETE FROM public.pending_registrations WHERE name = user_name;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 트리거가 없으면 생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
