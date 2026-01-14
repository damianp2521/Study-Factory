import React from 'react';
import PageTemplate from '../components/PageTemplate';
import { User, CreditCard, Calendar, Settings, ChevronRight } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

const MyPage = () => {
    const { user } = useAuth();

    // Helper to calculate D-Day
    const calculateDDay = (endDate) => {
        if (!endDate) return 0;
        const today = new Date();
        const end = new Date(endDate);
        const diffTime = end - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const dDay = calculateDDay(user?.end_date);

    return (
        <PageTemplate title="마이페이지">
            {/* Profile Header */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 'var(--spacing-xl)'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--spacing-sm)',
                    boxShadow: 'var(--shadow-md)'
                }}>
                    <User size={40} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                    {user?.name || '회원'} 님
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                    사원번호 : {user?.member_id || '-'}
                </p>
            </div>

            {/* Current Plan Card */}
            <div className="glass-card" style={{
                padding: 'var(--spacing-lg) var(--spacing-md)',
                marginBottom: 'var(--spacing-lg)',
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
                color: 'white',
                border: 'none'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                    <div>
                        <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '4px' }}>이용중인 이용권</p>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{user?.plan_name || '이용권 없음'}</h4>
                    </div>
                    <div style={{
                        background: 'rgba(255,255,255,0.2)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        fontWeight: 'bold'
                    }}>
                        D-{dDay}
                    </div>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', margin: 'var(--spacing-sm) 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', opacity: 0.9 }}>
                    <Calendar size={16} style={{ marginRight: '8px' }} />
                    <span>{user?.start_date || '-'} ~ {user?.end_date || '-'}</span>
                </div>
            </div>

            {/* Menu List */}
            <div>
                <MenuItem
                    icon={<Settings size={20} />}
                    title="재등록 결제"
                    onClick={() => alert('결제 준비중입니다.')}
                />
                <MenuItem
                    icon={<CreditCard size={20} />}
                    title="결제 내역"
                    onClick={() => { }}
                />
                <MenuItem
                    icon={<User size={20} />}
                    title="회원 정보 수정"
                    onClick={() => alert('정보 수정 기능 준비중입니다.')}
                />
            </div>
        </PageTemplate>
    );
};

// Extracted Component to prevent re-creation on every render
const MenuItem = ({ icon, title, value, onClick }) => (
    <button
        onClick={onClick}
        className="glass-card"
        style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-sm)',
            textAlign: 'left'
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(26, 35, 126, 0.1)',
                color: 'var(--color-primary)',
                marginRight: 'var(--spacing-md)'
            }}>
                {icon}
            </div>
            <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--color-text-main)' }}>
                {title}
            </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
            {value && (
                <span style={{ marginRight: 'var(--spacing-xs)', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                    {value}
                </span>
            )}
            <ChevronRight size={20} color="var(--color-text-secondary)" />
        </div>
    </button>
);

export default MyPage;
