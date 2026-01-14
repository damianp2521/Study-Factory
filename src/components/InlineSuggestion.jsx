import React, { useEffect, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const InlineSuggestion = () => {
    // Buttons do not need functional logic yet as per request
    const categories = [
        "비품관련",
        "학습관련",
        "기타건의",
        "상담요청"
    ];

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
                gridTemplateColumns: '1fr 1fr',
                gap: '15px'
            }}>
                {categories.map((text, index) => (
                    <button
                        key={index}
                        style={{
                            height: '110px', // Fixed height for consistent, smaller size
                            width: '100%',
                            padding: '15px',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            background: '#f7fafc',
                            color: '#2d3748',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s'
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {text}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default InlineSuggestion;
