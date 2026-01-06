import React from 'react';
import PageTemplate from '../components/PageTemplate';

const WriteNotice = () => {
    return (
        <PageTemplate title="공지사항 작성">
            <div className="card">
                <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    공지사항 작성 기능이 곧 추가될 예정입니다.
                </p>
            </div>
        </PageTemplate>
    );
};

export default WriteNotice;
