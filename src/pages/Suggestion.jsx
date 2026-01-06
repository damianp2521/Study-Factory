import React from 'react';
import PageTemplate from '../components/PageTemplate';

const Suggestion = () => {
    return (
        <PageTemplate title="스탭에게 건의하기">
            <div className="card">
                <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    건의하기 기능이 곧 추가될 예정입니다.
                </p>
            </div>
        </PageTemplate>
    );
};

export default Suggestion;
