import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const AdminVacationDetails = ({ user, onBack }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [userVacations, setUserVacations] = useState([]);
    const [loading, setLoading] = useState(false);

    if (!user) return null; // Safety check

    useEffect(() => {
        fetchUserVacations();
    }, [user, currentDate]);

    const fetchUserVacations = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const y = currentDate.getFullYear();
            const m = String(currentDate.getMonth() + 1).padStart(2, '0');
            const queryDateStart = `${y}-${m}-01`;
            const lastDay = new Date(y, Number(m), 0).getDate();
            const queryDateEnd = `${y}-${m}-${lastDay}`;

            // Parallel fetch vacations and attendance logs
            const [vacationRes, attendanceRes] = await Promise.all([
                supabase
                    .from('vacation_requests')
                    .select('*')
                    .eq('user_id', user.id)
                    .gte('date', queryDateStart)
                    .lte('date', queryDateEnd),
                supabase
                    .from('attendance_logs')
                    .select('date, period, status')
                    .eq('user_id', user.id)
                    .not('status', 'is', null)
                    .gte('date', queryDateStart)
                    .lte('date', queryDateEnd)
            ]);

            if (vacationRes.error) throw vacationRes.error;
            if (attendanceRes.error) throw attendanceRes.error;

            // Merge them
            const merged = [
                ...(vacationRes.data || []),
                ...(attendanceRes.data || []).map(a => ({
                    ...a,
                    type: 'special',
                    reason: a.status
                }))
            ];

            setUserVacations(merged);
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
                        {user?.name || '정보 없음'}
                    </h2>
                    <span style={{ fontSize: '0.85rem', color: '#718096' }}>{user?.branch || '지점 미정'} 휴가 현황</span>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', autoRows: 'minmax(52px, auto)' }}>
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
                                minHeight: '52px',
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
                                height: 'auto',
                                overflow: 'visible'
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
                                    {(() => {
                                        // Group vacations by unique labels to avoid duplicates
                                        const uniqueLabels = [];
                                        const seenLabels = new Set();

                                        vacations.forEach(vacation => {
                                            let label = '';
                                            let bgColor = '#fff';
                                            let textColor = '#2d3748';
                                            let borderColor = 'transparent';

                                            const isAm = (vacation.periods || []).includes(1);

                                            // 1. Determine Base Style & Label
                                            if (vacation.type === 'full') {
                                                label = '월차';
                                                bgColor = '#fff5f5';
                                                textColor = '#c53030';
                                                borderColor = '#feb2b2';
                                            } else if (vacation.type === 'half') {
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
                                            } else if (vacation.type === 'special') {
                                                label = '특휴';
                                                bgColor = '#faf5ff';
                                                textColor = '#553c9a';
                                                borderColor = '#d6bcfa';
                                            }

                                            // 2. Override Label and Style if 'reason' exists (Other Leave)
                                            if (vacation.reason) {
                                                label = vacation.reason;
                                                bgColor = '#F7FAFC';
                                                textColor = '#4A5568';
                                                borderColor = '#CBD5E0';
                                            }

                                            // Only add if we haven't seen this label
                                            if (!seenLabels.has(label)) {
                                                seenLabels.add(label);
                                                uniqueLabels.push({ label, bgColor, textColor, borderColor });
                                            }
                                        });

                                        return uniqueLabels.map((item, idx) => (
                                            <div key={idx} style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                color: item.textColor,
                                                backgroundColor: item.bgColor,
                                                border: `1px solid ${item.borderColor}`,
                                                borderRadius: '4px',
                                                textAlign: 'center',
                                                wordBreak: 'keep-all',
                                                overflowWrap: 'break-word',
                                                lineHeight: 1.1,
                                                padding: '2px',
                                                width: '95%'
                                            }}>
                                                {item.label}
                                            </div>
                                        ));
                                    })()}
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
