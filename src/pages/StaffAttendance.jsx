import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const StaffAttendance = ({ onBack }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [branch, setBranch] = useState('망미점');

    const [displayRows, setDisplayRows] = useState([]);

    const [attendanceData, setAttendanceData] = useState({});
    const [vacationData, setVacationData] = useState({});
    const [loading, setLoading] = useState(false);

    const [highlightedSeat, setHighlightedSeat] = useState(null);

    // Fade animation for data refresh only (not swipe)
    const [fade, setFade] = useState(false);

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
        setFade(true);
        const timer = setTimeout(() => {
            fetchData();
            setFade(false);
        }, 150);
        return () => clearTimeout(timer);
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

            const { data: memoData, error: memoError } = await supabase
                .from('attendance_memos')
                .select('*')
                .eq('date', selectedDate)
                .order('created_at', { ascending: true });

            if (memoError) console.log('Memo fetch error:', memoError);

            // Process Users (1-102 + Unassigned)
            const MAX_SEATS = 102;
            const fullRows = [];
            const userMap = {};
            const unassignedUsers = [];

            (userData || []).forEach(u => {
                if (u.seat_number) {
                    userMap[u.seat_number] = u;
                } else {
                    unassignedUsers.push(u);
                }
            });

            for (let i = 1; i <= MAX_SEATS; i++) {
                if (userMap[i]) {
                    fullRows.push(userMap[i]);
                } else {
                    fullRows.push({
                        id: `empty_${i}`,
                        seat_number: i,
                        name: '공석',
                        isEmpty: true
                    });
                }
            }

            unassignedUsers.forEach(u => {
                fullRows.push({ ...u, isUnassigned: true, seat_number: null });
            });

            setDisplayRows(fullRows);

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

    const toggleAttendance = async (user, period) => {
        if (user.isEmpty) return;

        const userId = user.id;
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
                await supabase.from('attendance_logs').delete().eq('user_id', userId).eq('date', selectedDate).eq('period', period);
            } else {
                await supabase.from('attendance_logs').insert({ user_id: userId, date: selectedDate, period: period });
            }
        } catch (error) {
            console.error('Attendance toggle error:', error);
            fetchData();
        }
    };

    const addMemo = async () => {
        if (!newMemo.trim()) return;
        try {
            const { data, error } = await supabase.from('attendance_memos').insert({
                date: selectedDate, branch: branch, content: newMemo.trim()
            }).select().single();
            if (error) throw error;
            setMemos(prev => [...prev, data]);
            setNewMemo('');
        } catch (error) {
            alert('참고사항 등록 실패');
        }
    };

    const deleteMemo = async (id) => {
        if (!window.confirm('삭제하시겠습니까?')) return;
        try {
            const { error } = await supabase.from('attendance_memos').delete().eq('id', id);
            if (error) throw error;
            setMemos(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            alert('삭제 실패');
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

    const handleNameClick = (seatNum) => {
        if (!seatNum) return;
        setHighlightedSeat(highlightedSeat === seatNum ? null : seatNum);
    };

    const getSeatStyle = (seatNum) => {
        let borderBottom = '1px solid #edf2f7';
        let bgColor = 'white';
        const thickBorderSeats = [7, 17, 22, 27, 32, 37, 42, 47, 52, 58, 62, 66, 70, 74, 78, 82, 83, 87, 90, 93, 96, 99];
        const thinBorderSeats = [9, 11, 13, 15, 50];

        if (thickBorderSeats.includes(seatNum)) borderBottom = '3px solid #718096';
        else if (thinBorderSeats.includes(seatNum)) borderBottom = '1px solid #718096';

        if (seatNum >= 8 && seatNum <= 17) bgColor = '#edf2f7';
        else if (seatNum === 53 || seatNum === 54) bgColor = '#cbd5e0';
        else if (seatNum === 83) bgColor = '#fed7d7';

        return { borderBottom, bgColor };
    };

    const renderCell = (user, period, isRowHighlighted) => {
        const isAttended = attendanceData[user.id]?.has(period);
        const vac = vacationData[user.id];
        const isDeactivated = user.isEmpty || user.isUnassigned;

        let bg = 'white';
        let content = null;
        let color = '#2d3748';

        if (isDeactivated) {
            bg = '#f7fafc';
            color = '#cbd5e0';
        } else if (isRowHighlighted) {
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
            if (!content && (bg === 'white' || bg === '#ebf8ff' || bg === '#f7fafc')) {
                if (!isDeactivated) {
                    bg = '#fed7d7';
                    color = '#c53030';
                }
                content = 'X';
            }
        }

        return (
            <div
                onClick={() => !isDeactivated && toggleAttendance(user, period)}
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
                    cursor: isDeactivated ? 'default' : 'pointer',
                    userSelect: 'none'
                }}
            >
                {content}
            </div>
        );
    };

    // Width constants
    const SEAT_WIDTH = '40px';
    const NAME_WIDTH = '60px';
    const PERIOD_WIDTH = '60px'; // Wide enough for drag

    // Header total height (Date + Period)
    const HEADER_DATE_HEIGHT = '35px';
    const HEADER_PERIOD_HEIGHT = '30px';
    const HEADER_TOTAL_HEIGHT = '65px';

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
            {/* Top Bar */}
            <div style={{ padding: '10px 10px 5px 10px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                            display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'
                        }}
                    >
                        오늘 출석 참고사항
                        {memos.length > 0 && (
                            <span style={{
                                color: '#38a169', background: 'white', width: '20px', height: '20px',
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.8rem', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}>
                                {memos.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Table Area (Scroll Container) */}
            <div style={{
                flex: 1,
                overflow: 'auto', // Enables both vertical and horizontal scroll
                position: 'relative'
            }}>
                {/* 1. Header (Sticky Top) */}
                <div style={{
                    display: 'flex',
                    position: 'sticky', top: 0, zIndex: 30,
                    backgroundColor: '#f7fafc',
                    width: 'max-content', // Allow content to determine width
                    minWidth: '100%',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                    {/* 1-A. Sticky Columns (Left) */}
                    <div style={{
                        position: 'sticky', left: 0, zIndex: 40,
                        display: 'flex', height: HEADER_TOTAL_HEIGHT,
                        backgroundColor: '#f7fafc',
                        boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' // Shadow to show separation
                    }}>
                        <div style={{ width: SEAT_WIDTH, borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', color: '#4a5568' }}>좌석</div>
                        <div style={{ width: NAME_WIDTH, borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', color: '#4a5568' }}>이름</div>
                    </div>

                    {/* 1-B. Scrollable Header (Right) */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {/* Row 1: Date (Merged) */}
                        <div style={{
                            height: HEADER_DATE_HEIGHT,
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: '#f7fafc',
                            gap: '15px'
                        }}>
                            <button onClick={() => changeDate(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 5px' }}>
                                <ChevronLeft size={20} color="#4a5568" strokeWidth={2.5} />
                            </button>
                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2d3748', minWidth: '120px', textAlign: 'center' }}>
                                {formatDateDisplay(selectedDate)}
                            </span>
                            <button onClick={() => changeDate(1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 5px' }}>
                                <ChevronRight size={20} color="#4a5568" strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Row 2: Periods */}
                        <div style={{ display: 'flex', height: HEADER_PERIOD_HEIGHT }}>
                            {[1, 2, 3, 4, 5, 6, 7].map(p => (
                                <div key={p} style={{ width: PERIOD_WIDTH, borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', color: '#4a5568' }}>{p}</div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. Body (Rows) */}
                <div style={{
                    width: 'max-content', minWidth: '100%',
                    opacity: fade ? 0.5 : 1, transition: 'opacity 0.2s',
                    paddingBottom: '20px' // Extra space at bottom
                }}>
                    {displayRows.map(user => {
                        const isDeactivated = user.isEmpty || user.isUnassigned;
                        const isRowHighlighted = highlightedSeat === user.seat_number && !isDeactivated;
                        const { borderBottom, bgColor } = getSeatStyle(user.seat_number);

                        let finalSeatNameBg = bgColor;
                        let fontColor = '#2d3748';
                        let fontWeight = 'bold';

                        if (isRowHighlighted) {
                            finalSeatNameBg = '#ebf8ff';
                        } else if (isDeactivated) {
                            finalSeatNameBg = '#f7fafc';
                            fontColor = '#cbd5e0';
                            fontWeight = 'normal';
                        }

                        return (
                            <div key={user.id} style={{ display: 'flex', height: '30px', borderBottom: borderBottom }}>
                                {/* Sticky Left Columns */}
                                <div style={{
                                    position: 'sticky', left: 0, zIndex: 10,
                                    display: 'flex',
                                    boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)'
                                }}>
                                    {/* Highlight Border Overlay for sticky part */}
                                    {isRowHighlighted && (
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderTop: '2px solid #3182ce', borderBottom: '2px solid #3182ce', borderLeft: '2px solid #3182ce', pointerEvents: 'none', zIndex: 20 }} />
                                    )}

                                    <div style={{
                                        width: SEAT_WIDTH, borderRight: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: finalSeatNameBg, color: isDeactivated ? '#cbd5e0' : '#a0aec0', fontSize: '0.8rem'
                                    }}>
                                        {user.seat_number || '-'}
                                    </div>
                                    <div
                                        onClick={() => handleNameClick(user.seat_number)}
                                        style={{
                                            width: NAME_WIDTH, borderRight: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: finalSeatNameBg, color: fontColor, fontSize: '0.9rem', fontWeight: fontWeight,
                                            cursor: isDeactivated ? 'default' : 'pointer'
                                        }}
                                    >
                                        {user.name}
                                    </div>
                                </div>

                                {/* Scrollable Right Columns */}
                                <div style={{ display: 'flex', position: 'relative' }}>
                                    {/* Highlight Border Overlay for scrollable part */}
                                    {isRowHighlighted && (
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderTop: '2px solid #3182ce', borderBottom: '2px solid #3182ce', pointerEvents: 'none', zIndex: 5 }} />
                                        // Note: borderRight is missing to avoid closing the box on every cell, but actually we want a border around the whole row. 
                                        // Since we split the row into Sticky vs Scrollable, drawing a contiguous border is hard.
                                        // I'll stick to Top/Bottom borders for the row effect in the scrollable part.
                                    )}

                                    {[1, 2, 3, 4, 5, 6, 7].map(p => (
                                        <div key={p} style={{ width: PERIOD_WIDTH }}>
                                            {renderCell(user, p, isRowHighlighted)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Memo Modal */}
            {showMemoModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', maxHeight: '80vh',
                        display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748' }}>{selectedDate} 출석 참고사항</h3>
                            <button onClick={() => setShowMemoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                <X size={24} color="#a0aec0" />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f7fafc' }}>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {memos.length === 0 && <li style={{ color: '#a0aec0', textAlign: 'center' }}>참고사항이 없습니다.</li>}
                                {memos.map((memo, idx) => (
                                    <li key={memo.id} style={{ background: 'white', padding: '12px', borderRadius: '12px', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                                            <span style={{ fontWeight: 'bold', color: '#3182ce', minWidth: '20px' }}>{idx + 1}.</span>
                                            <span style={{ color: '#4a5568', wordBreak: 'break-all', lineHeight: 1.4 }}>{memo.content}</span>
                                        </div>
                                        <button onClick={() => deleteMemo(memo.id)} style={{ background: '#fff5f5', color: '#e53e3e', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '0.8rem', cursor: 'pointer', marginLeft: '10px', fontWeight: 'bold' }}>삭제</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', background: 'white', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                            <input type="text" value={newMemo} onChange={(e) => setNewMemo(e.target.value)} placeholder="참고사항을 입력하세요" style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem', outline: 'none' }} onKeyPress={(e) => e.key === 'Enter' && addMemo()} />
                            <button onClick={addMemo} style={{ background: '#3182ce', color: 'white', border: 'none', borderRadius: '10px', padding: '0 20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><Plus size={18} />등록</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffAttendance;
