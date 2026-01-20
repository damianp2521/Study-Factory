import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const AdminVacationDetails = ({ user, onBack }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [userVacations, setUserVacations] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchUserVacations();
    }, [user, currentDate]);

    const fetchUserVacations = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const y = currentDate.getFullYear();
            const m = String(currentDate.getMonth() + 1).padStart(2, '0');
            const queryDateStart = `${y}-${m}-01`;
            const lastDay = new Date(y, Number(m), 0).getDate();
            const queryDateEnd = `${y}-${m}-${lastDay}`;

            const { data, error } = await supabase
                .from('vacation_requests')
                .select('*')
                .eq('user_id', user.id)
                .gte('date', queryDateStart)
                .lte('date', queryDateEnd);

            if (error) throw error;
            setUserVacations(data || []);
        } catch (error) {
            console.error('Error fetching vacations:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];

        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const getVacationsForDate = (date) => {
        if (!date) return [];
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return userVacations.filter(v => v.date === dateString);
    };

    const days = getDaysInMonth(currentDate);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        marginLeft: '-8px',
                        borderRadius: '50%',
                        color: '#2d3748',
                        display: 'flex', alignItems: 'center'
                    }}
                >
                    <ChevronLeft size={26} />
                </button>
                <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: 0, lineHeight: 1.2 }}>
                        {user.name}
                    </h2>
                    <span style={{ fontSize: '0.85rem', color: '#718096' }}>{user.branch} 휴가 현황</span>
                </div>
            </div>

            {/* Calendar Controls */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px',
                marginBottom: '20px', padding: '10px', background: 'white', borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <button onClick={handlePrevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
                    <ChevronLeft size={20} color="#4a5568" />
                </button>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2d3748', minWidth: '100px', textAlign: 'center' }}>
                    {currentDate.getFullYear()}. {String(currentDate.getMonth() + 1).padStart(2, '0')}
                </span>
                <button onClick={handleNextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
                    <ChevronRight size={20} color="#4a5568" />
                </button>
            </div>

            {/* Calendar Grid */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                {/* Weekday Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '10px', textAlign: 'center' }}>
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                        <div key={day} style={{
                            fontWeight: 'bold',
                            color: i === 0 ? '#e53e3e' : i === 6 ? '#3182ce' : '#718096',
                            fontSize: '0.9rem'
                        }}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', autoRows: 'minmax(80px, 1fr)' }}>
                    {days.map((date, i) => {
                        if (!date) return <div key={`empty-${i}`} />;

                        const vacations = getVacationsForDate(date);

                        // Default Style
                        let cellBg = 'white';
                        let cellBorder = '#f7fafc';

                        // If any vacation exists, maybe tint the cell background lightly? 
                        // Or just keep individual items styled. Keeping white bg for clarity.

                        return (
                            <div key={i} style={{
                                background: cellBg,
                                borderRadius: '8px',
                                border: `1px solid ${cellBorder}`,
                                padding: '4px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                position: 'relative',
                                opacity: loading ? 0.5 : 1,
                                overflow: 'hidden'
                            }}>
                                <span style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    marginBottom: '4px',
                                    color: date.getDay() === 0 ? '#e53e3e' : date.getDay() === 6 ? '#3182ce' : '#718096'
                                }}>
                                    {date.getDate()}
                                </span>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', alignItems: 'center' }}>
                                    {vacations.map((vacation, idx) => {
                                        let label = '';
                                        let bgColor = '#fff';
                                        let textColor = '#2d3748';
                                        let borderColor = 'transparent';

                                        const isAm = (vacation.periods || []).includes(1);
                                        const isPm = (vacation.periods || []).includes(2);

                                        // 1. Determine Base Style & Label
                                        if (vacation.type === 'full') {
                                            label = '월차';
                                            bgColor = '#fff5f5';
                                            textColor = '#c53030';
                                            borderColor = '#feb2b2';
                                        } else if (vacation.type === 'half') {
                                            if (isAm) {
                                                label = '오전반차';
                                                bgColor = '#fff5f5'; // Red for AM
                                                textColor = '#c53030';
                                                borderColor = '#feb2b2';
                                            } else {
                                                label = '오후반차';
                                                bgColor = '#ebf8ff'; // Blue for PM
                                                textColor = '#2c5282';
                                                borderColor = '#90cdf4';
                                            }
                                        }

                                        // 2. Override Label and Style if 'reason' exists (Other Leave)
                                        if (vacation.reason) {
                                            label = vacation.reason;

                                            // Gray Style for Other Leave
                                            bgColor = '#F7FAFC'; // Gray 50
                                            textColor = '#4A5568'; // Gray 700
                                            borderColor = '#CBD5E0'; // Gray 300
                                        }

                                        return (
                                            <div key={idx} style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                color: textColor,
                                                backgroundColor: bgColor,
                                                border: `1px solid ${borderColor}`,
                                                borderRadius: '4px',
                                                textAlign: 'center',
                                                wordBreak: 'keep-all',
                                                overflowWrap: 'break-word',
                                                lineHeight: 1.1,
                                                padding: '2px',
                                                width: '95%'
                                            }}>
                                                {label}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminVacationDetails;
