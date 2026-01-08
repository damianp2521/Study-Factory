import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Shield, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import WorkPlanReport from '../components/WorkPlanReport';
import InlineVacationRequest from '../components/InlineVacationRequest';

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const role = user?.role || 'member';

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            navigate('/login');
        }
    };

    return (
        <div style={{ padding: 'var(--spacing-lg) var(--spacing-md)', maxWidth: '600px', margin: '0 auto' }}>
            {/* Header */}
            <div
                className="flex-center"
                style={{
                    justifyContent: 'space-between',
                    marginBottom: 'var(--spacing-lg)'
                }}
            >
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        안녕하세요,
                    </h2>
                    <p style={{ fontSize: '1.1rem', color: 'var(--color-text-main)' }}>
                        <span style={{ fontWeight: 'bold' }}>{user?.name || '회원'}</span>님 오늘도 화이팅!
                    </p>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        background: 'none',
                        color: 'var(--color-text-secondary)',
                        padding: 'var(--spacing-xs)',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <LogOut size={24} />
                </button>
            </div>

            {/* 1. Work Plan Report */}
            <WorkPlanReport />

            {/* 2. Inline Vacation Request */}
            <InlineVacationRequest />

            {/* 3. Role Menus (Bottom) */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                {(role === 'staff' || role === 'admin') && (
                    <button
                        onClick={() => navigate('/staff-menu')}
                        style={{
                            flex: 1,
                            padding: '15px',
                            borderRadius: '12px',
                            background: '#edf2f7',
                            color: '#2d3748',
                            border: 'none',
                            fontWeight: 'bold',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        <Shield size={24} />
                        <span style={{ fontSize: '0.9rem' }}>스탭 메뉴</span>
                    </button>
                )}
                {role === 'admin' && (
                    <button
                        onClick={() => navigate('/admin-menu')}
                        style={{
                            flex: 1,
                            padding: '15px',
                            borderRadius: '12px',
                            background: '#edf2f7',
                            color: '#2d3748',
                            border: 'none',
                            fontWeight: 'bold',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        <Key size={24} />
                        <span style={{ fontSize: '0.9rem' }}>관리자 메뉴</span>
                    </button>
                )}
            </div>

            {/* Suggestion Link (Optional, kept for accessibility) */}
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button
                    onClick={() => navigate('/suggestion')}
                    style={{ background: 'none', border: 'none', color: '#718096', textDecoration: 'underline', cursor: 'pointer' }}
                >
                    스탭에게 건의하기
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
