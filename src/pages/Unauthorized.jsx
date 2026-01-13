import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.clear();
            window.location.href = '/login';
        }
    };

    return (
        <div className="flex-center flex-col" style={{ minHeight: '80vh', padding: 'var(--spacing-lg)' }}>
            <AlertTriangle size={64} style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-md)' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: 'var(--spacing-sm)' }}>
                접근 권한이 없습니다
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>
                로그인 정보가 만료되었거나 권한이 없습니다.<br />
                다시 로그인해주세요.
            </p>

            {/* Debug Info for User */}
            <div style={{
                marginBottom: '30px',
                padding: '15px',
                background: '#f7fafc',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: '#4a5568',
                textAlign: 'left',
                width: '100%',
                maxWidth: '300px'
            }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>현재 로그인 정보 (디버그용):</div>
                <div>이름: {user?.name || user?.user_metadata?.name || '-'}</div>
                <div>직급(Role): <span style={{ color: '#e53e3e', fontWeight: 'bold' }}>{user?.role || '-'}</span></div>
                <div>ID: {user?.email || '-'}</div>
            </div>

            <button
                className="btn-primary"
                onClick={handleLogout}
            >
                로그인 화면으로 이동
            </button>
        </div>
    );
};

export default Unauthorized;
