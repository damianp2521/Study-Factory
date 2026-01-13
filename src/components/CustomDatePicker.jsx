import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';

const CustomDatePicker = ({ value, onChange, label = "날짜 선택", ...props }) => {
    const inputRef = useRef(null);

    const handleContainerClick = () => {
        // Force trigger the browser picker
        try {
            if (inputRef.current && inputRef.current.showPicker) {
                inputRef.current.showPicker();
            } else if (inputRef.current) {
                // Fallback for older browsers or mobile where reliable
                inputRef.current.click();
            }
        } catch (err) {
            console.log("showPicker not supported or failed", err);
        }
    };

    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return '날짜를 선택해주세요';
        const [y, m, d] = dateStr.split('-');
        return `${y}. ${m}. ${d}.`;
    };

    return (
        <div
            style={{ position: 'relative', width: '100%' }}
            onClick={handleContainerClick}
        >
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 'bold', color: '#718096' }}>
                {label}
            </label>

            {/* Visible Custom UI */}
            <div style={{
                width: '100%',
                padding: '0 12px', // Horizontal padding only, let height + flex align vertically
                height: '46px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                boxSizing: 'border-box'
            }}>
                <span style={{
                    fontSize: '1rem', // Match select input font size
                    color: value ? 'var(--color-text-main)' : '#a0aec0',
                    fontWeight: value ? 'bold' : 'normal',
                    fontFamily: 'var(--font-mono, monospace)',
                    letterSpacing: '1px'
                }}>
                    {formatDisplayDate(value)}
                </span>
                <Calendar size={20} color="#718096" />
            </div>

            {/* Invisible Native Input */}
            <input
                ref={inputRef}
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                min={props.min}
                max={props.max}
                style={{
                    position: 'absolute',
                    top: '30px',
                    left: 0,
                    width: '100%',
                    height: 'calc(100% - 30px)',
                    opacity: 0,
                    zIndex: 10,
                    cursor: 'pointer'
                }}
            />
        </div>
    );
};

export default CustomDatePicker;
