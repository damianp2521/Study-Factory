import React, { useState, useEffect } from 'react';
import { ChevronLeft, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import EmbeddedCalendar from '../components/EmbeddedCalendar';

const StaffAttendance = ({ onBack }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showCalendar, setShowCalendar] = useState(false);
    const [branch, setBranch] = useState('망미점'); // Default Mangmi
    const [users, setUsers] = useState([]);
    const [attendanceData, setAttendanceData] = useState({}); // user_id -> set of periods
    const [vacationData, setVacationData] = useState({}); // user_id -> vacation request
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
    }, [selectedDate, branch]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Users
            const { data: userData, error: userError } = await supabase
                .from('authorized_users')
                .select('*')
                .eq('branch', branch)
                .order('seat_number', { ascending: true, nullsLast: true });

            if (userError) throw userError;

            // 2. Fetch Attendance for ALL periods on date
            const { data: logData, error: logError } = await supabase
                .from('attendance_logs')
                .select('user_id, period')
                .eq('date', selectedDate);

            if (logError) throw logError;

            // 3. Fetch Vacations
            const { data: vacData, error: vacError } = await supabase
                .from('vacation_requests')
                .select('*')
                .eq('date', selectedDate);

            if (vacError) throw vacError;

            setUsers(userData || []);

            // Process Logs
            const attMap = {};
            (logData || []).forEach(l => {
                if (!attMap[l.user_id]) attMap[l.user_id] = new Set();
                attMap[l.user_id].add(l.period);
            });
            setAttendanceData(attMap);

            // Process Vacations
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

        // Optimistic Update
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
                // Remove
                const { error } = await supabase
                    .from('attendance_logs')
                    .delete()
                    .eq('user_id', userId)
                    .eq('date', selectedDate)
                    .eq('period', period);
                if (error) throw error;
            } else {
                // Add
                const { error } = await supabase
                    .from('attendance_logs')
                    .insert({
                        user_id: userId,
                        date: selectedDate,
                        period: period
                    });
                if (error) throw error;
            }
        } catch (error) {
            console.error('Attendance toggle error:', error);
            alert('출석 처리에 실패했습니다.');
            fetchData(); // Revert on error
        }
    };

    // Logic for Cell Color/Content
    const renderCell = (user, period) => {
        const isAttended = attendanceData[user.id]?.has(period);
        const vac = vacationData[user.id];

        // Default style
        let bg = 'white';
        let content = null;
        let color = '#2d3748';

        // Vacation Logic
        if (vac) {
            if (vac.type === 'full') {
                // Full Day: Always Green background
                bg = '#c6f6d5'; // Green-100
                color = '#22543d';
                content = vac.reason ? `월차\n(${vac.reason})` : '월차';
            } else if (vac.type === 'half') {
                // Half Day
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
                bg = '#fed7d7'; // Red-100
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
                    cursor: 'pointer', // Add cursor pointer to indicate interactivity
                    userSelect: 'none' // Prevent text selection on rapid clicks
                }}
            >
                {content}
            </div>
        );
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                            {/* Periods 1-7 */}
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
