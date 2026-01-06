import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MessageSquare, LogOut, Shield, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const role = user?.role || 'member';

    // DEBUG: Force alert to confirm code update
    React.useEffect(() => {
        console.log('Dashboard v5.2 Loaded. Role:', role);
    }, [role]);

    // 1. Common Menus (Always Visible)
    const commonMenus = [
        { title: '휴가 사용', icon: <Calendar size={32} />, path: '/vacation' },
        { title: '스탭에게 건의하기', icon: <MessageSquare size={32} />, path: '/suggestion' },
    ];

    // 2. Extra Role Buttons
    const roleButtons = [];
    if (role === 'staff' || role === 'admin') {
        roleButtons.push({
            title: '스탭 전용 메뉴',
            icon: <Shield size={32} />,
            path: '/staff-menu',
            style: { background: '#edf2f7', color: '#2d3748' } // visual distinction
        });
    }
    if (role === 'admin') {
        roleButtons.push({
            title: '관리자 전용 메뉴',
            icon: <Key size={32} />,
            path: '/admin-menu',
            style: { background: '#2d3748', color: 'white' } // visual distinction
        });
    }

    const visibleMenus = [...commonMenus, ...roleButtons];

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
            {/* DEBUG BANNER - REMOVE LATER */}
            <div style={{ background: '#ff4444', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                🛑 디버그 모드 v5.2 🛑<br />
                내 역할: {role}<br />
                이 빨간 박스가 보여야 최신 버전입니다.
            </div>

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
                {visibleMenus.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className="btn-icon"
                        style={item.style} // Apply custom styles for role buttons
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
            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.7rem', color: '#eee' }}>
                System v5.1 (Debug) | Role: {role || 'undefined'} | User: {user?.email}
            </div>
        </div >
    );
};

export default Dashboard;
