import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Users } from 'lucide-react';

const AdminPage = () => {
    const navigate = useNavigate();

    const menuItems = [
        { title: '월별 휴가 현황', icon: <Calendar size={32} />, path: '/admin/monthly-leaves' },
        { title: '회원 관리', icon: <Users size={32} />, path: '/manage-members' },
    ];

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/managerdashboard')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        <ArrowLeft size={24} color="var(--color-text-main)" />
                    </button>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        관리자 전용 메뉴
                    </h2>
                </div>
            </div>

            {/* Grid Menu */}
            <div className="responsive-grid">
                {menuItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className="btn-icon"
                    // Removed inline styles to match Dashboard size
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
        </div>
    );
};

export default AdminPage;
