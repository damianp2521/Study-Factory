# 자격증공장 관리앱

React + Vite + Supabase 기반의 운영 관리 앱입니다.

## 기술 스택
- React 19
- Vite 7
- Supabase (`@supabase/supabase-js`)
- React Router
- date-fns

## 실행
```bash
npm install
npm run dev
```

## 빌드
```bash
npm run build
```

## 린트
```bash
npm run lint
```

## 사전검증 (권장)
배포 전 아래 명령으로 빌드/린트를 한 번에 확인합니다.
```bash
npm run preflight
```

DB 연결까지 확인하려면:
```bash
npm run preflight:db
```

## Supabase 확인 스크립트
루트 `.env`의 값을 사용해서 DB 접근을 확인합니다.

```bash
node scripts/verify_db.js
node check_column.js
```

필요한 환경변수:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

또는 동일 값의 서버용 키:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 운영 안전 가이드
100명 이상 사용 환경 기준의 변경 절차는 아래 문서를 따릅니다.

- `docs/SAFE_CHANGE_RUNBOOK.md`
- `docs/SMOKE_CHECKLIST.md`
