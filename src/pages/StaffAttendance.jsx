import React, { useState, useEffect } from 'react';
import { ChevronLeft, Calendar, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import EmbeddedCalendar from '../components/EmbeddedCalendar';

const StaffAttendance = ({ onBack }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState(1); // 1-7
    const [branch, setBranch] = useState('망미점'); // Fixed to Mangmi for seat list

    const [users, setUsers] = useState([]);
    const [attendanceLogs, setAttendanceLogs] = useState(new Set()); // Set of user_ids who attended
    const [vacations, setVacations] = useState({}); // Map user_id -> vacation info
    const [loading, setLoading] = useState(false);

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
    }, [selectedDate, selectedPeriod]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Users (Mangmi)
            const { data: userData, error: userError } = await supabase
                .from('authorized_users')
                .select('*')
                .eq('branch', branch)
                .order('seat_number', { ascending: true, nullsLast: true }); // Seat order

            if (userError) throw userError;

            // 2. Fetch Attendance Logs for Date + Period
            const { data: logData, error: logError } = await supabase
                .from('attendance_logs')
                .select('user_id')
                .eq('date', selectedDate)
                .eq('period', selectedPeriod);

            if (logError) throw logError;

            // 3. Fetch Vacation Requests for Date (Accepted only usually, but let's take all for now or approved ones?)
            // Assuming we show all valid requests.
            const { data: vacData, error: vacError } = await supabase
                .from('vacation_requests')
                .select('user_id, type, periods, reason')
                .eq('date', selectedDate);

            if (vacError) throw vacError;

            // Process Data
            setUsers(userData || []);
            setAttendanceLogs(new Set((logData || []).map(l => l.user_id)));

            const vacMap = {};
            (vacData || []).forEach(v => {
                vacMap[v.user_id] = v;
            });
            setVacations(vacMap);

        } catch (error) {
            console.error('Error fetching data:', error);
            alert('데이터를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const toggleAttendance = async (userId) => {
        const isAttended = attendanceLogs.has(userId);

        try {
            if (isAttended) {
                // Remove
                const { error } = await supabase
                    .from('attendance_logs')
                    .delete()
                    .eq('user_id', userId)
                    .eq('date', selectedDate)
                    .eq('period', selectedPeriod);

                if (error) throw error;
                setAttendanceLogs(prev => {
                    const next = new Set(prev);
                    next.delete(userId);
                    return next;
                });
            } else {
                // Add
                const { error } = await supabase
                    .from('attendance_logs')
                    .insert({
                        user_id: userId,
                        date: selectedDate,
                        period: selectedPeriod
                    });

                if (error) throw error;
                setAttendanceLogs(prev => new Set(prev).add(userId));
            }
        } catch (error) {
            console.error('Attendance toggle error:', error);
            alert('출석 처리에 실패했습니다.');
        }
    };

    // Helper to determine status text/color
    const getStatus = (userId) => {
        const vac = vacations[userId];
        if (!vac) return null;

        if (vac.type === 'full') return { text: vac.reason ? `종일(${vac.reason})` : '월차', type: 'full' };
        if (vac.type === 'half') {
            // Assuming periods array [1,2,3,4] is AM? or user just said "AM is 1~4". 
            // Logic: period <= 4 AM, >= 4 PM. Overlap at 4.
            const isAm = (vac.periods || []).includes(1);
            const isPm = (vac.periods || []).includes(7); // Heuristic
            // Or based on user request: "AM: 1~4", "PM: 4~7"
            // Let's rely on 'periods' array in DB if it exists, or just label.
            const label = isAm ? '오전' : '오후';
            return { text: vac.reason ? `${label}(${vac.reason})` : `${label}반차`, type: isAm ? 'half_am' : 'half_pm' };
        }
        return null;
    };

    // Map seat 1-102
    const seatList = Array.from({ length: 102 }, (_, i) => i + 1);
    const userMap = {};
    users.forEach(u => {
        if (u.seat_number) userMap[u.seat_number] = u;
    });

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', marginLeft: '-8px' }}>
                        <ChevronLeft size={26} color="#2d3748" />
                    </button>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 0 4px', lineHeight: 1 }}>출석부</h2>
                </div>

                {/* Date Picker Button */}
                <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        background: 'white',
                        display: 'flex', alignItems: 'center', gap: '5px',
                        fontSize: '0.9rem', fontWeight: 'bold', color: '#2d3748',
                        cursor: 'pointer'
                    }}
                >
                    {selectedDate}
                    <Calendar size={16} color="#718096" />
                </button>
            </div>

            {showCalendar && (
                <div style={{ position: 'absolute', top: '60px', right: '20px', zIndex: 100, background: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', padding: '10px' }}>
                    <EmbeddedCalendar
                        selectedDate={selectedDate}
                        onSelectDate={(val) => {
                            setSelectedDate(val);
                            setShowCalendar(false);
                        }}
                    />
                </div>
            )}

            {/* Period Selector */}
            <div style={{
                display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '10px',
                marginBottom: '5px',
                scrollbarWidth: 'none'
            }}>
                <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                {[1, 2, 3, 4, 5, 6, 7].map(p => (
                    <button
                        key={p}
                        onClick={() => setSelectedPeriod(p)}
                        style={{
                            flexShrink: 0,
                            width: '40px', height: '40px',
                            borderRadius: '50%',
                            border: selectedPeriod === p ? 'none' : '1px solid #e2e8f0',
                            background: selectedPeriod === p ? 'var(--color-primary)' : 'white',
                            color: selectedPeriod === p ? 'white' : '#718096',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        {p}
                    </button>
                ))}
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#718096', marginBottom: '15px' }}>
                {selectedPeriod}교시 출석 체크
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {seatList.map(seatNum => {
                    const user = userMap[seatNum];
                    if (!user) {
                        // Empty Seat
                        return (
                            <div key={seatNum} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '10px 15px',
                                borderBottom: '1px solid #f7fafc',
                                background: '#fafafa'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', opacity: 0.5 }}>
                                    <div style={{ width: '28px', height: '28px', background: '#edf2f7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#a0aec0' }}>{seatNum}</div>
                                    <div style={{ color: '#a0aec0' }}>공석</div>
                                </div>
                            </div>
                        );
                    }

                    const isAttended = attendanceLogs.has(user.id);
                    const status = getStatus(user.id);

                    // Logic for Status Display
                    // User Request: "Between Name and Button, show status (Vacation/Half)"

                    return (
                        <div key={seatNum} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 15px',
                            borderBottom: '1px solid #edf2f7',
                            background: 'white'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '28px', height: '28px', background: '#ebf8ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#2b6cb0', fontSize: '1rem' }}>{seatNum}</div>
                                <div style={{ fontWeight: 'bold', color: '#2d3748', fontSize: '1rem' }}>{user.name}</div>
                                {status && (
                                    <div style={{
                                        fontSize: '1rem',
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        background: status.type === 'full' ? '#fff5f5' : '#ebf8ff',
                                        color: status.type === 'full' ? '#c53030' : '#2c5282',
                                        fontWeight: 'bold'
                                    }}>
                                        {status.text}
                                    </div>
                                )}
                            </div>

                            {/* Spacer to push button to right (handled by justify-content: space-between on parent) */}

                            {/* Check Button */}
                            <button
                                onClick={() => toggleAttendance(user.id)}
                                style={{
                                    width: '40px', height: '40px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: isAttended ? '#48bb78' : '#e2e8f0',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Check size={24} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StaffAttendance;
