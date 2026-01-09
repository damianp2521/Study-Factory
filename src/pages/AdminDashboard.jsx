import React, { useNavigate } from 'react-router-dom';
import { LogOut, Calendar, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            navigate('/login');
        }
    };

    const menuItems = [
        { title: '월별 휴가 현황', icon: <Calendar size={32} />, path: '/admin/monthly-leaves' },
        { title: '회원 관리', icon: <Users size={32} />, path: '/manage-members' },
    ];

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
                        관리자 대시보드
                    </h2>
                    <p style={{ fontSize: '1.1rem', color: 'var(--color-text-main)' }}>
                        <span style={{ fontWeight: 'bold' }}>{user?.name || '관리자'}</span>님 환영합니다.
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

            {/* Grid Menu */}
            <div className="responsive-grid">
                {menuItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className="btn-icon"
                    >
                        <div className="icon-wrapper">
                            {item.icon}
                        </div>
                        <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-text-main)' }}>
                            {item.title}
                        </span>
                    </button>
                ))}
            </div>

            {/* Link to Member Dashboard */}
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <button
                    onClick={() => navigate('/memberdashboard')}
                    style={{ background: 'none', border: 'none', color: '#718096', textDecoration: 'underline', cursor: 'pointer' }}
                >
                    개인 업무(휴가 신청) 보러가기
                </button>
            </div>
        </div>
    );
};

export default AdminDashboard;
