import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, ArrowLeft } from 'lucide-react';

const AdminPage = () => {
    const navigate = useNavigate();

    const menuItems = [
        { title: '관리자 설정', icon: <Settings size={32} />, path: '/admin-settings' },
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
                        onClick={() => navigate('/dashboard')}
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
                        style={{
                            width: '100%',
                            height: 'auto',
                            aspectRatio: '1/1',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.1), 0 6px 6px rgba(0,0,0,0.1)', // Stronger 3D shadow
                            transform: 'translateY(0)',
                            transition: 'all 0.3s ease'
                        }}
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
