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

    return (
        <div
            style={{ position: 'relative', width: '100%' }}
            onClick={handleContainerClick}
        >
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                <Calendar size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                {label}
            </label>

            {/* Visible Custom UI */}
            <div style={{
                width: '100%',
                padding: '15px',
                borderRadius: '12px',
                border: '1px solid #ddd',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
            }}>
                <span style={{
                    fontSize: '1.1rem',
                    color: value ? 'var(--color-text-main)' : '#a0aec0',
                    fontWeight: value ? 'bold' : 'normal'
                }}>
                    {value ? value : '날짜를 선택해주세요'}
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
