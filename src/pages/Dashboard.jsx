import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MessageSquare, LogOut } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth(); // Get user and logout from context

    const menuItems = [
        { title: '휴가 사용', icon: <Calendar size={32} />, path: '/vacation' },
        { title: '스탭에게 건의하기', icon: <MessageSquare size={32} />, path: '/suggestion' },
    ];

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            navigate('/login'); // Force navigation anyway
        }
    };

    return (
        <div style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            {/* Header */}
            <div
                className="flex-center"
                style={{
                    justifyContent: 'space-between',
                    marginBottom: 'var(--spacing-xl)'
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
                        padding: 'var(--spacing-xs)'
                    }}
                >
                    <LogOut size={24} />
                </button>
            </div>

            {/* Menu Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 'var(--spacing-md)'
                }}
            >
                {menuItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className="btn-icon"
                    >
                        <div className="icon-wrapper">
                            {item.icon}
                        </div>
                        <span style={{ fontWeight: '600', color: 'var(--color-text-main)' }}>
                            {item.title}
                        </span>
                    </button>
                ))}
            </div>

            {/* Info Card (Optional Decoration) */}
            <div
                className="glass-card"
                style={{
                    marginTop: 'var(--spacing-xl)',
                    padding: 'var(--spacing-md)',
                }}
            >
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: 'var(--spacing-xs)', color: 'var(--color-primary)' }}>
                    오늘의 한마디
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                    "끈기는 모든 것을 이겨낸다."
                </p>
            </div>
        </div >
    );
};

export default Dashboard;
