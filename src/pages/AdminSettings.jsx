import React from 'react';
import PageTemplate from '../components/PageTemplate';

const AdminSettings = () => {
    return (
        <PageTemplate title="관리자 설정">
            <div className="card">
                <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    관리자 전용 설정 페이지입니다.
                </p>
            </div>
        </PageTemplate>
    );
};

export default AdminSettings;
