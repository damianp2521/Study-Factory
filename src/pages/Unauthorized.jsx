import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

const Unauthorized = () => {
    const navigate = useNavigate();

    return (
        <div className="flex-center flex-col" style={{ minHeight: '80vh', padding: 'var(--spacing-lg)' }}>
            <AlertTriangle size={64} style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-md)' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: 'var(--spacing-sm)' }}>
                접근 권한이 없습니다
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>
                해당 페이지에 접근할 수 있는 권한이 없습니다.<br />
                관리자에게 문의해주세요.
            </p>
            <button
                className="btn-primary"
                onClick={() => navigate('/')}
            >
                대시보드로 돌아가기
            </button>
        </div>
    );
};

export default Unauthorized;
