import React from 'react';
import { ChevronLeft, Calendar, ClipboardList, UserPlus, UserCheck, MapPin, Coffee } from 'lucide-react';
import { useDashboardNavigation } from '../../hooks/useDashboardNavigation';

import EmployeeVacationStatus from './EmployeeVacationStatus';
import StaffTaskBoard from '../../pages/StaffTaskBoard';
import InlineVacationRequest from '../../components/InlineVacationRequest';
import StaffAttendance from '../../pages/StaffAttendance';
import StaffSeatManagement from '../../pages/StaffSeatManagement';
import StaffBeverageManagement from '../../pages/StaffBeverageManagement';
import StaffBeverageOrderList from '../../pages/StaffBeverageOrderList';

const StaffGridMenu = () => {
    const { currentView, navigateTo, goBack } = useDashboardNavigation('grid');

    // Sub-views
    if (currentView === 'employee_vacation') {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px 0 0', display: 'flex', alignItems: 'center' }}>
                        <ChevronLeft size={24} color="#2d3748" />
                    </button>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>일별 사원 휴무 현황</h3>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <EmployeeVacationStatus />
                </div>
            </div>
        );
    }
    if (currentView === 'work_status') {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px 0 0', display: 'flex', alignItems: 'center' }}>
                        <ChevronLeft size={24} color="#2d3748" />
                    </button>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>스탭 업무 현황</h3>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <StaffTaskBoard />
                </div>
            </div>
        );
    }
    if (currentView === 'vacation_request') {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px 0 0', display: 'flex', alignItems: 'center' }}>
                        <ChevronLeft size={24} color="#2d3748" />
                    </button>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>스탭 휴무 신청</h3>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <InlineVacationRequest />
                </div>
            </div>
        );
    }
    if (currentView === 'attendance') {
        return <StaffAttendance onBack={goBack} />;
    }
    if (currentView === 'seat_management') {
        return <StaffSeatManagement onBack={goBack} />;
    }
    if (currentView === 'beverage_management') {
        return <StaffBeverageManagement onBack={goBack} />;
    }
    if (currentView === 'beverage_order_list') {
        return <StaffBeverageOrderList onBack={goBack} />;
    }

    // Grid View
    const handleMenuClick = (num) => {
        if (num === 1) navigateTo('employee_vacation');
        else if (num === 2) navigateTo('work_status');
        else if (num === 3) navigateTo('vacation_request');
        else if (num === 4) navigateTo('attendance');
        else if (num === 5) navigateTo('seat_management');
        else if (num === 6) navigateTo('beverage_management');
        else if (num === 7) navigateTo('beverage_order_list');
        else alert('준비 중인 기능입니다.');
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '15px',
            alignContent: 'start',
            height: '100%'
        }}>
            {/* 1. Employee Leave Status */}
            <button
                onClick={() => handleMenuClick(1)}
                style={{
                    aspectRatio: '1',
                    borderRadius: '16px',
                    border: 'none',
                    background: '#f7fafc',
                    color: '#2d3748',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
            >
                <div style={{ width: '32px', height: '32px', background: '#fff5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c53030', marginBottom: '5px' }}>
                    <Calendar size={20} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>일별 사원<br />휴무 현황</span>
            </button>

            {/* 2. Staff Work Status */}
            <button
                onClick={() => handleMenuClick(2)}
                style={{
                    aspectRatio: '1',
                    borderRadius: '16px',
                    border: 'none',
                    background: '#f7fafc',
                    color: '#2d3748',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
            >
                <div style={{ width: '32px', height: '32px', background: '#ebf8ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2b6cb0', marginBottom: '5px' }}>
                    <ClipboardList size={20} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>스탭<br />업무 현황</span>
            </button>

            {/* 3. Leave Request */}
            <button
                onClick={() => handleMenuClick(3)}
                style={{
                    aspectRatio: '1',
                    borderRadius: '16px',
                    border: 'none',
                    background: '#f7fafc',
                    color: '#2d3748',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
            >
                <div style={{ width: '32px', height: '32px', background: '#e6fffa', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2c7a7b', marginBottom: '5px' }}>
                    <UserPlus size={20} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>스탭<br />휴무 신청</span>
            </button>

            {/* 4. Attendance Book (출석부) */}
            <button
                onClick={() => handleMenuClick(4)}
                style={{
                    aspectRatio: '1',
                    borderRadius: '16px',
                    border: 'none',
                    background: '#f7fafc',
                    color: '#2d3748',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
            >
                <div style={{ width: '32px', height: '32px', background: '#e9d8fd', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b46c1', marginBottom: '5px' }}>
                    <UserCheck size={20} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>출석부</span>
            </button>

            {/* 5. Employee Seat Management (사원 좌석 관리) */}
            <button
                onClick={() => handleMenuClick(5)}
                style={{
                    aspectRatio: '1',
                    borderRadius: '16px',
                    border: 'none',
                    background: '#f7fafc',
                    color: '#2d3748',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
            >
                <div style={{ width: '32px', height: '32px', background: '#faf5ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#805ad5', marginBottom: '5px' }}>
                    <MapPin size={20} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>사원<br />좌석 관리</span>
            </button>

            {/* 6. Employee Beverage Management (사원 음료 관리) */}
            <button
                onClick={() => handleMenuClick(6)}
                style={{
                    aspectRatio: '1',
                    borderRadius: '16px',
                    border: 'none',
                    background: '#f7fafc',
                    color: '#2d3748',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
            >
                <div style={{ width: '32px', height: '32px', background: '#e6fffa', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2c7a7b', marginBottom: '5px' }}>
                    <Coffee size={20} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>사원<br />음료 관리</span>
            </button>

            {/* 7. Beverage Order List */}
            <button
                onClick={() => handleMenuClick(7)}
                style={{
                    aspectRatio: '1',
                    borderRadius: '16px',
                    border: 'none',
                    background: '#f7fafc',
                    color: '#2d3748',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
            >
                <div style={{ width: '32px', height: '32px', background: '#e6fffa', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#319795', marginBottom: '5px' }}>
                    <ClipboardList size={20} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>음료<br />제조표</span>
            </button>

            {/* 8-9 Placeholders */}
            {[8, 9].map(num => (
                <button
                    key={num}
                    onClick={() => handleMenuClick(num)}
                    style={{
                        aspectRatio: '1',
                        borderRadius: '16px',
                        border: 'none',
                        background: '#f7fafc',
                        color: '#a0aec0',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    {num}
                </button>
            ))}
        </div>
    );
};
export default StaffGridMenu;
