import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

const Unauthorized = () => {
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
            <button
                className="btn-primary"
                onClick={() => {
                    // Force clear everything to fix stuck states
                    localStorage.clear();
                    window.location.href = '/login';
                }}
            >
                로그인 화면으로 이동
            </button>
        </div>
    );
};

export default Unauthorized;
