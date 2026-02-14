# 기능 동결 스모크 체크리스트

## 공통
- [ ] 로그인 성공
- [ ] 로그아웃 성공
- [ ] 권한별 라우팅 정상 (member/staff/admin)
- [ ] 비인가 접근 시 차단 화면 노출

## Member
- [ ] `MemberDashboard` 진입
- [ ] `DailyWorkPlan` 조회/완료 처리
- [ ] `InlineVacationRequest` 신청/취소
- [ ] `InlineSuggestion` 작성
- [ ] `Inquiry` 목록 조회/삭제

## Staff
- [ ] `StaffDailyAttendance` 조회
- [ ] `StaffTaskBoard` 조회/수정
- [ ] `StaffSeatManagement` 좌석 반영
- [ ] `StaffBeverageManagement` 음료 배정
- [ ] `StaffBeverageOrderList` 조회
- [ ] `StaffBeverageServingSheet` 조회

## Admin
- [ ] `AdminMemberRegister` 등록 처리
- [ ] `AdminMemberStatus` 상태 변경
- [ ] `AdminVacationDetails` 월 이동/휴가 표시
- [ ] `AdminEmployeeVacationHistory` 조회
- [ ] `AdminOtherLeaveRequest` 처리
- [ ] `AdminFixedLeaveManagement` 생성/조회
- [ ] `AdminWorkPlanCheck` 조회
- [ ] `AdminWorkReport` 조회

## Supabase 확인
- [ ] `npm run verify-db` 성공
- [ ] `npm run check-column` 성공
- [ ] 오류 발생 시 네트워크 제한 여부 먼저 확인

## 배포 전 고정 명령
```bash
npm run preflight
```

DB까지 함께 확인할 때:
```bash
npm run preflight:db
```
