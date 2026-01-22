import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Removed Calendar
import { supabase } from '../lib/supabaseClient';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const StaffAttendance = ({ onBack }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    // const [showCalendar, setShowCalendar] = useState(false); // Removed Date Picker
    const [branch, setBranch] = useState('망미점');
    const [users, setUsers] = useState([]);
    const [attendanceData, setAttendanceData] = useState({});
    const [vacationData, setVacationData] = useState({});
    const [loading, setLoading] = useState(false);

    // Swipe State
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50;

    useEffect(() => {
        const updateDate = () => {
            const today = new Date().toISOString().split('T')[0];
            setSelectedDate(today);
        };
        window.addEventListener('focus', updateDate);
        return () => window.removeEventListener('focus', updateDate);
    }, []);

    useEffect(() => {
        fetchData();
    }, [selectedDate, branch]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: userData, error: userError } = await supabase
                .from('authorized_users')
                .select('*')
                .eq('branch', branch)
                .order('seat_number', { ascending: true, nullsLast: true });

            if (userError) throw userError;

            const { data: logData, error: logError } = await supabase
                .from('attendance_logs')
                .select('user_id, period')
                .eq('date', selectedDate);

            if (logError) throw logError;

            const { data: vacData, error: vacError } = await supabase
                .from('vacation_requests')
                .select('*')
                .eq('date', selectedDate);

            if (vacError) throw vacError;

            setUsers(userData || []);

            const attMap = {};
            (logData || []).forEach(l => {
                if (!attMap[l.user_id]) attMap[l.user_id] = new Set();
                attMap[l.user_id].add(l.period);
            });
            setAttendanceData(attMap);

            const vacMap = {};
            (vacData || []).forEach(v => {
                vacMap[v.user_id] = v;
            });
            setVacationData(vacMap);

        } catch (error) {
            console.error('Error fetching staff attendance:', error);
            alert('데이터를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const toggleAttendance = async (userId, period) => {
        const isAttended = attendanceData[userId]?.has(period);

        setAttendanceData(prev => {
            const newSet = new Set(prev[userId] || []);
            if (isAttended) {
                newSet.delete(period);
            } else {
                newSet.add(period);
            }
            return { ...prev, [userId]: newSet };
        });

        try {
            if (isAttended) {
                const { error } = await supabase
                    .from('attendance_logs')
                    .delete()
                    .eq('user_id', userId)
                    .eq('date', selectedDate)
                    .eq('period', period);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('attendance_logs')
                    .insert({ user_id: userId, date: selectedDate, period: period });
                if (error) throw error;
            }
        } catch (error) {
            console.error('Attendance toggle error:', error);
            alert('출석 처리에 실패했습니다.');
            fetchData();
        }
    };

    // Date Navigation Logic
    const changeDate = (days) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const formatDateDisplay = (dateStr) => {
        const date = new Date(dateStr);
        return format(date, 'yyyy.M.d(EEE)', { locale: ko });
    };

    // Swipe Logic
    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;
        if (isLeftSwipe) {
            changeDate(1); // Next Day
        }
        if (isRightSwipe) {
            changeDate(-1); // Prev Day
        }
    };

    const renderCell = (user, period) => {
        const isAttended = attendanceData[user.id]?.has(period);
        const vac = vacationData[user.id];
        let bg = 'white';
        let content = null;
        let color = '#2d3748';

        if (vac) {
            if (vac.type === 'full') {
                bg = '#c6f6d5';
                color = '#22543d';
                content = vac.reason ? `월차\n(${vac.reason})` : '월차';
            } else if (vac.type === 'half') {
                const isAm = (vac.periods || []).includes(1);
                if (isAm && period <= 4) {
                    bg = '#c6f6d5';
                    color = '#22543d';
                    content = vac.reason ? `오전\n(${vac.reason})` : '오전';
                } else if (!isAm && period >= 4) {
                    bg = '#c6f6d5';
                    color = '#22543d';
                    content = vac.reason ? `오후\n(${vac.reason})` : '오후';
                }
            }
        }

        if (isAttended) {
            bg = '#c6f6d5';
            color = '#22543d';
            content = 'O';
        } else {
            if (bg === 'white') {
                bg = '#fed7d7';
                color = '#c53030';
                content = 'X';
            }
        }

        return (
            <div
                onClick={() => toggleAttendance(user.id, period)}
                style={{
                    flex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: bg,
                    color: color,
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    borderRight: '1px solid #e2e8f0',
                    height: '100%',
                    whiteSpace: 'pre-line',
                    textAlign: 'center',
                    lineHeight: 1.1,
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
            >
                {content}
            </div>
        );
    };

    return (
        <div
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* New Header Layout */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', marginLeft: '-8px' }}>
                        <ChevronLeft size={26} color="#2d3748" />
                    </button>
                    {/* Title Removed as requested */}
                </div>

                {/* Center Date Navigation */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '20px'
                }}>
                    <button
                        onClick={() => changeDate(-1)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '10px' }}
                    >
                        <ChevronLeft size={28} color="#4a5568" strokeWidth={2.5} />
                    </button>

                    <span style={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: '#2d3748',
                        width: '140px', // Fixed width to prevent jumping
                        textAlign: 'center'
                    }}>
                        {formatDateDisplay(selectedDate)}
                    </span>

                    <button
                        onClick={() => changeDate(1)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '10px' }}
                    >
                        <ChevronRight size={28} color="#4a5568" strokeWidth={2.5} />
                    </button>
                </div>

                {/* Spacer to balance the Back button on the left (approx width of back button) */}
                <div style={{ width: '42px' }}></div>
            </div>

            {/* Table Header */}
            <div style={{ display: 'flex', background: '#f7fafc', borderBottom: '1px solid #e2e8f0', height: '40px', fontWeight: 'bold', fontSize: '0.85rem', color: '#4a5568' }}>
                <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #e2e8f0' }}>좌석</div>
                <div style={{ width: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #e2e8f0' }}>이름</div>
                {[1, 2, 3, 4, 5, 6, 7].map(p => (
                    <div key={p} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #e2e8f0' }}>{p}</div>
                ))}
            </div>

            {/* Table Body */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {users.map(user => {
                    return (
                        <div key={user.id} style={{ display: 'flex', height: '50px', borderBottom: '1px solid #edf2f7' }}>
                            <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #edf2f7', background: '#fafafa', fontSize: '0.8rem', color: '#a0aec0' }}>
                                {user.seat_number || '-'}
                            </div>
                            <div style={{ width: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #edf2f7', fontWeight: 'bold', fontSize: '0.9rem', color: '#2d3748' }}>
                                {user.name}
                            </div>
                            {[1, 2, 3, 4, 5, 6, 7].map(p => (
                                <div key={p} style={{ flex: 1 }}>
                                    {renderCell(user, p)}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StaffAttendance;
