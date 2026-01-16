import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';

const CustomDatePicker = ({ value, onChange, label, ...props }) => {
    const inputRef = useRef(null);

    const handleContainerClick = () => {
        if (inputRef.current) {
            try {
                if (typeof inputRef.current.showPicker === 'function') {
                    inputRef.current.showPicker();
                } else {
                    // Fallback for browsers without showPicker support
                    inputRef.current.focus();
                    inputRef.current.click();
                }
            } catch (err) {
                console.error("Date picker error:", err);
            }
        }
    };

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

            <div
                onClick={handleContainerClick}
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '46px',
                    cursor: 'pointer' // Make sure users know it's clickable
                }}
            >
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
                    pointerEvents: 'none' // Pass clicks to the parent div
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

                {/* Hidden Native Input */}
                <input
                    ref={inputRef}
                    type="date"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    min={props.min}
                    max={props.max}
                    style={{
                        position: 'absolute',
                        width: 0,
                        height: 0,
                        opacity: 0,
                        overflow: 'hidden',
                        border: 0,
                        padding: 0,
                        margin: 0
                    }}
                    tabIndex={-1} // Prevent tabbing to hidden input
                    {...props}
                />
            </div>
        </div>
    );
};

export default CustomDatePicker;
