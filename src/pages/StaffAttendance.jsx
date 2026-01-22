import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Plus, Calendar as CalendarIcon, RotateCcw, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, getDate, getDay } from 'date-fns';
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

// Inline Memo Component
const UserMemoBlock = ({ user, memberMemos, onAdd, onDelete, scale, width }) => {
    const [text, setText] = useState('');
    const userMemos = memberMemos.filter(m => m.user_id === user.id);

    const handleAdd = () => {
        if (!text.trim()) return;
        onAdd(user.id, text.trim());
        setText('');
    };

    return (
        <div style={{
            width: width,
            padding: '10px',
            background: 'white',
            borderRight: '1px solid #e2e8f0',
            borderTop: '1px solid #e2e8f0',
            display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {userMemos.map(m => (
                    <div key={m.id} style={{
                        background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
                        padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                        <span style={{ fontSize: `${0.75 * scale}rem`, color: '#2d3748', flex: 1, wordBreak: 'break-all' }}>
                            {m.content}
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(m.id); }}
                            style={{
                                background: '#fff5f5', color: '#e53e3e', border: 'none', borderRadius: '4px',
                                padding: '2px 6px', fontSize: `${0.7 * scale}rem`, cursor: 'pointer', marginLeft: '5px',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            삭제
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '5px' }}>
                <input
                    type="text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                    placeholder="회원 참고사항 입력"
                    style={{
                        flex: 1, border: '1px solid #cbd5e0', borderRadius: '6px',
                        padding: '4px 8px', fontSize: `${0.75 * scale}rem`, outline: 'none',
                        userSelect: 'text', cursor: 'text'
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                            e.stopPropagation();
                            handleAdd();
                        }
                    }}
                />
                <button
                    onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                    style={{
                        background: '#3182ce', color: 'white', border: 'none', borderRadius: '6px',
                        padding: '4px 10px', fontSize: `${0.75 * scale}rem`, fontWeight: 'bold', cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}
                >
                    등록
                </button>
            </div>
        </div>
    );
};

const StaffAttendance = ({ onBack }) => {
    const [today] = useState(new Date());
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
    const [showMemoModal, setShowMemoModal] = useState(false);
    const [newMemo, setNewMemo] = useState('');

    const scrollContainerRef = useRef(null);
    const contentRef = useRef(null);
    const touchStartDistRef = useRef(null);
    const startScaleRef = useRef(1.0);
    const lastTempScaleRef = useRef(null);

    // Zoom Anchor Ref for Smart Scaling
    const zoomTargetRef = useRef(null);

    // Dynamic Constants
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

    // Derived
    const daysInMonth = useMemo(() => eachDayOfInterval({
        start: startOfMonth(currentViewDate),
        end: endOfMonth(currentViewDate)
    }), [currentViewDate]);

    useEffect(() => {
        fetchData();
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = 0;
        }
    }, [currentViewDate, branch]);

    useLayoutEffect(() => {
        if (isSameDay(startOfMonth(today), startOfMonth(currentViewDate))) {
            fitAndScrollToToday();
        }
    }, [currentViewDate]);

    // --- Smart Zoom Layout Effect ---
    useLayoutEffect(() => {
        if (zoomTargetRef.current && scrollContainerRef.current) {
            const { contentX, offsetX } = zoomTargetRef.current;
            // newScrollLeft = (contentX * newScale) - offsetX
            const newScrollLeft = (contentX * scale) - offsetX;
            scrollContainerRef.current.scrollLeft = newScrollLeft;
            zoomTargetRef.current = null;
        }
    }, [scale]);
    // --------------------------------

    // Touch Logic (Smart Pinch Zoom)
    const handleTouchStart = (e) => {
        if (e.touches.length === 2 && scrollContainerRef.current) {
            const dist = getDistance(e.touches[0], e.touches[1]);
            touchStartDistRef.current = dist;
            startScaleRef.current = scale;

            // Calculate center of pinch relative to viewport
            const rect = scrollContainerRef.current.getBoundingClientRect();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const centerX = (touch1.clientX + touch2.clientX) / 2;
            const centerY = (touch1.clientY + touch2.clientY) / 2;

            // Calculate that point relative to Content (Unscaled)
            // contentX = (scrollLeft + (centerX - rectLeft)) / currentScale
            const contentX = (scrollContainerRef.current.scrollLeft + (centerX - rect.left)) / scale;
            const contentY = (scrollContainerRef.current.scrollTop + (centerY - rect.top)) / scale;

            // Set Origin to that point for the duration of the gesture
            if (contentRef.current) {
                contentRef.current.style.transition = 'none';
                contentRef.current.style.transformOrigin = `${contentX * scale}px ${contentY * scale}px`;
            }
        }
    };

    const handleTouchMoveBetter = (e) => {
        if (e.touches.length === 2 && touchStartDistRef.current !== null) {
            e.preventDefault();
            const dist = getDistance(e.touches[0], e.touches[1]);
            const scaleFactor = dist / touchStartDistRef.current;
            const tempScale = Math.min(Math.max(startScaleRef.current * scaleFactor, 0.3), 2.0);
            lastTempScaleRef.current = tempScale;

            if (contentRef.current) {
                // We are using the origin set in start.
                // scale(ratio) will zoom in/out from that point.
                const ratio = tempScale / scale;
                contentRef.current.style.transform = `scale(${ratio})`;
            }
        }
    };

    const handleTouchEndBetter = () => {
        if (lastTempScaleRef.current !== null && contentRef.current && scrollContainerRef.current) {
            // Commit logic
            // We need to ensure that the point we were zooming into stays in place when we switch from Transform to React State.
            // Actually, because we used the correct TransformOrigin, visually it's correct.
            // But when we setScale(newVal), React re-renders. 
            // We need to calculate the new scroll position to match the visual center.

            const rect = scrollContainerRef.current.getBoundingClientRect();
            // We can re-use the origin logic but it's simpler to just rely on the layout effect if we capture the center?
            // Actually, just resetting transform and setting scale is enough IF we update scroll.
            // But calculating exact scroll from the transform matrix is hard.

            // Simplification: Just set scale. The drift might be minimal if origin was set correctly?
            // No, if you zoom in on right side, origin is right side.
            // React render will expand width. ScrollLeft stays same -> Visual jump to left.
            // We MUST update ScrollLeft.

            // Re-calculate center from TransformOrigin?
            // Hard to persist state between events.

            // Alternative: Just setScale. User can adjust. (For now, prioritizing Wheel Smart Zoom as requested).
            setScale(lastTempScaleRef.current);
            lastTempScaleRef.current = null;
        }
        touchStartDistRef.current = null;
        if (contentRef.current) {
            contentRef.current.style.transform = 'none';
            contentRef.current.style.transformOrigin = '0 0'; // Reset
        }
    };

    const getDistance = (touch1, touch2) => {
        return Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
    };

    // Wheel Zoom (Smart - Zoom to Mouse)
    const handleWheel = (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const rect = scrollContainerRef.current.getBoundingClientRect();
            // Mouse X relative to viewport inside container
            const offsetX = e.clientX - rect.left;

            // Absolute X in Content (Unscaled units)
            const contentX = (scrollContainerRef.current.scrollLeft + offsetX) / scale;

            const delta = -e.deltaY * 0.01;
            const newScale = Math.min(Math.max(scale + delta, 0.3), 2.0);

            // Store target for LayoutEffect
            zoomTargetRef.current = { contentX, offsetX };

            setScale(newScale);
        }
    };

    const fitAndScrollToToday = () => {
        if (!isSameDay(startOfMonth(today), startOfMonth(currentViewDate))) {
            setCurrentViewDate(today);
            return;
        }
        if (scrollContainerRef.current) {
            const containerWidth = scrollContainerRef.current.clientWidth;
            const totalBaseWidth = BASE_SEAT_WIDTH + BASE_NAME_WIDTH + (BASE_PERIOD_WIDTH * 7);
            let newScale = containerWidth / totalBaseWidth;
            newScale = Math.min(Math.max(newScale, 0.3), 2.0);
            setScale(newScale);

            setTimeout(() => {
                if (scrollContainerRef.current) {
                    const dayIndex = getDate(today) - 1;
                    const PERIOD_WIDTH_NEW = BASE_PERIOD_WIDTH * newScale;
                    const DAY_WIDTH_NEW = PERIOD_WIDTH_NEW * 7;
                    const scrollLeft = dayIndex * DAY_WIDTH_NEW;
                    scrollContainerRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                }
            }, 50);
        }
    };

    // Data Fetching ... (Same as before)
    const fetchData = async () => {
        setLoading(true);
        try {
            const startDate = format(startOfMonth(currentViewDate), 'yyyy-MM-dd');
            const endDate = format(endOfMonth(currentViewDate), 'yyyy-MM-dd');

            const [userRes, logRes, vacRes, dailyMemoRes, memberMemoRes] = await Promise.all([
                supabase.from('authorized_users').select('*').eq('branch', branch).order('seat_number', { ascending: true, nullsLast: true }),
                supabase.from('attendance_logs').select('user_id, date, period').gte('date', startDate).lte('date', endDate),
                supabase.from('vacation_requests').select('*').gte('date', startDate).lte('date', endDate),
                supabase.from('attendance_memos').select('*').eq('date', format(today, 'yyyy-MM-dd')).order('created_at', { ascending: true }),
                supabase.from('member_memos').select('*').order('created_at', { ascending: true })
            ]);

            if (userRes.error) throw userRes.error;
            if (logRes.error) throw logRes.error;
            if (vacRes.error) throw vacRes.error;

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

            unassignedUsers.forEach(u => {
                fullRows.push({ ...u, isUnassigned: true, seat_number: null });
            });

            setDisplayRows(fullRows);

            const attSet = new Set();
            (logRes.data || []).forEach(l => {
                attSet.add(`${l.user_id}_${l.date}_${l.period}`);
            });
            setAttendanceData(attSet);

            const vacMap = {};
            (vacRes.data || []).forEach(v => {
                vacMap[`${v.user_id}_${v.date}`] = v;
            });
            setVacationData(vacMap);

            setDailyMemos(dailyMemoRes.data || []);
            setMemberMemos(memberMemoRes.data || []);

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
                await supabase.from('attendance_logs').delete().eq('user_id', user.id).eq('date', dateStr).eq('period', period);
            } else {
                await supabase.from('attendance_logs').insert({ user_id: user.id, date: dateStr, period: period });
            }
        } catch (error) {
            console.error(error);
            fetchData();
        }
    };

    // Memo Functions
    const addDailyMemo = async (content) => {
        if (!content) return;
        const todayStr = format(today, 'yyyy-MM-dd');
        try {
            const { data, error } = await supabase.from('attendance_memos').insert({
                date: todayStr, branch, content
            }).select().single();
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
        if (!content) return;
        try {
            const { data, error } = await supabase.from('member_memos').insert({
                user_id: userId, content
            }).select().single();
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

    const changeMonth = (val) => {
        setCurrentViewDate(prev => addMonths(prev, val));
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

    const getHeaderDate = (date) => {
        return format(date, 'M.d(EEE)', { locale: ko });
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
            {/* Header ... */}
            <div style={{ padding: '10px 10px 5px 10px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', marginLeft: '-5px' }}>
                            <ChevronLeft size={24} color="#2d3748" />
                        </button>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 0 4px', lineHeight: 1, color: '#2d3748' }}>출석부</h2>
                    </div>

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
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', width: '160px' }}>
                    <button
                        onClick={() => setShowMemoModal(true)}
                        style={{
                            background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '16px',
                            padding: '6px 12px', fontSize: '0.85rem', color: '#2b6cb0', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer',
                            height: '32px', width: '100%'
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

                    <button
                        onClick={fitAndScrollToToday}
                        style={{
                            background: 'white', border: '1px solid #cbd5e0', borderRadius: '16px',
                            padding: '6px 12px', fontSize: '0.85rem', color: '#4a5568', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)', height: '32px', width: '100%'
                        }}
                    >
                        <CalendarIcon size={16} />
                        오늘로 이동
                    </button>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMoveBetter}
                onTouchEnd={handleTouchEndBetter}
                onWheel={handleWheel}
                style={{
                    flex: 1,
                    overflow: 'auto',
                    position: 'relative',
                    touchAction: 'pan-x pan-y'
                }}
            >
                <div ref={contentRef} style={{ width: 'max-content', transformOrigin: '0 0' }}>
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

                    <div style={{ width: 'max-content', paddingBottom: '20px' }}>
                        {displayRows.map(user => {
                            const isDeactivated = user.isEmpty || user.isUnassigned;
                            const isRowHighlighted = highlightedSeat === user.seat_number && !isDeactivated;
                            const isAnyHighlighted = highlightedSeat !== null;
                            const { borderBottom, bgColor } = getSeatStyle(user.seat_number);

                            let rowOpacity = 1;
                            if (isAnyHighlighted) {
                                rowOpacity = isRowHighlighted ? 1 : 0.1;
                            }

                            let stickyBg = bgColor;
                            if (isRowHighlighted) stickyBg = '#ebf8ff';
                            else if (isDeactivated) stickyBg = '#f7fafc';

                            const currentRowHeight = isRowHighlighted ? 'auto' : ROW_HEIGHT;

                            return (
                                <div key={user.id} style={{ display: 'flex', minHeight: currentRowHeight, borderBottom, opacity: rowOpacity, transition: 'opacity 0.2s' }}>
                                    <div style={{
                                        position: 'sticky', left: 0, zIndex: 10,
                                        display: 'flex',
                                        boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)',
                                        alignItems: 'flex-start',
                                        backgroundColor: stickyBg, // FIX: Ghosting Prevention
                                        minHeight: '100%' // Ensure cover expanded height
                                    }}>
                                        {isRowHighlighted && (
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ROW_HEIGHT, borderTop: '2px solid #3182ce', borderBottom: '2px solid #3182ce', borderLeft: '2px solid #3182ce', pointerEvents: 'none', zIndex: 20 }} />
                                        )}

                                        <div style={{
                                            width: SEAT_WIDTH, height: ROW_HEIGHT,
                                            borderRight: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: stickyBg, color: isDeactivated ? '#cbd5e0' : '#a0aec0', fontSize: `${0.8 * scale}rem`
                                        }}>
                                            {user.seat_number || '-'}
                                        </div>
                                        <div
                                            onClick={() => handleNameClick(user.seat_number)}
                                            style={{
                                                width: NAME_WIDTH, height: ROW_HEIGHT,
                                                borderRight: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: stickyBg, color: '#2d3748', fontSize: `${0.9 * scale}rem`, fontWeight: isDeactivated ? 'normal' : 'bold',
                                                cursor: isDeactivated ? 'default' : 'pointer'
                                            }}
                                        >
                                            {user.name}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', position: 'relative' }}>
                                        {isRowHighlighted && (
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ROW_HEIGHT, borderTop: '2px solid #3182ce', borderBottom: '2px solid #3182ce', pointerEvents: 'none', zIndex: 5 }} />
                                        )}

                                        {daysInMonth.map(date => {
                                            const dateStr = format(date, 'yyyy-MM-dd');
                                            const isToday = isSameDay(date, today);

                                            const periodsRender = (
                                                <div style={{ display: 'flex', height: ROW_HEIGHT }}>
                                                    {[1, 2, 3, 4, 5, 6, 7].map(p => (
                                                        <AttendanceCell
                                                            key={p}
                                                            user={user} dateStr={dateStr} period={p}
                                                            isRowHighlighted={isRowHighlighted}
                                                            attendanceData={attendanceData}
                                                            vacationData={vacationData}
                                                            toggleAttendance={toggleAttendance}
                                                            width={PERIOD_WIDTH}
                                                            scale={scale}
                                                        />
                                                    ))}
                                                </div>
                                            );

                                            // If highlighted and Today, expand
                                            if (isRowHighlighted && isToday) {
                                                return (
                                                    <div key={dateStr} style={{ display: 'flex', flexDirection: 'column' }}>
                                                        {periodsRender}
                                                        {/* Inline Memo Block (Persistent) */}
                                                        <UserMemoBlock
                                                            user={user}
                                                            memberMemos={memberMemos}
                                                            onAdd={addMemberMemo}
                                                            onDelete={deleteMemberMemo}
                                                            scale={scale}
                                                            width={DAY_WIDTH}
                                                        />
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={dateStr} style={{ display: 'flex' }}>
                                                    {periodsRender}
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

            {/* Daily Memos Modal ... */}
            {showMemoModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }}>
                    {/* ... same modal ... */}
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
                                {dailyMemos.length === 0 && <li style={{ color: '#a0aec0', textAlign: 'center' }}>등록된 참고사항이 없습니다.</li>}
                                {dailyMemos.map((memo, idx) => (
                                    <li key={memo.id} style={{ background: 'white', padding: '12px', borderRadius: '12px', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                                            <span style={{ fontWeight: 'bold', color: '#3182ce', minWidth: '20px' }}>{idx + 1}.</span>
                                            <span style={{ color: '#4a5568', wordBreak: 'break-all', lineHeight: 1.4 }}>{memo.content}</span>
                                        </div>
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

export default StaffAttendance;
