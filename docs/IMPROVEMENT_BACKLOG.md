# 개선 백로그 (기능 불변 전제)

## P0 (즉시)
- 런타임 오류 제거 (`no-undef`, 조건부 Hook)
- 중복 네트워크 호출 제거
- Supabase 연결 스크립트 하드코딩 제거
- 주요 화면 수동 스모크 체크 고정

## P1 (단기)
- 대형 페이지 분리
  - `src/pages/StaffDailyAttendance.jsx`
  - `src/pages/StaffAttendance.jsx`
  - `src/pages/StaffTaskBoard.jsx`
- 공통 데이터 조회 로직 훅으로 분리
- 날짜/휴가 계산 로직을 `src/utils`로 이동

## P2 (중기)
- SQL 파일 정리
  - 중복/핫픽스 SQL를 순서형 마이그레이션 구조로 통합
  - `DB_UPDATE_REQUIRED.md` 내용을 마이그레이션 파일로 흡수
- 관리자/스탭 공통 UI 컴포넌트화
- 빌드 번들 크기 절감 (동적 import 경계 재정의)

## P3 (장기)
- 타입스크립트 전환 (핵심 도메인부터 점진)
- 자동 회귀 테스트 도입 (로그인, 휴가, 출석, 관리자 기능)
- 배포 파이프라인에서 빌드 + 스모크 자동화

## 변경 금지 항목 (현재)
- 기존 컬럼/테이블 제거
- 기존 API 응답 shape 변경
- 권한 체크 로직 삭제 또는 우회
- 사용자 플로우 단계 생략
