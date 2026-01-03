import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PageTemplate = ({ title, content, children }) => {
    const navigate = useNavigate();
    return (
        <div style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            <div className="flex-center" style={{ justifyContent: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', marginRight: 'var(--spacing-sm)' }}>
                    <ArrowLeft size={24} color="var(--color-text-main)" />
                </button>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{title}</h2>
            </div>
            {content ? (
                <div className="glass-card" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
                    <p style={{ color: 'var(--color-text-secondary)' }}>{content}</p>
                </div>
            ) : (
                children
            )}
        </div>
    );
};

export default PageTemplate;
