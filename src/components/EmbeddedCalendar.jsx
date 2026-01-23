import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const EmbeddedCalendar = ({
    selectedDate,       // Single date (backward compatibility)
    selectedDates = [], // Array of dates for multi-select
    onSelectDate,
    events = [], // Array of objects: { date: 'YYYY-MM-DD', type: 'full'|'half'|'special', ... }
    minDate,
    maxDate
}) => {
    // Initialize calendar view to selectedDate, or the first of selectedDates, or today
    const [currentMonth, setCurrentMonth] = useState(() => {
        if (selectedDate) return new Date(selectedDate);
        if (selectedDates.length > 0) return new Date(selectedDates[0]);
        return new Date();
    });

    useEffect(() => {
        if (selectedDate) {
            setCurrentMonth(new Date(selectedDate));
        }
    }, [selectedDate]);

    const handlePrevMonth = () => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentMonth(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentMonth(newDate);
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

        // Days of week header
        const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

        // Add empty cells for padding before 1st day
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} style={{ height: '40px' }}></div>);
        }

        // Render actual days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

            // Find event for this day
            const dayEvent = events.find(e => e.date === dateStr);

            // Check selection (Single OR Multi)
            const isSelected = selectedDate === dateStr || selectedDates.includes(dateStr);

            const disabled = isDateDisabled(dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            // Determine styles
            let bgColor = 'transparent';
            let textColor = '#2d3748';
            let borderColor = 'transparent';
            let fontWeight = 'normal';

            // 1. Base Styles for Events
            if (dayEvent) {
                if (dayEvent.type === 'full') {
                    bgColor = '#fff5f5';
                    textColor = '#c53030';
                } else if (dayEvent.type === 'half') {
                    bgColor = '#ebf8ff';
                    textColor = '#2c5282';
                } else if (dayEvent.type === 'special') {
                    bgColor = '#faf5ff';
                    textColor = '#553c9a';
                    borderColor = '#d6bcfa';
                }
            }

            // 2. Selection Overlay (Highest Priority)
            if (isSelected) {
                bgColor = 'var(--color-primary)';
                textColor = 'white';
                fontWeight = 'bold';
            } else if (isToday && !dayEvent) {
                borderColor = 'var(--color-primary)';
            }

            // 3. Disabled State
            if (disabled) {
                textColor = '#cbd5e0';
                bgColor = '#f7fafc';
                if (isSelected) {
                    bgColor = '#e2e8f0'; // Dimmed selected
                }
            }

            days.push(
                <div
                    key={dateStr}
                    onClick={() => !disabled && onSelectDate(dateStr)}
                    style={{
                        minHeight: '64px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 2px',
                        background: bgColor,
                        color: textColor,
                        border: isSelected ? 'none' : (dayEvent ? `1px solid ${dayEvent.type === 'full' ? '#feb2b2' : dayEvent.type === 'special' ? '#d6bcfa' : '#bee3f8'}` : `1px solid ${borderColor}`),
                        borderRadius: '8px',
                        fontWeight: fontWeight,
                        fontSize: '0.9rem',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative'
                    }}
                >
                    <span>{d}</span>
                    {dayEvent && !isSelected && (() => {
                        let label = '';
                        let bgColor = 'transparent';
                        let textColor = '#2d3748';
                        let borderColor = 'transparent';

                        const isAm = (dayEvent.periods || []).includes(1);

                        // 1. Base Label
                        if (dayEvent.type === 'full') {
                            label = '월차';
                            bgColor = '#fff5f5';
                            textColor = '#c53030';
                            borderColor = '#feb2b2';
                        } else if (dayEvent.type === 'half') {
                            if (isAm) {
                                label = '오전';
                                bgColor = '#fff5f5';
                                textColor = '#c53030';
                                borderColor = '#feb2b2';
                            } else {
                                label = '오후';
                                bgColor = '#ebf8ff';
                                textColor = '#2c5282';
                                borderColor = '#90cdf4';
                            }
                        } else if (dayEvent.type === 'special') {
                            label = '특휴';
                            bgColor = '#faf5ff';
                            textColor = '#553c9a';
                            borderColor = '#d6bcfa';
                        }

                        // 2. Reason Override
                        if (dayEvent.reason) {
                            const allowedReasons = ['알바', '스터디', '병원'];
                            if (allowedReasons.includes(dayEvent.reason)) {
                                label = dayEvent.reason;
                            } else {
                                label = '기타';
                            }
                            // Gray Style
                            bgColor = '#F7FAFC';
                            textColor = '#4A5568';
                            borderColor = '#CBD5E0';
                        }

                        return (
                            <div style={{
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                color: textColor,
                                backgroundColor: bgColor,
                                border: `1px solid ${borderColor}`,
                                borderRadius: '6px',
                                padding: '3px 0',
                                width: '92%',
                                textAlign: 'center',
                                marginTop: '2px',
                                lineHeight: 1,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {label}
                            </div>
                        );
                    })()}
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
