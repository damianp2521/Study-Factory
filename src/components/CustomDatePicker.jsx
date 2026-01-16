import React from 'react';
import { Calendar } from 'lucide-react';

const CustomDatePicker = ({ value, onChange, label, ...props }) => {
    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return '날짜를 선택해주세요';
        const [y, m, d] = dateStr.split('-');
        return `${y}. ${m}. ${d}.`;
    };

    return (
        <div style={{ width: '100%' }}>
            {label && (
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 'bold', color: '#718096' }}>
                    {label}
                </label>
            )}

            <div style={{ position: 'relative', width: '100%', height: '46px' }}>
                {/* Visible Custom UI */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    padding: '0 12px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    pointerEvents: 'none' // Let clicks pass through to the input below if z-index wasn't enough (though input is on top)
                }}>
                    <span style={{
                        fontSize: '1rem',
                        color: value ? 'var(--color-text-main)' : '#a0aec0',
                        fontWeight: value ? 'bold' : 'normal',
                        fontFamily: 'var(--font-mono, monospace)',
                        letterSpacing: '1px',
                        lineHeight: '1',
                        display: 'block'
                    }}>
                        {formatDisplayDate(value)}
                    </span>
                    <Calendar size={20} color="#718096" />
                </div>

                {/* Invisible Native Input - Covers ENTIRE area */}
                <input
                    type="date"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    min={props.min}
                    max={props.max}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        zIndex: 10,
                        cursor: 'pointer',
                        // Remove default appearance to ensure it behaves as a simple click layer
                        appearance: 'none',
                        WebkitAppearance: 'none'
                    }}
                    {...props}
                />
            </div>
        </div>
    );
};

export default CustomDatePicker;
