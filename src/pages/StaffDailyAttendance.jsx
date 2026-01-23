import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { format, startOfMonth, endOfMonth, addDays, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';

// Memoized Cell (Dynamic Height Fixed)
const AttendanceCell = React.memo(({ user, dateStr, period, isRowHighlighted, attendanceData, vacationData, toggleAttendance, width, scale }) => {
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
            content = vac.reason ? `월차` : '월차';
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
                width: width, flexShrink: 0, height: '100%',
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
}, (prev, next) => {
    return (
        prev.scale === next.scale &&
        prev.width === next.width &&
        prev.isRowHighlighted === next.isRowHighlighted &&
        prev.attendanceData === next.attendanceData &&
        prev.vacationData === next.vacationData
    );
});

// Memo Block for Popup (Full Width)
const UserMemoPopup = ({ user, memberMemos, onAdd, onDelete, onClose }) => {
    const [text, setText] = useState('');
    const userMemos = memberMemos.filter(m => m.user_id === user.id);
    const scrollRef = useRef(null);

    const handleAdd = () => {
        if (!text.trim()) return;
        onAdd(user.id, text.trim());
        setText('');
        setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 100);
    };

    return (
        <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            backgroundColor: 'white', borderTop: '2px solid #e2e8f0',
            boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{
                padding: '12px 20px', borderBottom: '1px solid #edf2f7',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: '#f7fafc'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748' }}>
                        {user.name} <span style={{ fontSize: '0.9rem', color: '#718096', fontWeight: 'normal' }}>(좌석 {user.seat_number})</span>
                    </span>
                    <span style={{ fontSize: '0.9rem', color: '#4a5568', background: '#edf2f7', padding: '2px 8px', borderRadius: '4px' }}>
                        참고사항 {userMemos.length}건
                    </span>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        padding: '8px', borderRadius: '50%', border: 'none', background: 'white',
                        cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <X size={20} color="#4a5568" />
                </button>
            </div>

            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f8fafc' }}>
                {userMemos.length === 0 && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>
                        등록된 참고사항이 없습니다.
                    </div>
                )}
                {userMemos.map(m => (
                    <div key={m.id} style={{
                        background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
                        padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                        <span style={{ fontSize: '0.95rem', color: '#2d3748', flex: 1, wordBreak: 'break-all', lineHeight: 1.5 }}>
                            {m.content}
                        </span>
                        <button
                            onClick={() => onDelete(m.id)}
                            style={{
                                background: '#fff5f5', color: '#e53e3e', border: 'none', borderRadius: '6px',
                                padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer', marginLeft: '10px',
                                whiteSpace: 'nowrap', fontWeight: 'bold'
                            }}
                        >
                            삭제
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ padding: '15px 20px', borderTop: '1px solid #edf2f7', backgroundColor: 'white', display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="새로운 참고사항을 입력하세요..."
                    style={{
                        flex: 1, border: '1px solid #cbd5e0', borderRadius: '8px',
                        padding: '10px 12px', fontSize: '0.95rem', outline: 'none'
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAdd();
                    }}
                />
                <button
                    onClick={handleAdd}
                    style={{
                        background: '#3182ce', color: 'white', border: 'none', borderRadius: '8px',
                        padding: '0 20px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer',
                        whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px'
                    }}
                >
                    <Plus size={18} /> 등록
                </button>
            </div>
        </div>
    );
};

const StaffDailyAttendance = ({ onBack }) => {
    const [today] = useState(new Date());
    // Fixed: Initialize navigation with today, allow changes
    const [currentViewDate, setCurrentViewDate] = useState(new Date());
    const [scale, setScale] = useState(1.0);
    const [branch, setBranch] = useState('망미점');

    const [displayRows, setDisplayRows] = useState([]);
    const [attendanceData, setAttendanceData] = useState(new Set());
    const [vacationData, setVacationData] = useState({});
    const [dailyMemos, setDailyMemos] = useState([]);
    const [memberMemos, setMemberMemos] = useState([]);

    const [loading, setLoading] = useState(false);
    const [highlightedSeat, setHighlightedSeat] = useState(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [showMemoModal, setShowMemoModal] = useState(false);
    const [newMemo, setNewMemo] = useState('');

    const scrollContainerRef = useRef(null);
    const contentRef = useRef(null);
    const [touchStartDist, setTouchStartDist] = useState(null);
    const [startScale, setStartScale] = useState(1.0);

    // Dynamic Constants
    const BASE_SEAT_WIDTH = 50;
    const BASE_NAME_WIDTH = 80;
    const BASE_PERIOD_WIDTH = 45;
    const BASE_ROW_HEIGHT = 40;
    const BASE_HEADER_DATE_HEIGHT = 40;
    const BASE_HEADER_PERIOD_HEIGHT = 35;

    const SEAT_WIDTH = BASE_SEAT_WIDTH * scale;
    const NAME_WIDTH = BASE_NAME_WIDTH * scale;
    const PERIOD_WIDTH = BASE_PERIOD_WIDTH * scale;
    const ROW_HEIGHT = BASE_ROW_HEIGHT * scale;
    const HEADER_DATE_HEIGHT = BASE_HEADER_DATE_HEIGHT * scale;
    const HEADER_PERIOD_HEIGHT = BASE_HEADER_PERIOD_HEIGHT * scale;
    const HEADER_TOTAL_HEIGHT = HEADER_DATE_HEIGHT + HEADER_PERIOD_HEIGHT;

    const DAY_WIDTH = PERIOD_WIDTH * 7;

    const daysInView = useMemo(() => [currentViewDate], [currentViewDate]);

    // Row Reordering Logic
    const sortedRows = useMemo(() => {
        if (!highlightedSeat) return displayRows;
        const newRows = [...displayRows];
        const targetIndex = newRows.findIndex(r => r.seat_number === highlightedSeat);
        if (targetIndex === -1) return displayRows;
        const [targetRow] = newRows.splice(targetIndex, 1);
        const insertIndex = Math.min(2, newRows.length);
        newRows.splice(insertIndex, 0, targetRow);
        return newRows;
    }, [displayRows, highlightedSeat]);

    const selectedUser = useMemo(() => {
        return displayRows.find(r => r.seat_number === highlightedSeat);
    }, [displayRows, highlightedSeat]);

    // Fetch on Date Change
    useEffect(() => {
        fetchData();
    }, [currentViewDate, branch]);

    // Auto-fit Logic: Always Active
    const fitScale = () => {
        if (scrollContainerRef.current) {
            const containerWidth = scrollContainerRef.current.clientWidth;
            // Width of fixed headers + width of day data
            const contentRequiredWidth = BASE_SEAT_WIDTH + BASE_NAME_WIDTH + (BASE_PERIOD_WIDTH * 7);
            const newScale = containerWidth / contentRequiredWidth;
            // Allow scale to exactly fit, bounded reasonably
            setScale(Math.max(newScale, 0.5));
        }
    };

    // Initial Fit & Resize Listener
    useEffect(() => {
        fitScale();
        window.addEventListener('resize', fitScale);
        return () => window.removeEventListener('resize', fitScale);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch ONLY current view date
            const dateStr = format(currentViewDate, 'yyyy-MM-dd');
            // Use same date for start/end to fetch only one day
            const startDate = dateStr;
            const endDate = dateStr;

            const [userRes, logRes, vacRes, dailyMemoRes, memberMemoRes] = await Promise.all([
                supabase.from('authorized_users').select('*').eq('branch', branch).order('seat_number', { ascending: true, nullsLast: true }),
                supabase.from('attendance_logs').select('user_id, date, period').gte('date', startDate).lte('date', endDate),
                supabase.from('vacation_requests').select('*').gte('date', startDate).lte('date', endDate),
                supabase.from('attendance_memos').select('*').eq('date', dateStr).order('created_at', { ascending: true }),
                supabase.from('member_memos').select('*').order('created_at', { ascending: true })
            ]);

            if (userRes.error) throw userRes.error;
            if (logRes.error) throw logRes.error;  // etc...

            const MAX_SEATS = 102;
            const fullRows = [];
            const userMap = {};
            const unassignedUsers = [];
            (userRes.data || []).forEach(u => {
                if (u.seat_number) userMap[u.seat_number] = u;
                else unassignedUsers.push(u);
            });
            for (let i = 1; i <= MAX_SEATS; i++) {
                if (userMap[i]) fullRows.push(userMap[i]);
                else fullRows.push({ id: `empty_${i}`, seat_number: i, name: '공석', isEmpty: true });
            }
            unassignedUsers.forEach(u => fullRows.push({ ...u, isUnassigned: true, seat_number: null }));
            setDisplayRows(fullRows);

            const attSet = new Set();
            (logRes.data || []).forEach(l => attSet.add(`${l.user_id}_${l.date}_${l.period}`));
            setAttendanceData(attSet);

            const vacMap = {};
            (vacRes.data || []).forEach(v => vacMap[`${v.user_id}_${v.date}`] = v);
            setVacationData(vacMap);

            setDailyMemos(dailyMemoRes.data || []);
            setMemberMemos(memberMemoRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
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
            if (isAttended) await supabase.from('attendance_logs').delete().eq('user_id', user.id).eq('date', dateStr).eq('period', period);
            else await supabase.from('attendance_logs').insert({ user_id: user.id, date: dateStr, period: period });
        } catch (e) { fetchData(); }
    };

    const addDailyMemo = async (content) => {
        if (!content) return;
        try {
            const { data, error } = await supabase.from('attendance_memos').insert({ date: format(currentViewDate, 'yyyy-MM-dd'), branch, content }).select().single();
            if (error) throw error;
            setDailyMemos(prev => [...prev, data]);
        } catch (e) { alert('메모 등록 실패'); }
    };
    const deleteDailyMemo = async (id) => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
            await supabase.from('attendance_memos').delete().eq('id', id);
            setDailyMemos(prev => prev.filter(m => m.id !== id));
        } catch (e) { alert('삭제 실패'); }
    };
    const addMemberMemo = async (userId, content) => {
        try {
            const { data, error } = await supabase.from('member_memos').insert({ user_id: userId, content }).select().single();
            if (error) throw error;
            setMemberMemos(prev => [...prev, data]);
        } catch (e) { alert('메모 등록 실패'); }
    };
    const deleteMemberMemo = async (id) => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
            await supabase.from('member_memos').delete().eq('id', id);
            setMemberMemos(prev => prev.filter(m => m.id !== id));
        } catch (e) { alert('삭제 실패'); }
    };

    const changeDate = (days) => {
        setCurrentViewDate(prev => addDays(prev, days));
    };

    const handleNameClick = (seatNum) => {
        if (!seatNum) return;
        if (highlightedSeat === seatNum) {
            if (isPopupOpen) {
                setIsPopupOpen(false);
                setHighlightedSeat(null);
            } else {
                setIsPopupOpen(true);
            }
        } else {
            setHighlightedSeat(seatNum);
            setIsPopupOpen(true);
        }
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

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
            {/* 2-Row Layout Header */}
            <div style={{ padding: '15px 10px 10px 10px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>

                {/* Row 1: Centered Date Navigator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                    <button onClick={() => changeDate(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '5px' }}>
                        <ChevronLeft size={24} color="#4a5568" />
                    </button>
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2d3748', minWidth: '150px', textAlign: 'center' }}>
                        {format(currentViewDate, 'yyyy.MM.dd (EEE)', { locale: ko })}
                    </span>
                    <button onClick={() => changeDate(1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '5px' }}>
                        <ChevronRight size={24} color="#4a5568" />
                    </button>
                </div>

                {/* Row 2: Right Aligned Memo Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button
                        onClick={() => setShowMemoModal(true)}
                        style={{
                            background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '16px',
                            padding: '6px 12px', fontSize: '0.85rem', color: '#2b6cb0', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer',
                            height: '32px'
                        }}
                    >
                        오늘 출석 참고사항
                        {dailyMemos.length > 0 && (
                            <span style={{
                                color: '#38a169', background: 'white', width: '20px', height: '20px',
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.8rem', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}>
                                {dailyMemos.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                style={{
                    flex: 1, overflow: 'auto', position: 'relative', touchAction: 'pan-x pan-y',
                    display: 'flex', justifyContent: 'center'
                }}
            >
                <div ref={contentRef} style={{ width: 'max-content', transformOrigin: '0 0', alignSelf: 'flex-start' }}>
                    {/* Fixed Header */}
                    <div style={{ position: 'sticky', top: 0, zIndex: 30, display: 'flex', width: 'max-content', backgroundColor: '#f7fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        {/* Sticky Columns Left Header */}
                        <div style={{ position: 'sticky', left: 0, zIndex: 40, display: 'flex', height: HEADER_TOTAL_HEIGHT, backgroundColor: '#f7fafc', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>
                            <div style={{ width: SEAT_WIDTH, borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: `${0.85 * scale}rem`, color: '#4a5568' }}>좌석</div>
                            <div style={{ width: NAME_WIDTH, borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: `${0.85 * scale}rem`, color: '#4a5568' }}>이름</div>
                        </div>
                        {/* Day Header - Dynamic Day */}
                        <div style={{ display: 'flex' }}>
                            {daysInView.map(date => (
                                <div key={format(date, 'yyyy-MM-dd')} style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ height: HEADER_DATE_HEIGHT, width: DAY_WIDTH, borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ebf8ff', color: '#2b6cb0', fontWeight: 'bold', fontSize: `${0.9 * scale}rem` }}>
                                        {format(date, 'M.d(EEE)', { locale: ko })}
                                    </div>
                                    <div style={{ display: 'flex', height: HEADER_PERIOD_HEIGHT }}>
                                        {[1, 2, 3, 4, 5, 6, 7].map(p => (
                                            <div key={p} style={{ width: PERIOD_WIDTH, borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${0.8 * scale}rem`, color: '#718096' }}>{p}</div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rows */}
                    <div style={{ width: 'max-content', paddingBottom: '20px' }}>
                        {sortedRows.map(user => {
                            const isDeactivated = user.isEmpty || user.isUnassigned;
                            const isRowHighlighted = highlightedSeat === user.seat_number && !isDeactivated;
                            const isAnyHighlighted = highlightedSeat !== null;
                            const { borderBottom, bgColor } = getSeatStyle(user.seat_number);
                            let rowOpacity = isAnyHighlighted ? (isRowHighlighted ? 1 : 0.4) : 1;
                            let stickyBg = isRowHighlighted ? '#ebf8ff' : (isDeactivated ? '#f7fafc' : bgColor);

                            return (
                                <div key={user.id} style={{ display: 'flex', height: ROW_HEIGHT, borderBottom, opacity: rowOpacity, transition: 'opacity 0.2s, transform 0.3s' }}>
                                    {/* Sticky Name/Seat */}
                                    <div style={{ position: 'sticky', left: 0, zIndex: 10, display: 'flex', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)', alignItems: 'flex-start', backgroundColor: stickyBg, height: '100%' }}>
                                        {isRowHighlighted && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ROW_HEIGHT, borderTop: '2px solid #3182ce', borderBottom: '2px solid #3182ce', borderLeft: '2px solid #3182ce', pointerEvents: 'none', zIndex: 20 }} />}
                                        <div style={{ width: SEAT_WIDTH, height: ROW_HEIGHT, borderRight: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', background: stickyBg, color: isDeactivated ? '#cbd5e0' : '#a0aec0', fontSize: `${0.8 * scale}rem` }}>{user.seat_number || '-'}</div>
                                        <div onClick={() => handleNameClick(user.seat_number)} style={{ width: NAME_WIDTH, height: ROW_HEIGHT, borderRight: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', background: stickyBg, color: '#2d3748', fontSize: `${0.9 * scale}rem`, fontWeight: isDeactivated ? 'normal' : 'bold', cursor: isDeactivated ? 'default' : 'pointer' }}>{user.name}</div>
                                    </div>
                                    {/* Scrollable Day Data */}
                                    <div style={{ display: 'flex', position: 'relative' }}>
                                        {isRowHighlighted && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ROW_HEIGHT, borderTop: '2px solid #3182ce', borderBottom: '2px solid #3182ce', pointerEvents: 'none', zIndex: 5 }} />}
                                        {daysInView.map(date => (
                                            <div key={format(date, 'yyyy-MM-dd')} style={{ display: 'flex', height: ROW_HEIGHT }}>
                                                {[1, 2, 3, 4, 5, 6, 7].map(p => (
                                                    <AttendanceCell key={p} user={user} dateStr={format(date, 'yyyy-MM-dd')} period={p} isRowHighlighted={isRowHighlighted} attendanceData={attendanceData} vacationData={vacationData} toggleAttendance={toggleAttendance} width={PERIOD_WIDTH} scale={scale} />
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom Popup Section */}
            {isPopupOpen && selectedUser && (
                <div style={{ height: '50%', flexShrink: 0, zIndex: 50 }}>
                    <UserMemoPopup user={selectedUser} memberMemos={memberMemos} onAdd={addMemberMemo} onDelete={deleteMemberMemo} onClose={() => setIsPopupOpen(false)} />
                </div>
            )}

            {/* Daily Memos Modal */}
            {showMemoModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748' }}>{format(currentViewDate, 'yyyy.MM.dd')} 참고사항</h3>
                            <button onClick={() => setShowMemoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={24} color="#a0aec0" /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f7fafc' }}>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {dailyMemos.length === 0 && <li style={{ color: '#a0aec0', textAlign: 'center' }}>등록된 참고사항이 없습니다.</li>}
                                {dailyMemos.map((memo, idx) => (
                                    <li key={memo.id} style={{ background: 'white', padding: '12px', borderRadius: '12px', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}><span style={{ fontWeight: 'bold', color: '#3182ce', minWidth: '20px' }}>{idx + 1}.</span><span style={{ color: '#4a5568', wordBreak: 'break-all', lineHeight: 1.4 }}>{memo.content}</span></div>
                                        <button onClick={() => deleteDailyMemo(memo.id)} style={{ background: '#fff5f5', color: '#e53e3e', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '0.8rem', cursor: 'pointer', marginLeft: '10px', fontWeight: 'bold' }}>삭제</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', background: 'white', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                            <input type="text" value={newMemo} onChange={(e) => setNewMemo(e.target.value)} placeholder="참고사항을 입력하세요" style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem', outline: 'none' }} onKeyPress={(e) => e.key === 'Enter' && addDailyMemo(newMemo.trim())} />
                            <button onClick={() => { addDailyMemo(newMemo.trim()); setNewMemo(''); }} style={{ background: '#3182ce', color: 'white', border: 'none', borderRadius: '10px', padding: '0 20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><Plus size={18} />등록</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffDailyAttendance;
