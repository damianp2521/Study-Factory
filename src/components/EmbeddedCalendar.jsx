import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const EmbeddedCalendar = ({
    selectedDate,
    onSelectDate,
    events = [], // Array of objects: { date: 'YYYY-MM-DD', type: 'full'|'half'|'special', ... }
    minDate,
    maxDate
}) => {
    // Initialize calendar view to selectedDate or today
    const [currentMonth, setCurrentMonth] = useState(() => {
        return selectedDate ? new Date(selectedDate) : new Date();
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
            const isSelected = selectedDate === dateStr;
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
                        height: '40px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
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
                    {dayEvent && !isSelected && (
                        <div style={{
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            backgroundColor: dayEvent.type === 'full' ? '#c53030' : dayEvent.type === 'special' ? '#805ad5' : '#2c5282',
                            position: 'absolute',
                            bottom: '4px'
                        }} />
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
