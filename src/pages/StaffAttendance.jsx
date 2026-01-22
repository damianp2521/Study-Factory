import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Plus, Calendar as CalendarIcon, ZoomIn, ZoomOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, getDate, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';

const StaffAttendance = ({ onBack }) => {
    // Current System Date (Fixed "Today")
    const [today] = useState(new Date());

    // View State (Month)
    const [currentViewDate, setCurrentViewDate] = useState(new Date());

    // Zoom State (1.0 = Normal, 0.6 = Compact)
    const [scale, setScale] = useState(1.0);

    // Branch
    const [branch, setBranch] = useState('망미점');

    // Data
    const [displayRows, setDisplayRows] = useState([]);
    const [attendanceData, setAttendanceData] = useState(new Set());
    const [vacationData, setVacationData] = useState({});
    const [memos, setMemos] = useState([]);

    // UI State
    const [loading, setLoading] = useState(false);
    const [highlightedSeat, setHighlightedSeat] = useState(null);
    const [showMemoModal, setShowMemoModal] = useState(false);
    const [newMemo, setNewMemo] = useState('');

    // Refs
    const scrollContainerRef = useRef(null);

    // Dynamic Constants based on Scale
    const BASE_SEAT_WIDTH = 40;
    const BASE_NAME_WIDTH = 60;
    const BASE_PERIOD_WIDTH = 50;
    const BASE_ROW_HEIGHT = 30;
    const BASE_HEADER_DATE_HEIGHT = 35;
    const BASE_HEADER_PERIOD_HEIGHT = 30;

    const SEAT_WIDTH = BASE_SEAT_WIDTH * scale;
    const NAME_WIDTH = BASE_NAME_WIDTH * scale;
    const PERIOD_WIDTH = BASE_PERIOD_WIDTH * scale;
    const ROW_HEIGHT = BASE_ROW_HEIGHT * scale;
    const HEADER_DATE_HEIGHT = BASE_HEADER_DATE_HEIGHT * scale;
    const HEADER_PERIOD_HEIGHT = BASE_HEADER_PERIOD_HEIGHT * scale;
    const HEADER_TOTAL_HEIGHT = HEADER_DATE_HEIGHT + HEADER_PERIOD_HEIGHT;

    const DAY_WIDTH = PERIOD_WIDTH * 7;

    // Derived: Days in current view month
    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentViewDate),
        end: endOfMonth(currentViewDate)
    });

    useEffect(() => {
        fetchData();
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = 0;
        }
    }, [currentViewDate, branch]);

    useLayoutEffect(() => {
        if (isSameDay(startOfMonth(today), startOfMonth(currentViewDate))) {
            scrollToToday();
        }
    }, [currentViewDate, scale]); // Re-scroll on scale change too

    const fetchData = async () => {
        setLoading(true);
        try {
            const startDate = format(startOfMonth(currentViewDate), 'yyyy-MM-dd');
            const endDate = format(endOfMonth(currentViewDate), 'yyyy-MM-dd');

            const { data: userData, error: userError } = await supabase
                .from('authorized_users')
                .select('*')
                .eq('branch', branch)
                .order('seat_number', { ascending: true, nullsLast: true });
            if (userError) throw userError;

            const { data: logData, error: logError } = await supabase
                .from('attendance_logs')
                .select('user_id, date, period')
                .gte('date', startDate)
                .lte('date', endDate);
            if (logError) throw logError;

            const { data: vacData, error: vacError } = await supabase
                .from('vacation_requests')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate);
            if (vacError) throw vacError;

            const todayStr = format(today, 'yyyy-MM-dd');
            const { data: memoData, error: memoError } = await supabase
                .from('attendance_memos')
                .select('*')
                .eq('date', todayStr)
                .order('created_at', { ascending: true });

            if (memoError) console.log('Memo error', memoError);

            const MAX_SEATS = 102;
            const fullRows = [];
            const userMap = {};
            const unassignedUsers = [];

            (userData || []).forEach(u => {
                if (u.seat_number) userMap[u.seat_number] = u;
                else unassignedUsers.push(u);
            });

            for (let i = 1; i <= MAX_SEATS; i++) {
                if (userMap[i]) fullRows.push(userMap[i]);
                else fullRows.push({ id: `empty_${i}`, seat_number: i, name: '공석', isEmpty: true });
            }

            unassignedUsers.forEach(u => {
                fullRows.push({ ...u, isUnassigned: true, seat_number: null });
            });

            setDisplayRows(fullRows);

            const attSet = new Set();
            (logData || []).forEach(l => {
                attSet.add(`${l.user_id}_${l.date}_${l.period}`);
            });
            setAttendanceData(attSet);

            const vacMap = {};
            (vacData || []).forEach(v => {
                vacMap[`${v.user_id}_${v.date}`] = v;
            });
            setVacationData(vacMap);

            setMemos(memoData || []);

        } catch (error) {
            console.error('Error fetching data:', error);
            alert('데이터 로딩 실패');
        } finally {
            setLoading(false);
        }
    };

    const toggleAttendance = async (user, dateStr, period) => {
        if (user.isEmpty) return;

        const key = `${user.id}_${dateStr}_${period}`;
        const isAttended = attendanceData.has(key);

        setAttendanceData(prev => {
            const next = new Set(prev);
            if (isAttended) next.delete(key);
            else next.add(key);
            return next;
        });

        try {
            if (isAttended) {
                await supabase.from('attendance_logs').delete()
                    .eq('user_id', user.id).eq('date', dateStr).eq('period', period);
            } else {
                await supabase.from('attendance_logs').insert({
                    user_id: user.id, date: dateStr, period: period
                });
            }
        } catch (error) {
            console.error('Toggle Error:', error);
            fetchData();
        }
    };

    const addMemo = async () => {
        if (!newMemo.trim()) return;
        const todayStr = format(today, 'yyyy-MM-dd');
        try {
            const { data, error } = await supabase.from('attendance_memos').insert({
                date: todayStr, branch, content: newMemo.trim()
            }).select().single();
            if (error) throw error;
            setMemos(prev => [...prev, data]);
            setNewMemo('');
        } catch (e) { alert('메모 등록 실패'); }
    };

    const deleteMemo = async (id) => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
            await supabase.from('attendance_memos').delete().eq('id', id);
            setMemos(prev => prev.filter(m => m.id !== id));
        } catch (e) { alert('삭제 실패'); }
    };

    const changeMonth = (val) => {
        setCurrentViewDate(prev => addMonths(prev, val));
    };

    const scrollToToday = () => {
        if (!isSameDay(startOfMonth(today), startOfMonth(currentViewDate))) {
            setCurrentViewDate(today);
            return;
        }
        if (scrollContainerRef.current) {
            const dayIndex = getDate(today) - 1;
            const scrollLeft = dayIndex * DAY_WIDTH;
            scrollContainerRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
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

    const renderCell = (user, dateStr, period, isRowHighlighted) => {
        const key = `${user.id}_${dateStr}_${period}`;
        const isAttended = attendanceData.has(key);
        const vac = vacationData[`${user.id}_${dateStr}`];
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
                content = vac.reason ? `월차` : '월차'; // Truncate detail for zoom
            } else if (vac.type === 'half') {
                const isAm = (vac.periods || []).includes(1);
                if (isAm && period <= 4) {
                    bg = '#c6f6d5';
                    color = '#22543d';
                    content = '오전';
                } else if (!isAm && period >= 4) {
                    bg = '#c6f6d5';
                    color = '#22543d';
                    content = '오후';
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
                onClick={() => !isDeactivated && toggleAttendance(user, dateStr, period)}
                style={{
                    width: PERIOD_WIDTH, height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: bg, color, fontSize: `${0.8 * scale}rem`, fontWeight: 'bold',
                    borderRight: '1px solid #e2e8f0',
                    whiteSpace: 'pre-line', textAlign: 'center', lineHeight: 1.1,
                    cursor: isDeactivated ? 'default' : 'pointer',
                    userSelect: 'none'
                }}
            >
                {content}
            </div>
        );
    };

    const getHeaderDate = (date) => {
        return format(date, 'M.d(EEE)', { locale: ko });
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
            {/* Top Area Refactored */}
            <div style={{ padding: '10px 10px 5px 10px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

                {/* Left Group */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Title & Back */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', marginLeft: '-5px' }}>
                            <ChevronLeft size={24} color="#2d3748" />
                        </button>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 0 4px', lineHeight: 1, color: '#2d3748' }}>출석부</h2>
                    </div>

                    {/* Month Picker (Moved Left) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <button onClick={() => changeMonth(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px' }}>
                            <ChevronLeft size={20} color="#4a5568" />
                        </button>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748', minWidth: '80px', textAlign: 'center' }}>
                            {format(currentViewDate, 'yyyy.MM')}
                        </span>
                        <button onClick={() => changeMonth(1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px' }}>
                            <ChevronRight size={20} color="#4a5568" />
                        </button>
                    </div>

                    {/* Zoom Controls */}
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                            onClick={() => setScale(1.0)}
                            style={{
                                padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e0',
                                background: scale === 1.0 ? '#edf2f7' : 'white',
                                fontSize: '0.75rem', fontWeight: 'bold', color: '#4a5568', cursor: 'pointer'
                            }}
                        >
                            기본
                        </button>
                        <button
                            onClick={() => setScale(0.6)}
                            style={{
                                padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e0',
                                background: scale === 0.6 ? '#edf2f7' : 'white',
                                fontSize: '0.75rem', fontWeight: 'bold', color: '#4a5568', cursor: 'pointer'
                            }}
                        >
                            축소
                        </button>
                    </div>
                </div>

                {/* Right Group (Stacked Buttons) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    {/* Memo Button */}
                    <button
                        onClick={() => setShowMemoModal(true)}
                        style={{
                            background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '16px',
                            padding: '6px 12px', fontSize: '0.85rem', color: '#2b6cb0', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
                            height: '32px'
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

                    {/* Go to Today Button (Below Memo) */}
                    <button
                        onClick={scrollToToday}
                        style={{
                            background: 'white', border: '1px solid #cbd5e0', borderRadius: '16px',
                            padding: '6px 12px', fontSize: '0.85rem', color: '#4a5568', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)', height: '32px'
                        }}
                    >
                        <CalendarIcon size={16} />
                        오늘로 이동
                    </button>
                </div>
            </div>

            {/* Main Table Area */}
            <div
                ref={scrollContainerRef}
                style={{
                    flex: 1,
                    overflow: 'auto',
                    position: 'relative'
                }}
            >
                {/* 1. Sticky Header Group */}
                <div style={{
                    position: 'sticky', top: 0, zIndex: 30,
                    display: 'flex', width: 'max-content',
                    backgroundColor: '#f7fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                    <div style={{
                        position: 'sticky', left: 0, zIndex: 40,
                        display: 'flex', height: HEADER_TOTAL_HEIGHT,
                        backgroundColor: '#f7fafc',
                        boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ width: SEAT_WIDTH, borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: `${0.85 * scale}rem`, color: '#4a5568' }}>좌석</div>
                        <div style={{ width: NAME_WIDTH, borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: `${0.85 * scale}rem`, color: '#4a5568' }}>이름</div>
                    </div>

                    <div style={{ display: 'flex' }}>
                        {daysInMonth.map(date => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            const isToday = isSameDay(date, today);
                            return (
                                <div key={dateStr} style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{
                                        height: HEADER_DATE_HEIGHT, width: DAY_WIDTH,
                                        borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: isToday ? '#ebf8ff' : '#f7fafc',
                                        color: isToday ? '#2b6cb0' : '#2d3748',
                                        fontWeight: 'bold', fontSize: `${0.9 * scale}rem`
                                    }}>
                                        {getHeaderDate(date)}
                                    </div>
                                    <div style={{ display: 'flex', height: HEADER_PERIOD_HEIGHT }}>
                                        {[1, 2, 3, 4, 5, 6, 7].map(p => (
                                            <div key={p} style={{ width: PERIOD_WIDTH, borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${0.8 * scale}rem`, color: '#718096' }}>
                                                {p}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Body Rows */}
                <div style={{ width: 'max-content', paddingBottom: '20px' }}>
                    {displayRows.map(user => {
                        const isDeactivated = user.isEmpty || user.isUnassigned;
                        const isRowHighlighted = highlightedSeat === user.seat_number && !isDeactivated;
                        const { borderBottom, bgColor } = getSeatStyle(user.seat_number);

                        let stickyBg = bgColor;
                        if (isRowHighlighted) stickyBg = '#ebf8ff';
                        else if (isDeactivated) stickyBg = '#f7fafc';

                        return (
                            <div key={user.id} style={{ display: 'flex', height: ROW_HEIGHT, borderBottom }}>
                                <div style={{
                                    position: 'sticky', left: 0, zIndex: 10,
                                    display: 'flex',
                                    boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)'
                                }}>
                                    {isRowHighlighted && (
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderTop: '2px solid #3182ce', borderBottom: '2px solid #3182ce', borderLeft: '2px solid #3182ce', pointerEvents: 'none', zIndex: 20 }} />
                                    )}

                                    <div style={{
                                        width: SEAT_WIDTH, borderRight: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: stickyBg, color: isDeactivated ? '#cbd5e0' : '#a0aec0', fontSize: `${0.8 * scale}rem`
                                    }}>
                                        {user.seat_number || '-'}
                                    </div>
                                    <div
                                        onClick={() => handleNameClick(user.seat_number)}
                                        style={{
                                            width: NAME_WIDTH, borderRight: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: stickyBg, color: '#2d3748', fontSize: `${0.9 * scale}rem`, fontWeight: isDeactivated ? 'normal' : 'bold',
                                            cursor: isDeactivated ? 'default' : 'pointer'
                                        }}
                                    >
                                        {user.name}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', position: 'relative' }}>
                                    {isRowHighlighted && (
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderTop: '2px solid #3182ce', borderBottom: '2px solid #3182ce', pointerEvents: 'none', zIndex: 5 }} />
                                    )}

                                    {daysInMonth.map(date => {
                                        const dateStr = format(date, 'yyyy-MM-dd');
                                        return (
                                            <div key={dateStr} style={{ display: 'flex' }}>
                                                {[1, 2, 3, 4, 5, 6, 7].map(p => renderCell(user, dateStr, p, isRowHighlighted))}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Memo Modal (Unchanged generally, but uses today as default) */}
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
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748' }}>{format(today, 'yyyy.MM.dd')} 참고사항</h3>
                            <button onClick={() => setShowMemoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                <X size={24} color="#a0aec0" />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f7fafc' }}>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {memos.length === 0 && <li style={{ color: '#a0aec0', textAlign: 'center' }}>등록된 참고사항이 없습니다.</li>}
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
