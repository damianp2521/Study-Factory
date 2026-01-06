import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Edit, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const StaffPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth(); // Just to double check name if needed

    const menuItems = [
        { title: '회원 관리', icon: <Users size={32} />, path: '/manage-members' },
        { title: '공지사항 작성', icon: <Edit size={32} />, path: '/write-notice' },
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
                        스탭 전용 메뉴
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
                        className="card flex-center flex-col"
                        style={{
                            border: 'none',
                            background: 'white',
                            cursor: 'pointer',
                            padding: 'var(--spacing-lg)',
                            gap: 'var(--spacing-sm)',
                            height: '140px'
                        }}
                    >
                        <div style={{ color: 'var(--color-primary)' }}>
                            {item.icon}
                        </div>
                        <span style={{ fontSize: '1rem', fontWeight: '500' }}>
                            {item.title}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default StaffPage;
