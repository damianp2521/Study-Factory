-- ============================================================
-- 사용자 관리 통합 수정 SQL
-- 모든 사용자 관련 기능을 정상 작동하도록 수정
-- 
-- 현재 구조:
--   - profiles: 실제 사용자 정보 테이블
--   - auth.users: Supabase 인증 테이블
--   - authorized_users: profiles + auth.users 조인 뷰 (읽기 전용!)
--   - pending_registrations: 사전 등록 테이블 (가입 전 대기용)
-- ============================================================

-- 1. pending_registrations 테이블 생성 (사전 등록용)
CREATE TABLE IF NOT EXISTS public.pending_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    branch TEXT NOT NULL DEFAULT '망미점',
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read pending_registrations" ON public.pending_registrations;
CREATE POLICY "Anyone can read pending_registrations"
    ON public.pending_registrations FOR SELECT
    USING (true);

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

DROP POLICY IF EXISTS "Anon can read pending_registrations" ON public.pending_registrations;
CREATE POLICY "Anon can read pending_registrations"
    ON public.pending_registrations FOR SELECT
    TO anon
    USING (true);

-- ============================================================
-- 2. handle_new_user 트리거 함수 (가입 시 profiles 생성)
-- ============================================================
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 3. update_employee_info 함수 (사원 정보 수정)
-- profiles와 auth.users 메타데이터 동시 업데이트
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_employee_info(
    target_id UUID,
    new_branch TEXT,
    new_role TEXT,
    new_seat_number INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- profiles 테이블 업데이트
    UPDATE public.profiles
    SET
        branch = new_branch,
        role = new_role,
        seat_number = new_seat_number,
        updated_at = NOW()
    WHERE id = target_id;

    -- auth.users 메타데이터 업데이트 (세션 동기화용)
    UPDATE auth.users
    SET raw_user_meta_data = 
        jsonb_set(
            jsonb_set(
                jsonb_set(
                    COALESCE(raw_user_meta_data, '{}'::jsonb),
                    '{role}',
                    to_jsonb(new_role)
                ),
                '{branch}',
                to_jsonb(new_branch)
            ),
            '{seat_number}',
            COALESCE(to_jsonb(new_seat_number), 'null'::jsonb)
        )
    WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. delete_user_completely 함수 (사용자 완전 삭제)
-- profiles와 auth.users 및 관련 데이터 모두 삭제
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_user_completely(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_name TEXT;
BEGIN
  -- Security Check: Only Admins can delete users
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Access Denied: Only Admins can delete users.';
  END IF;

  -- Get user name for logging
  SELECT name INTO target_name FROM public.profiles WHERE id = target_user_id;
  
  IF target_name IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Delete related records (check if table exists first using EXECUTE)
  -- A. Vacation Requests
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vacation_requests' AND table_schema = 'public') THEN
      EXECUTE 'DELETE FROM public.vacation_requests WHERE user_id = $1' USING target_user_id;
  END IF;

  -- B. Weekly Reports
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weekly_reports' AND table_schema = 'public') THEN
      EXECUTE 'DELETE FROM public.weekly_reports WHERE user_id = $1' USING target_user_id;
  END IF;

  -- C. Inquiries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inquiries' AND table_schema = 'public') THEN
      EXECUTE 'DELETE FROM public.inquiries WHERE user_id = $1' USING target_user_id;
  END IF;

  -- D. Suggestions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suggestions' AND table_schema = 'public') THEN
      EXECUTE 'DELETE FROM public.suggestions WHERE user_id = $1' USING target_user_id;
  END IF;

  -- E. Staff Todos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_todos' AND table_schema = 'public') THEN
      EXECUTE 'DELETE FROM public.staff_todos WHERE created_by = $1 OR completed_by = $1' USING target_user_id;
  END IF;

  -- F. Beverage Selections
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_beverage_selections' AND table_schema = 'public') THEN
      EXECUTE 'DELETE FROM public.user_beverage_selections WHERE user_id = $1' USING target_user_id;
  END IF;

  -- G. Attendance Records
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance' AND table_schema = 'public') THEN
      EXECUTE 'DELETE FROM public.attendance WHERE user_id = $1' USING target_user_id;
  END IF;

  -- H. Attendance Memos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_memos' AND table_schema = 'public') THEN
      EXECUTE 'DELETE FROM public.attendance_memos WHERE user_id = $1' USING target_user_id;
  END IF;

  -- I. Member Memos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'member_memos' AND table_schema = 'public') THEN
      EXECUTE 'DELETE FROM public.member_memos WHERE user_id = $1' USING target_user_id;
  END IF;

  -- J. Delete from profiles
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- K. Delete from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;

  -- NOTE: No need to delete from authorized_users because it's a VIEW
  -- Deleting from profiles & auth.users automatically removes from the view
END;
$$;

-- ============================================================
-- 5. get_my_role 함수 (현재 사용자 역할 조회)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'member');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 완료!
-- ============================================================
