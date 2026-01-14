import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Edit, ArrowLeft, Inbox, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const StaffPage = () => {
    const navigate = useNavigate();
    // Just to double check name if needed

    const menuItems = [
        { title: '금일 휴무 사원', icon: <Calendar size={32} />, path: '/today-leaves' },
        { title: '건의함', icon: <Inbox size={32} />, path: '/suggestion-box' },
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
                        스탭 전용 메뉴
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
                    // Removed inline layout styles to match Dashboard; keeping subtle hover transition if needed, but btn-icon handles it.
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

export default StaffPage;
