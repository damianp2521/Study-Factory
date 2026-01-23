import React from 'react';
import { ChevronLeft, ClipboardList, Calendar, UserPlus, UserCheck } from 'lucide-react';
import { useDashboardNavigation } from '../../hooks/useDashboardNavigation';

import AdminMemberRegister from '../../pages/AdminMemberRegister';
import AdminMemberStatus from '../../pages/AdminMemberStatus';
import AdminEmployeeVacationHistory from '../../pages/AdminEmployeeVacationHistory';
import AdminWorkReport from '../../pages/AdminWorkReport';
import AdminOtherLeaveRequest from '../../pages/AdminOtherLeaveRequest';
import AdminAttendanceStatus from '../../pages/AdminAttendanceStatus';
import StaffAttendance from '../../pages/StaffAttendance';

const AdminQuickMenu = () => {
    const { currentView, navigateTo, goBack } = useDashboardNavigation('grid');

    // 1. Employee Management Views
    if (currentView === 'register') return <AdminMemberRegister onBack={() => navigateTo('grid')} />;
    if (currentView === 'status') return <AdminMemberStatus onBack={() => navigateTo('grid')} />;

    // 2. Attendance & Leave Views
    if (currentView === 'vacation_history') return <AdminEmployeeVacationHistory onBack={() => navigateTo('grid')} />;
    if (currentView === 'other_leave_request') return <AdminOtherLeaveRequest onBack={() => navigateTo('grid')} />;
    if (currentView === 'attendance_status') return <AdminAttendanceStatus onBack={() => navigateTo('grid')} />;
    if (currentView === 'monthly_attendance_log') return <StaffAttendance onBack={() => navigateTo('grid')} />;

    // 3. Work Management Views
    if (currentView === 'work_report') return <AdminWorkReport onBack={() => navigateTo('grid')} />;

    // Main Grid Menu (Flat Structure)
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
            gap: '15px',
            alignContent: 'start',
            height: '100%',
            padding: '20px'
        }}>
            {/* 1. 사원 등록 */}
            <button
                onClick={() => navigateTo('register')}
                style={menuButtonStyle}
            >
                <div style={{ ...iconContainerStyle, background: '#ebf4ff', color: '#4299e1' }}>
                    <UserPlus size={24} />
                </div>
                <span style={labelStyle}>사원 등록</span>
            </button>

            {/* 2. 사원 현황 */}
            <button
                onClick={() => navigateTo('status')}
                style={menuButtonStyle}
            >
                <div style={{ ...iconContainerStyle, background: '#edf2f7', color: '#718096' }}>
                    <UserCheck size={24} />
                </div>
                <span style={labelStyle}>사원 현황</span>
            </button>

            {/* 3. 월별 사원 휴무 현황 */}
            <button
                onClick={() => navigateTo('vacation_history')}
                style={menuButtonStyle}
            >
                <div style={{ ...iconContainerStyle, background: '#fff5f5', color: '#c53030' }}>
                    <Calendar size={24} />
                </div>
                <span style={{ ...labelStyle, lineHeight: '1.2' }}>월별 사원<br />휴무 현황</span>
            </button>

            {/* 4. 사원 기타 휴무 신청 */}
            <button
                onClick={() => navigateTo('other_leave_request')}
                style={menuButtonStyle}
            >
                <div style={{ ...iconContainerStyle, background: '#e6fffa', color: '#2c7a7b' }}>
                    <UserPlus size={24} />
                </div>
                <span style={{ ...labelStyle, lineHeight: '1.2' }}>사원 기타<br />휴무 신청</span>
            </button>

            {/* 5. 출석 현황 */}
            <button
                onClick={() => navigateTo('attendance_status')}
                style={menuButtonStyle}
            >
                <div style={{ ...iconContainerStyle, background: '#f0fff4', color: '#2f855a' }}>
                    <UserCheck size={24} />
                </div>
                <span style={{ ...labelStyle, lineHeight: '1.2' }}>출석<br />현황</span>
            </button>

            {/* 6. 월별 출석 현황 */}
            <button
                onClick={() => navigateTo('monthly_attendance_log')}
                style={menuButtonStyle}
            >
                <div style={{ ...iconContainerStyle, background: '#e9d8fd', color: '#6b46c1' }}>
                    <UserCheck size={24} />
                </div>
                <span style={{ ...labelStyle, lineHeight: '1.2' }}>월별<br />출석 현황</span>
            </button>

            {/* 7. 작업 계획 및 결과 */}
            <button
                onClick={() => navigateTo('work_report')}
                style={menuButtonStyle}
            >
                <div style={{ ...iconContainerStyle, background: '#ebf8ff', color: '#2b6cb0' }}>
                    <ClipboardList size={24} />
                </div>
                <span style={{ ...labelStyle, lineHeight: '1.2' }}>작업 계획<br />및 결과</span>
            </button>
        </div>
    );
};

const menuButtonStyle = {
    aspectRatio: '1',
    borderRadius: '16px',
    border: 'none',
    background: '#f7fafc',
    color: '#2d3748',
    fontSize: '0.95rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
};

const iconContainerStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '5px'
};

const labelStyle = {
    textAlign: 'center',
    wordBreak: 'keep-all'
};

export default AdminQuickMenu;
