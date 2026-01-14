import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const InlineSuggestion = () => {
    const navigate = useNavigate();

    const categories = [
        { id: 'equipment', label: '비품관련' },
        { id: 'study', label: '학습관련' },
        { id: 'other', label: '기타건의' },
        { id: 'counseling', label: '상담요청' }
    ];

    const handleCategoryClick = (id) => {
        // Navigate to suggestion page with the selected category state
        navigate('/suggestion', { state: { category: id } });
    };

    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                alignContent: 'start', // Align grid content to top
                height: '100%' // Use full height to allow top alignment
            }}>
                {categories.map((cat, index) => (
                    <button
                        key={index}
                        onClick={() => handleCategoryClick(cat.id)}
                        style={{
                            aspectRatio: '1', // Square buttons
                            width: '100%', // Full width of grid cell
                            padding: '10px',
                            borderRadius: '16px',
                            border: 'none',
                            background: '#f7fafc',
                            color: '#2d3748',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s',
                            wordBreak: 'keep-all',
                            lineHeight: '1.2',
                            textAlign: 'center'
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default InlineSuggestion;
