import React from 'react';
import { ChevronLeft, ClipboardList, Calendar, UserPlus, UserCheck } from 'lucide-react';
import { useDashboardNavigation } from '../../hooks/useDashboardNavigation';

import AdminMemberRegister from '../../pages/AdminMemberRegister';
import AdminMemberStatus from '../../pages/AdminMemberStatus';
import AdminEmployeeVacationHistory from '../../pages/AdminEmployeeVacationHistory';
import AdminWorkReport from '../../pages/AdminWorkReport';
import AdminOtherLeaveRequest from '../../pages/AdminOtherLeaveRequest';
import AdminAttendanceStatus from '../../pages/AdminAttendanceStatus';

const AdminQuickMenu = () => {
    const { currentView, navigateTo, goBack } = useDashboardNavigation('management_menu');
    // Note: Original code initialized state as 'grid' in some places but AdminQuickMenu inside ManagerDashboard seemed to start with 'grid' but the logic was:
    // const [currentView, setCurrentView] = useState('grid');
    // But then if (currentView === 'management_menu') ...
    // Wait, let's check the original code again.

    // In ManagerDashboard.jsx:
    // const AdminQuickMenu = () => {
    //    const [currentView, setCurrentView] = useState('grid'); 
    // ...
    //    if (currentView === 'register') ...
    //    if (currentView === 'management_menu') { ... render sub-menu ... }
    //    return ... render main grid ...

    // So 'grid' is the main 1-9 grid.
    // Button 1 clicks -> handleMenuClick(1) -> setCurrentView('management_menu').

    // So distinct views are: 'grid' (default), 'management_menu', 'register', etc.

    if (currentView === 'register') {
        return <AdminMemberRegister onBack={() => navigateTo('management_menu')} />;
    }
    if (currentView === 'status') {
        return <AdminMemberStatus onBack={() => navigateTo('management_menu')} />;
    }
    if (currentView === 'vacation_history') {
        return <AdminEmployeeVacationHistory onBack={() => navigateTo('management_menu')} />;
    }
    if (currentView === 'work_report') {
        return <AdminWorkReport onBack={() => navigateTo('management_menu')} />;
    }
    if (currentView === 'other_leave_request') {
        return <AdminOtherLeaveRequest onBack={() => navigateTo('management_menu')} />;
    }
    if (currentView === 'attendance_status') {
        return <AdminAttendanceStatus onBack={() => navigateTo('management_menu')} />;
    }

    if (currentView === 'management_menu') {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                    <button
                        onClick={() => navigateTo('grid')}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px',
                            marginLeft: '-8px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#2d3748'
                        }}
                    >
                        <ChevronLeft size={26} />
                    </button>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0 4px', lineHeight: 1 }}>사원 관리</h2>
                </div>
                {/* Flow Layout for Sub-menu Buttons - Starts Top Left */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignContent: 'flex-start' }}>
                    {/* 1. Register */}
                    <button
                        onClick={() => navigateTo('register')}
                        style={{
                            width: 'calc(33.33% - 10px)', // Consistent with main grid size
                            aspectRatio: '1',
                            borderRadius: '16px',
                            border: 'none',
                            background: '#f7fafc',
                            color: '#2d3748',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#ebf4ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4299e1', marginBottom: '5px' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span>
                        </div>
                        <span style={{ textAlign: 'center' }}>사원 등록</span>
                    </button>
                    {/* 2. Work Report (NEW) */}
                    <button
                        onClick={() => navigateTo('work_report')}
                        style={{
                            width: 'calc(33.33% - 10px)',
                            aspectRatio: '1',
                            borderRadius: '16px',
                            border: 'none',
                            background: '#f7fafc',
                            color: '#2d3748',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#ebf8ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2b6cb0', marginBottom: '5px' }}>
                            <ClipboardList size={20} />
                        </div>
                        <span style={{ textAlign: 'center', lineHeight: '1.2' }}>작업 계획<br />및 결과</span>
                    </button>

                    {/* 3. Status (Shifted) */}
                    <button
                        onClick={() => navigateTo('status')}
                        style={{
                            width: 'calc(33.33% - 10px)',
                            aspectRatio: '1',
                            borderRadius: '16px',
                            border: 'none',
                            background: '#f7fafc',
                            color: '#2d3748',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#edf2f7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#718096', marginBottom: '5px' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>≡</span>
                        </div>
                        <span style={{ textAlign: 'center' }}>사원 현황</span>
                    </button>
                    {/* 4. Vacation History (Shifted) */}
                    <button
                        onClick={() => navigateTo('vacation_history')}
                        style={{
                            width: 'calc(33.33% - 10px)',
                            aspectRatio: '1',
                            borderRadius: '16px',
                            border: 'none',
                            background: '#f7fafc',
                            color: '#2d3748',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#fff5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c53030', marginBottom: '5px' }}>
                            <Calendar size={20} />
                        </div>
                        <span style={{ textAlign: 'center', lineHeight: '1.2' }}>월별 사원<br />휴무 현황</span>
                    </button>
                    {/* 5. Other Leave Request (NEW) */}
                    <button
                        onClick={() => navigateTo('other_leave_request')}
                        style={{
                            width: 'calc(33.33% - 10px)',
                            aspectRatio: '1',
                            borderRadius: '16px',
                            border: 'none',
                            background: '#f7fafc',
                            color: '#2d3748',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#e6fffa', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2c7a7b', marginBottom: '5px' }}>
                            <UserPlus size={20} />
                        </div>
                        <span style={{ textAlign: 'center', lineHeight: '1.2' }}>사원 기타<br />휴무 신청</span>
                    </button>
                    {/* 6. Attendance Status (NEW) */}
                    <button
                        onClick={() => navigateTo('attendance_status')}
                        style={{
                            width: 'calc(33.33% - 10px)',
                            aspectRatio: '1',
                            borderRadius: '16px',
                            border: 'none',
                            background: '#f7fafc',
                            color: '#2d3748',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#f0fff4', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2f855a', marginBottom: '5px' }}>
                            <UserCheck size={20} />
                        </div>
                        <span style={{ textAlign: 'center', lineHeight: '1.2' }}>출석<br />현황</span>
                    </button>
                </div>
            </div>
        );
    }

    const handleMenuClick = (num) => {
        if (num === 1) {
            navigateTo('management_menu');
        } else {
            alert('준비 중인 기능입니다.');
        }
    };

    // Default 'grid' view
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignContent: 'flex-start', height: '100%' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                    key={num}
                    onClick={() => handleMenuClick(num)}
                    style={{
                        width: 'calc(33.33% - 10px)', // 3 per row
                        aspectRatio: '1',
                        borderRadius: '16px',
                        border: 'none',
                        background: '#f7fafc',
                        color: '#4a5568',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: '5px'
                    }}
                >
                    {num === 1 ? (
                        <span style={{ fontSize: '0.9rem', color: '#2d3748', fontWeight: 'bold', textAlign: 'center', wordBreak: 'keep-all' }}>사원 관리</span>
                    ) : (
                        <span style={{ fontSize: '1.5rem' }}>{num}</span>
                    )}
                </button>
            ))}
        </div>
    );
};

export default AdminQuickMenu;
