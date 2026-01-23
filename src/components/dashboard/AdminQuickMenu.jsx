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

    // 1. Employee Management Views (사원 관리 - Menu 1)
    if (currentView === 'register') {
        return <AdminMemberRegister onBack={() => navigateTo('management_menu')} />;
    }
    if (currentView === 'status') {
        return <AdminMemberStatus onBack={() => navigateTo('management_menu')} />;
    }

    // 2. Attendance & Leave Views (출석 휴무 관리 - Menu 2)
    if (currentView === 'vacation_history') {
        return <AdminEmployeeVacationHistory onBack={() => navigateTo('attendance_menu')} />;
    }
    if (currentView === 'other_leave_request') {
        return <AdminOtherLeaveRequest onBack={() => navigateTo('attendance_menu')} />;
    }
    if (currentView === 'attendance_status') {
        return <AdminAttendanceStatus onBack={() => navigateTo('attendance_menu')} />;
    }
    if (currentView === 'monthly_attendance_log') {
        return <StaffAttendance onBack={() => navigateTo('attendance_menu')} />;
    }

    // 3. Work Management Views (작업 관리 - Menu 3)
    if (currentView === 'work_report') {
        return <AdminWorkReport onBack={() => navigateTo('work_menu')} />;
    }


    /* --- SUB MENU SCREENS --- */

    // Menu 1: Employee Management
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
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))',
                    gap: '15px',
                    alignContent: 'start'
                }}>
                    {/* 1-1. Register */}
                    <button
                        onClick={() => navigateTo('register')}
                        style={{
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
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#ebf4ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4299e1', marginBottom: '5px' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span>
                        </div>
                        <span style={{ textAlign: 'center' }}>사원 등록</span>
                    </button>
                    {/* 1-2. Status */}
                    <button
                        onClick={() => navigateTo('status')}
                        style={{
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
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#edf2f7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#718096', marginBottom: '5px' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>≡</span>
                        </div>
                        <span style={{ textAlign: 'center' }}>사원 현황</span>
                    </button>
                </div>
            </div>
        );
    }

    // Menu 2: Attendance & Leave Management
    if (currentView === 'attendance_menu') {
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
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0 4px', lineHeight: 1 }}>출석·휴무 관리</h2>
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))',
                    gap: '15px',
                    alignContent: 'start'
                }}>
                    {/* 2-1. Vacation History */}
                    <button
                        onClick={() => navigateTo('vacation_history')}
                        style={{
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
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#fff5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c53030', marginBottom: '5px' }}>
                            <Calendar size={20} />
                        </div>
                        <span style={{ textAlign: 'center', lineHeight: '1.2' }}>월별 사원<br />휴무 현황</span>
                    </button>
                    {/* 2-2. Other Leave Request */}
                    <button
                        onClick={() => navigateTo('other_leave_request')}
                        style={{
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
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#e6fffa', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2c7a7b', marginBottom: '5px' }}>
                            <UserPlus size={20} />
                        </div>
                        <span style={{ textAlign: 'center', lineHeight: '1.2' }}>사원 기타<br />휴무 신청</span>
                    </button>
                    {/* 2-3. Attendance Status */}
                    <button
                        onClick={() => navigateTo('attendance_status')}
                        style={{
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
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#f0fff4', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2f855a', marginBottom: '5px' }}>
                            <UserCheck size={20} />
                        </div>
                        <span style={{ textAlign: 'center', lineHeight: '1.2' }}>출석<br />현황</span>
                    </button>
                    {/* 2-4. Monthly Attendance Log (Moved from Staff) */}
                    <button
                        onClick={() => navigateTo('monthly_attendance_log')}
                        style={{
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
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#e9d8fd', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b46c1', marginBottom: '5px' }}>
                            <UserCheck size={20} />
                        </div>
                        <span style={{ textAlign: 'center', lineHeight: '1.2' }}>월별<br />출석 현황</span>
                    </button>
                </div>
            </div>
        );
    }

    // Menu 3: Work Management
    if (currentView === 'work_menu') {
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
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0 4px', lineHeight: 1 }}>작업 관리</h2>
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))',
                    gap: '15px',
                    alignContent: 'start'
                }}>
                    {/* 3-1. Work Report */}
                    <button
                        onClick={() => navigateTo('work_report')}
                        style={{
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
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#ebf8ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2b6cb0', marginBottom: '5px' }}>
                            <ClipboardList size={20} />
                        </div>
                        <span style={{ textAlign: 'center', lineHeight: '1.2' }}>작업 계획<br />및 결과</span>
                    </button>
                </div>
            </div>
        );
    }

    const handleMenuClick = (num) => {
        if (num === 1) {
            navigateTo('management_menu');
        } else if (num === 2) {
            navigateTo('attendance_menu');
        } else if (num === 3) {
            navigateTo('work_menu');
        } else {
            alert('준비 중인 기능입니다.');
        }
    };

    // Default 'grid' view
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))',
            gap: '15px',
            alignContent: 'start',
            height: '100%'
        }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                    key={num}
                    onClick={() => handleMenuClick(num)}
                    style={{
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
                        <span style={{ fontSize: '1.1rem', color: '#2d3748', fontWeight: 'bold', textAlign: 'center', wordBreak: 'keep-all' }}>사원 관리</span>
                    ) : num === 2 ? (
                        <span style={{ fontSize: '1.1rem', color: '#2d3748', fontWeight: 'bold', textAlign: 'center', wordBreak: 'keep-all', lineHeight: 1.2 }}>출석·휴무<br />관리</span>
                    ) : num === 3 ? (
                        <span style={{ fontSize: '1.1rem', color: '#2d3748', fontWeight: 'bold', textAlign: 'center', wordBreak: 'keep-all' }}>작업 관리</span>
                    ) : (
                        <span style={{ fontSize: '1.5rem' }}>{num}</span>
                    )}
                </button>
            ))}
        </div>
    );
};

export default AdminQuickMenu;
