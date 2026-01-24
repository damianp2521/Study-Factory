import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const EmbeddedCalendar = ({
    selectedDate,       // Single date (backward compatibility)
    selectedDates = [], // Array of dates for multi-select
    onSelectDate,
    events = [], // Array of objects: { date: 'YYYY-MM-DD', type: 'full'|'half'|'special', ... }
    minDate,
    maxDate,
    // New props for controlled mode
    currentMonth: controlledMonth,
    onMonthChange
}) => {
    // Internal state for uncontrolled mode
    const [internalMonth, setInternalMonth] = useState(() => {
        if (selectedDate) return new Date(selectedDate);
        if (selectedDates.length > 0) return new Date(selectedDates[0]);
        return new Date();
    });

    // Use controlled value if provided, otherwise internal
    const currentMonth = controlledMonth || internalMonth;

    useEffect(() => {
        if (selectedDate && !controlledMonth) {
            setInternalMonth(new Date(selectedDate));
        }
    }, [selectedDate, controlledMonth]);

    const handlePrevMonth = () => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() - 1);

        if (onMonthChange) {
            onMonthChange(newDate);
        } else {
            setInternalMonth(newDate);
        }
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + 1);

        if (onMonthChange) {
            onMonthChange(newDate);
        } else {
            setInternalMonth(newDate);
        }
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const isDateDisabled = (dateStr) => {
        if (minDate && dateStr < minDate) return true;
        if (maxDate && dateStr > maxDate) return true;
        return false;
    };

    const renderCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);

        const days = [];

        // Add empty cells for padding before 1st day
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} style={{ minHeight: '48px' }}></div>);
        }

        // Render actual days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

            // Find all events for this day
            const dayEvents = events.filter(e => e.date === dateStr);

            // Check selection (Single OR Multi)
            const isSelected = selectedDate === dateStr || selectedDates.includes(dateStr);

            const disabled = isDateDisabled(dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            // Determine cell base styles
            let cellBgColor = 'transparent';
            let cellTextColor = '#2d3748';
            let cellBorderColor = 'transparent';
            let fontWeight = 'normal';

            // Selection Overlay (Highest Priority)
            if (isSelected) {
                cellBgColor = 'var(--color-primary)';
                cellTextColor = 'white';
                fontWeight = 'bold';
            } else if (isToday) {
                cellBorderColor = 'var(--color-primary)';
            }

            // Disabled State
            if (disabled) {
                cellTextColor = '#cbd5e0';
                cellBgColor = '#f7fafc';
                if (isSelected) {
                    cellBgColor = '#e2e8f0'; // Dimmed selected
                }
            }

            // Border for days with events (if not selected/disabled)
            if (!isSelected && !disabled && !isToday && dayEvents.length > 0) {
                cellBorderColor = '#cbd5e0';
            }

            days.push(
                <div
                    key={dateStr}
                    onClick={() => !disabled && onSelectDate(dateStr)}
                    style={{
                        minHeight: '52px', // Reduced height but enough for date + 1 label
                        height: 'auto', // Allow expansion
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        gap: '2px', // Tight gap
                        padding: '4px',
                        background: cellBgColor,
                        color: cellTextColor,
                        border: isSelected ? 'none' : `1px solid ${cellBorderColor}`,
                        borderRadius: '8px',
                        fontWeight: fontWeight,
                        fontSize: '0.9rem',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative'
                    }}
                >
                    <span style={{ marginBottom: '2px', lineHeight: 1 }}>{d}</span>
                    {dayEvents.length > 0 && !isSelected && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            width: '100%'
                        }}>
                            {dayEvents.map((event, idx) => {
                                let label = '';
                                let itemBgColor = 'transparent';
                                let itemTextColor = '#2d3748';
                                let itemBorderColor = 'transparent';

                                const isAm = (event.periods || []).includes(1);

                                // 1. Base Label
                                if (event.type === 'full') {
                                    label = '월차';
                                    itemBgColor = '#fff5f5';
                                    itemTextColor = '#c53030';
                                    itemBorderColor = '#feb2b2';
                                } else if (event.type === 'half') {
                                    if (isAm) {
                                        label = '오전';
                                        itemBgColor = '#fff5f5';
                                        itemTextColor = '#c53030';
                                        itemBorderColor = '#feb2b2';
                                    } else {
                                        label = '오후';
                                        itemBgColor = '#ebf8ff';
                                        itemTextColor = '#2c5282';
                                        itemBorderColor = '#90cdf4';
                                    }
                                } else if (event.type === 'special') {
                                    label = '특휴';
                                    itemBgColor = '#faf5ff';
                                    itemTextColor = '#553c9a';
                                    itemBorderColor = '#d6bcfa';
                                }

                                // 2. Reason Override
                                if (event.reason) {
                                    const allowedReasons = ['알바', '스터디', '병원'];
                                    if (allowedReasons.includes(event.reason)) {
                                        label = event.reason;
                                    } else {
                                        label = '기타';
                                    }
                                    // Gray Style
                                    itemBgColor = '#F7FAFC';
                                    itemTextColor = '#4A5568';
                                    itemBorderColor = '#CBD5E0';
                                }

                                return (
                                    <div key={idx} style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold',
                                        color: itemTextColor,
                                        backgroundColor: itemBgColor,
                                        border: `1px solid ${itemBorderColor}`,
                                        borderRadius: '6px',
                                        padding: '2px 0',
                                        width: '100%',
                                        textAlign: 'center',
                                        lineHeight: 1.2,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {label}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div style={{ width: '100%', userSelect: 'none' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '10px',
                gap: '15px'
            }}>
                <button
                    onClick={handlePrevMonth}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#4a5568'
                    }}
                >
                    <ChevronLeft size={24} />
                </button>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748' }}>
                    {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                </span>
                <button
                    onClick={handleNextMonth}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#4a5568'
                    }}
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Week Days */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                marginBottom: '5px',
                textAlign: 'center'
            }}>
                {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                    <div key={day} style={{
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        color: idx === 0 ? '#e53e3e' : idx === 6 ? '#3182ce' : '#718096',
                        padding: '5px 0'
                    }}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '5px'
            }}>
                {renderCalendarDays()}
            </div>
        </div>
    );
};

export default EmbeddedCalendar;
