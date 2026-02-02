import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, BookOpen, MessageCircle, HeartHandshake } from 'lucide-react';

const InlineSuggestion = () => {
    const navigate = useNavigate();

    const categories = [
        { id: 'equipment', label: '비품관련', icon: <Package size={20} /> },
        { id: 'study', label: '학습관련', icon: <BookOpen size={20} /> },
        { id: 'other', label: '기타건의', icon: <MessageCircle size={20} /> },
        { id: 'counseling', label: '상담요청', icon: <HeartHandshake size={20} /> }
    ];

    const handleCategoryClick = (id) => {
        navigate('/suggestion', { state: { category: id } });
    };

    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '16px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px'
            }}>
                {categories.map((cat, index) => (
                    <button
                        key={index}
                        onClick={() => handleCategoryClick(cat.id)}
                        style={{
                            padding: '12px 8px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
                            color: 'var(--color-text-main)',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                            transition: 'all 0.2s ease',
                            wordBreak: 'keep-all',
                            textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)';
                            e.currentTarget.style.background = 'linear-gradient(135deg, #edf2f7 0%, #e2e8f0 100%)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
                            e.currentTarget.style.background = 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)';
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
                        onMouseUp={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    >
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            boxShadow: '0 2px 4px rgba(49, 130, 206, 0.3)'
                        }}>
                            {cat.icon}
                        </div>
                        <span>{cat.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default InlineSuggestion;
