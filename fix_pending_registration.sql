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

-- 5. 회원가입 완료 시 pending_registrations에서 삭제하는 함수
CREATE OR REPLACE FUNCTION public.complete_registration(
    user_name TEXT
)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.pending_registrations
    WHERE name = user_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
