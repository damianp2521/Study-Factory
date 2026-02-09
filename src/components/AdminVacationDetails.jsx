import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const AdminVacationDetails = ({ user, onBack }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [userVacations, setUserVacations] = useState([]);
    const [loading, setLoading] = useState(false);

    // Safety check
    if (!user || !user.id) return null;

    useEffect(() => {
        fetchUserVacations();
    }, [user.id, currentDate]); // Use user.id for stability

    const fetchUserVacations = async () => {
        setLoading(true);
        try {
            const y = currentDate.getFullYear();
            const m = currentDate.getMonth();
            const firstDay = new Date(y, m, 1);
            const lastDay = new Date(y, m + 1, 0);

            // Format as YYYY-MM-DD
            const formatDate = (d) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const queryDateStart = formatDate(firstDay);
            const queryDateEnd = formatDate(lastDay);

            // Parallel fetch
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

            // Merge
            const merged = [
                ...(vacationRes.data || []),
                ...(attendanceRes.data || []).map(a => ({
                    ...a,
                    type: 'special',
                    reason: a.status,
                    // Ensure ID for key if missing
                    id: `log-${a.date}-${a.period}`
                }))
            ];

            setUserVacations(merged);
        } catch (error) {
            console.error('Error fetching vacations:', error);
        } finally {
            setLoading(false);
        }
    };

    const days = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysArr = [];

        // Pad start
        for (let i = 0; i < firstDay.getDay(); i++) {
            daysArr.push(null);
        }
        // Days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            daysArr.push(new Date(year, month, i));
        }
        return daysArr;
    }, [currentDate]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const renderVacationBadges = (date) => {
        if (!date) return null;

        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const vacations = userVacations.filter(v => v.date === dateString);

        if (vacations.length === 0) return null;

        // Dedup logic
        const seenLabels = new Set();
        const badges = [];

        vacations.forEach(vacation => {
            let label = '';
            let style = {};

            const isAm = Array.isArray(vacation.periods) && vacation.periods.includes(1);

            if (vacation.type === 'full') {
                label = '월차';
                style = { bg: '#fff5f5', color: '#c53030', border: '#feb2b2' };
            } else if (vacation.type === 'half') {
                if (isAm) {
                    label = '오전';
                    style = { bg: '#fff5f5', color: '#c53030', border: '#feb2b2' };
                } else {
                    label = '오후';
                    style = { bg: '#ebf8ff', color: '#2c5282', border: '#90cdf4' };
                }
            } else if (vacation.type === 'special') {
                label = '특휴';
                style = { bg: '#faf5ff', color: '#553c9a', border: '#d6bcfa' };
            }

            // Override if reason exists
            if (vacation.reason) {
                label = vacation.reason;
                style = { bg: '#F7FAFC', color: '#4A5568', border: '#CBD5E0' };
            }

            if (label && !seenLabels.has(label)) {
                seenLabels.add(label);
                badges.push({ label, ...style });
            }
        });

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', alignItems: 'center' }}>
                {badges.map((b, idx) => (
                    <div key={idx} style={{
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        color: b.color,
                        backgroundColor: b.bg,
                        border: `1px solid ${b.border}`,
                        borderRadius: '4px',
                        textAlign: 'center',
                        wordBreak: 'keep-all',
                        lineHeight: 1.1,
                        padding: '2px',
                        width: '95%'
                    }}>
                        {b.label}
                    </div>
                ))}
            </div>
        );
    };

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
                        {user.name || '알 수 없음'}
                    </h2>
                    <span style={{ fontSize: '0.85rem', color: '#718096' }}>{user.branch || '지점 미정'} 휴가 현황</span>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', autoRows: 'minmax(52px, auto)' }}>
                    {days.map((date, i) => {
                        if (!date) return <div key={`empty-${i}`} />;
                        return (
                            <div key={i} style={{
                                minHeight: '52px',
                                background: 'white',
                                borderRadius: '8px',
                                border: '1px solid #f7fafc',
                                padding: '4px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                position: 'relative',
                                opacity: loading ? 0.5 : 1,
                                height: 'auto'
                            }}>
                                <span style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    marginBottom: '4px',
                                    color: date.getDay() === 0 ? '#e53e3e' : date.getDay() === 6 ? '#3182ce' : '#718096'
                                }}>
                                    {date.getDate()}
                                </span>
                                {renderVacationBadges(date)}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminVacationDetails;
