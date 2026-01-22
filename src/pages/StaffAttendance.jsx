import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const StaffAttendance = ({ onBack }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [branch, setBranch] = useState('망미점');
    const [users, setUsers] = useState([]);
    const [attendanceData, setAttendanceData] = useState({});
    const [vacationData, setVacationData] = useState({});
    const [loading, setLoading] = useState(false);

    // Highlight State
    const [highlightedSeat, setHighlightedSeat] = useState(null);

    // Animation State
    const [fade, setFade] = useState(false);

    // Swipe State
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50;

    // Memo State
    const [memos, setMemos] = useState([]);
    const [showMemoModal, setShowMemoModal] = useState(false);
    const [newMemo, setNewMemo] = useState('');

    useEffect(() => {
        const updateDate = () => {
            const today = new Date().toISOString().split('T')[0];
            setSelectedDate(today);
        };
        window.addEventListener('focus', updateDate);
        return () => window.removeEventListener('focus', updateDate);
    }, []);

    useEffect(() => {
        setFade(true); // Trigger fade out
        const timer = setTimeout(() => {
            fetchData();
            setFade(false); // Trigger fade in after small delay
        }, 150);
        return () => clearTimeout(timer);
    }, [selectedDate, branch]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Users
            const { data: userData, error: userError } = await supabase
                .from('authorized_users')
                .select('*')
                .eq('branch', branch)
                .order('seat_number', { ascending: true, nullsLast: true });

            if (userError) throw userError;

            // Fetch Attendance
            const { data: logData, error: logError } = await supabase
                .from('attendance_logs')
                .select('user_id, period')
                .eq('date', selectedDate);

            if (logError) throw logError;

            // Fetch Vacations
            const { data: vacData, error: vacError } = await supabase
                .from('vacation_requests')
                .select('*')
                .eq('date', selectedDate);

            if (vacError) throw vacError;

            // Fetch Memos
            const { data: memoData, error: memoError } = await supabase
                .from('attendance_memos')
                .select('*')
                .eq('date', selectedDate)
                .order('created_at', { ascending: true });

            // Ignore table not found error initially as user needs to run migration
            if (memoError) {
                console.log('Memo fetch error (table might not exist yet):', memoError);
            }

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

            setMemos(memoData || []);

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

    // Memo Logic
    const addMemo = async () => {
        if (!newMemo.trim()) return;
        try {
            const { data, error } = await supabase
                .from('attendance_memos')
                .insert({
                    date: selectedDate,
                    branch: branch,
                    content: newMemo.trim()
                })
                .select()
                .single();

            if (error) throw error;

            setMemos(prev => [...prev, data]);
            setNewMemo('');
        } catch (error) {
            console.error('Error adding memo:', error);
            alert('참고사항 등록에 실패했습니다. (테이블이 생성되었는지 확인해주세요)');
        }
    };

    const deleteMemo = async (id) => {
        if (!window.confirm('삭제하시겠습니까?')) return;
        try {
            const { error } = await supabase
                .from('attendance_memos')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setMemos(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error('Error deleting memo:', error);
            alert('삭제 실패했습니다.');
        }
    };

    const changeDate = (days) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const formatDateDisplay = (dateStr) => {
        const date = new Date(dateStr);
        return format(date, 'yyyy.M.d(EEE)', { locale: ko });
    };

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
            changeDate(1);
        }
        if (isRightSwipe) {
            changeDate(-1);
        }
    };

    const handleNameClick = (seatNum) => {
        if (highlightedSeat === seatNum) {
            setHighlightedSeat(null);
        } else {
            setHighlightedSeat(seatNum);
        }
    };

    // Helper to determine row style based on seat number
    const getSeatStyle = (seatNum) => {
        let borderBottom = '1px solid #edf2f7'; // Default
        let bgColor = 'white'; // Default

        // Border Logic
        const thickBorderSeats = [7, 17, 22, 27, 32, 37, 42, 47, 52, 58, 62, 66, 70, 74, 78, 82, 83, 87, 90, 93, 96, 99];
        const thinBorderSeats = [9, 11, 13, 15, 50];

        if (thickBorderSeats.includes(seatNum)) borderBottom = '3px solid #718096'; // Stronger contrast
        else if (thinBorderSeats.includes(seatNum)) borderBottom = '1px solid #718096'; // Distinct thin line

        // Color Logic
        if (seatNum >= 8 && seatNum <= 17) bgColor = '#edf2f7'; // Light Gray
        else if (seatNum === 53 || seatNum === 54) bgColor = '#cbd5e0'; // Gray
        else if (seatNum === 83) bgColor = '#fed7d7'; // Light Pink

        return { borderBottom, bgColor };
    };

    const renderCell = (user, period, isRowHighlighted, seatBgColor) => {
        const isAttended = attendanceData[user.id]?.has(period);
        const vac = vacationData[user.id];

        let bg = 'white';
        let content = null;
        let color = '#2d3748';

        if (isRowHighlighted) {
            bg = '#ebf8ff';
        }

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
            if (bg === 'white' || bg === '#ebf8ff') {
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
            style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Header Area */}
            <div style={{ padding: '0 0 10px 0' }}>
                {/* Row 1: Back + Title + Memo Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', marginLeft: '-8px' }}>
                            <ChevronLeft size={26} color="#2d3748" />
                        </button>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 0 4px', lineHeight: 1 }}>출석부</h2>
                    </div>

                    {/* Memo Button */}
                    <button
                        onClick={() => setShowMemoModal(true)}
                        style={{
                            background: '#ebf8ff',
                            border: '1px solid #bee3f8',
                            borderRadius: '20px',
                            padding: '6px 12px',
                            fontSize: '0.85rem',
                            color: '#2b6cb0',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        오늘 출석 참고사항
                        {memos.length > 0 && (
                            <span style={{
                                color: '#38a169',
                                background: 'white',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}>
                                {memos.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Row 2: Date Navigation (Centered) */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                }}>
                    <button
                        onClick={() => changeDate(-1)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '5px' }}
                    >
                        <ChevronLeft size={24} color="#4a5568" strokeWidth={2.5} />
                    </button>

                    <span style={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: '#2d3748',
                        width: '140px',
                        textAlign: 'center',
                        transition: 'opacity 0.2s',
                        opacity: fade ? 0.3 : 1
                    }}>
                        {formatDateDisplay(selectedDate)}
                    </span>

                    <button
                        onClick={() => changeDate(1)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '5px' }}
                    >
                        <ChevronRight size={24} color="#4a5568" strokeWidth={2.5} />
                    </button>
                </div>
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
            <div style={{
                flex: 1,
                overflowY: 'auto',
                transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
                opacity: fade ? 0.5 : 1,
                transform: fade ? 'scale(0.99)' : 'scale(1)'
            }}>
                {users.map(user => {
                    const isRowHighlighted = highlightedSeat === user.seat_number;
                    const { borderBottom, bgColor: seatBgColor } = getSeatStyle(user.seat_number);
                    const finalSeatNameBg = isRowHighlighted ? '#ebf8ff' : seatBgColor;

                    return (
                        <div key={user.id} style={{ display: 'flex', height: '50px', borderBottom: borderBottom, position: 'relative' }}>
                            {isRowHighlighted && (
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    border: '2px solid #3182ce',
                                    pointerEvents: 'none',
                                    zIndex: 10
                                }} />
                            )}

                            <div style={{
                                width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #edf2f7',
                                background: finalSeatNameBg,
                                fontSize: '0.8rem', color: '#a0aec0'
                            }}>
                                {user.seat_number || '-'}
                            </div>

                            <div
                                onClick={() => handleNameClick(user.seat_number)}
                                style={{
                                    width: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #edf2f7',
                                    fontWeight: 'bold', fontSize: '0.9rem', color: '#2d3748',
                                    background: finalSeatNameBg,
                                    cursor: 'pointer'
                                }}
                            >
                                {user.name}
                            </div>

                            {[1, 2, 3, 4, 5, 6, 7].map(p => (
                                <div key={p} style={{ flex: 1 }}>
                                    {renderCell(user, p, isRowHighlighted, finalSeatNameBg)}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* Memo Modal */}
            {showMemoModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', maxHeight: '80vh',
                        display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        animation: 'slideUp 0.2s ease-out'
                    }}>
                        <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748' }}>{selectedDate} 출석 참고사항</h3>
                            <button onClick={() => setShowMemoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                <X size={24} color="#a0aec0" />
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f7fafc' }}>
                            {memos.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#a0aec0', padding: '40px 0' }}>
                                    <div style={{ marginBottom: '10px' }}>📝</div>
                                    등록된 참고사항이 없습니다.
                                </div>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {memos.map((memo, idx) => (
                                        <li key={memo.id} style={{ background: 'white', padding: '12px', borderRadius: '12px', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                                                <span style={{ fontWeight: 'bold', color: '#3182ce', minWidth: '20px' }}>{idx + 1}.</span>
                                                <span style={{ color: '#4a5568', wordBreak: 'break-all', lineHeight: 1.4 }}>{memo.content}</span>
                                            </div>
                                            <button
                                                onClick={() => deleteMemo(memo.id)}
                                                style={{ background: '#fff5f5', color: '#e53e3e', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '0.8rem', cursor: 'pointer', marginLeft: '10px', fontWeight: 'bold' }}
                                            >
                                                삭제
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', background: 'white', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                            <input
                                type="text"
                                value={newMemo}
                                onChange={(e) => setNewMemo(e.target.value)}
                                placeholder="참고사항을 입력하세요"
                                style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem', outline: 'none' }}
                                onKeyPress={(e) => e.key === 'Enter' && addMemo()}
                            />
                            <button
                                onClick={addMemo}
                                style={{ background: '#3182ce', color: 'white', border: 'none', borderRadius: '10px', padding: '0 20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                <Plus size={18} />
                                등록
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffAttendance;
