# 필수 데이터베이스 업데이트 안내

출석부의 '지각', '조퇴' 등의 상태가 '휴무계획'에 정상적으로 표시되려면, 데이터베이스에 `status` 컬럼이 추가되어야 합니다.
아래 SQL 코드를 복사하여 **Supabase SQL Editor**에서 실행해주세요.

```sql
-- 1. attendance_logs 테이블에 status 컬럼 추가
ALTER TABLE public.attendance_logs 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT NULL;

-- 2. 관리자/스탭이 status를 수정할 수 있도록 권한 부여
CREATE POLICY "Staff/Admin can update attendance" ON public.attendance_logs
    FOR UPDATE USING (auth.role() = 'authenticated');
```

## 실행 방법
1. Supabase 프로젝트 대시보드로 이동합니다.
2. 왼쪽 메뉴에서 **SQL Editor**를 클릭합니다.
3. **New Query**를 클릭합니다.
4. 위 코드를 붙여넣고 **Run** 버튼을 클릭합니다.
5. 앱을 새로고침하여 확인합니다.
