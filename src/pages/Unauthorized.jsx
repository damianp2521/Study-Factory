import React from 'react';
import { ShieldAlert } from 'lucide-react';

const Unauthorized = () => {
    // Hard redirect to clear any bad state
    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login';
    };

    return (
        <div className="flex-center flex-col" style={{ minHeight: '80vh', padding: 'var(--spacing-lg)' }}>
            <ShieldAlert size={64} style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-md)' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: 'var(--spacing-sm)' }}>
                접근 권한이 없습니다
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>
                로그인 정보가 만료되었거나 권한이 없습니다.<br />
                다시 로그인해주세요.
            </p>

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
