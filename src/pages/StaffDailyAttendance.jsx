import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { format, startOfMonth, endOfMonth, addDays, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';

// Special attendance statuses
const SPECIAL_STATUSES = ['지각', '병원', '외출', '쉼', '운동', '알바', '스터디', '집공', '개인', '아픔', '모의', '시험', '그만둠', '늦잠'];

// Status Selection Popup
const StatusPopup = ({ onSelect, onClose }) => {
    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '20px',
                    width: '280px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}
            >
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '15px', textAlign: 'center' }}>
                    출석 상태 선택
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {SPECIAL_STATUSES.map(status => (
                        <button
                            key={status}
                            onClick={() => onSelect(status)}
                            style={{
                                padding: '12px 8px', borderRadius: '10px',
                                border: '1px solid #e2e8f0', background: '#c6f6d5',
                                color: '#c53030', fontWeight: 'bold', fontSize: '0.9rem',
                                cursor: 'pointer', transition: 'transform 0.1s'
                            }}
                        >
                            {status}
                        </button>
                    ))}
                </div>
                <div style={{ margin: '15px 0', borderTop: '1px solid #e2e8f0' }}></div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => onSelect('vacation_full')}
                        style={{
                            flex: 1, padding: '10px 0', borderRadius: '10px',
                            border: '1px solid #feb2b2', background: '#fff5f5',
                            color: '#c53030', fontWeight: 'bold', fontSize: '0.9rem',
                            cursor: 'pointer'
                        }}
                    >
                        월차
                    </button>
                    <button
                        onClick={() => onSelect('vacation_half_am')}
                        style={{
                            flex: 1, padding: '10px 0', borderRadius: '10px',
                            border: '1px solid #feb2b2', background: '#fff5f5',
                            color: '#c53030', fontWeight: 'bold', fontSize: '0.9rem',
                            cursor: 'pointer'
                        }}
                    >
                        오전반차
                    </button>
                    <button
                        onClick={() => onSelect('vacation_half_pm')}
                        style={{
                            flex: 1, padding: '10px 0', borderRadius: '10px',
                            border: '1px solid #90cdf4', background: '#ebf8ff',
                            color: '#2c5282', fontWeight: 'bold', fontSize: '0.9rem',
                            cursor: 'pointer'
                        }}
                    >
                        오후반차
                    </button>
                </div>



                <button
                    onClick={() => onSelect('vacation_cancel')}
                    style={{
                        width: '100%', marginTop: '8px', padding: '10px', borderRadius: '10px',
                        border: '1px solid #cbd5e0', background: '#edf2f7',
                        color: '#4a5568', fontWeight: 'bold', fontSize: '0.9rem',
                        cursor: 'pointer'
                    }}
                >
                    휴가취소
                </button>

                <button
                    onClick={onClose}
                    style={{
                        width: '100%', marginTop: '8px', padding: '12px', borderRadius: '10px',
                        border: 'none', background: '#e2e8f0', color: '#718096',
                        fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer'
                    }}
                >
                    닫기
                </button>
            </div>
        </div >,
        document.body
    );
};

// Memoized Cell with Long Press Support
const AttendanceCell = React.memo(({ user, dateStr, period, isRowHighlighted, attendanceData, statusData, vacationData, toggleAttendance, onLongPress, width, scale }) => {
    const key = `${user.id}_${dateStr}_${period}`;
    const isAttended = attendanceData.has(key);
    const status = statusData[key] || null;
    const vac = vacationData[`${user.id}_${dateStr}`];
    const isDeactivated = user.isEmpty || user.isUnassigned;

    const longPressTimer = useRef(null);
    const isLongPress = useRef(false);

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

    // Special status styling (green bg, red text)
    if (isAttended && status) {
        bg = '#c6f6d5';
        color = '#c53030';
        content = status;
    } else if (isAttended) {
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

    const handleStart = (e) => {
        if (isDeactivated) return;
        isLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            onLongPress(user, dateStr, period);
        }, 500);
    };

    const handleEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleClick = () => {
        if (isDeactivated) return;
        if (!isLongPress.current) {
            toggleAttendance(user, dateStr, period);
        }
        isLongPress.current = false;
    };

    return (
        <div
            onMouseDown={handleStart}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchEnd={handleEnd}
            onClick={handleClick}
            onContextMenu={(e) => e.preventDefault()}
            style={{
                width: width, flexShrink: 0, height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: bg, color, fontSize: `${0.8 * scale}rem`, fontWeight: 'bold',
                borderRight: '1px solid #e2e8f0',
                whiteSpace: 'pre-line', textAlign: 'center', lineHeight: 1.1,
                cursor: isDeactivated ? 'default' : 'pointer',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none'
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
        prev.statusData === next.statusData &&
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
    const [statusData, setStatusData] = useState({}); // {key: status}
    const [vacationData, setVacationData] = useState({});
    const [dailyMemos, setDailyMemos] = useState([]);
    const [memberMemos, setMemberMemos] = useState([]);

    const [loading, setLoading] = useState(false);
    const [highlightedSeat, setHighlightedSeat] = useState(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [showMemoModal, setShowMemoModal] = useState(false);
    const [newMemo, setNewMemo] = useState('');

    // Status popup state
    const [statusPopup, setStatusPopup] = useState({ open: false, user: null, dateStr: '', period: null });

    const scrollContainerRef = useRef(null);
    const contentRef = useRef(null);
    const rowRefs = useRef({}); // Refs for scrolling to rows
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

    // Row Reordering REMOVED - just use displayRows
    const sortedRows = displayRows;

    // Auto Scroll to Highlighted Row
    useEffect(() => {
        if (highlightedSeat && rowRefs.current[highlightedSeat]) {
            const rowEl = rowRefs.current[highlightedSeat];
            if (rowEl && scrollContainerRef.current) {
                // Scroll to top (under header)
                const container = scrollContainerRef.current;
                const targetScrollTop = rowEl.offsetTop - HEADER_TOTAL_HEIGHT;

                container.scrollTo({
                    top: targetScrollTop,
                    behavior: 'smooth'
                });
            }
        }
    }, [highlightedSeat, HEADER_TOTAL_HEIGHT]);

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
                supabase.from('profiles').select('*').eq('branch', branch).order('seat_number', { ascending: true, nullsLast: true }),
                supabase.from('attendance_logs').select('user_id, date, period, status').gte('date', startDate).lte('date', endDate),
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
            const statusMap = {};
            (logRes.data || []).forEach(l => {
                const key = `${l.user_id}_${l.date}_${l.period}`;
                attSet.add(key);
                if (l.status) statusMap[key] = l.status;
            });
            setAttendanceData(attSet);
            setStatusData(statusMap);

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
        // Clear status when toggling
        setStatusData(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        try {
            if (isAttended) await supabase.from('attendance_logs').delete().eq('user_id', user.id).eq('date', dateStr).eq('period', period);
            else await supabase.from('attendance_logs').insert({ user_id: user.id, date: dateStr, period: period });
        } catch (e) { fetchData(); }
    };

    // Long press handler - opens status popup
    const handleLongPress = (user, dateStr, period) => {
        setStatusPopup({ open: true, user, dateStr, period });
    };

    // Status selection handler
    const handleStatusSelect = async (status) => {
        const { user, dateStr, period } = statusPopup;
        if (!user) return;

        // Handle Vacation Requests
        if (['vacation_full', 'vacation_half_am', 'vacation_half_pm', 'vacation_cancel'].includes(status)) {
            try {
                if (status === 'vacation_cancel') {
                    // Delete vacation request
                    const { count, error } = await supabase.from('vacation_requests')
                        .delete({ count: 'exact' })
                        .eq('user_id', user.id)
                        .eq('date', dateStr);

                    if (error) throw error;
                    if (count === 0) {
                        alert('삭제된 휴가가 없습니다. 이미 삭제되었거나 권한이 없을 수 있습니다.');
                    } else {
                        // Optimistic Update: Remove from local state
                        setVacationData(prev => {
                            const next = { ...prev };
                            const key = `${user.id}_${dateStr}`;
                            delete next[key];
                            return next;
                        });
                        alert('휴가가 취소되었습니다.');
                        fetchData(); // Background refresh
                    }
                } else {
                    let type = 'full';
                    let periods = null;

                    if (status === 'vacation_half_am') {
                        type = 'half';
                        periods = [1, 2, 3, 4];
                    } else if (status === 'vacation_half_pm') {
                        type = 'half';
                        periods = [5, 6, 7];
                    }

                    // Check if a request already exists
                    const { data: existingVacation } = await supabase.from('vacation_requests')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('date', dateStr)
                        .single();

                    if (existingVacation) {
                        // Update existing
                        const { error } = await supabase.from('vacation_requests')
                            .update({
                                type: type,
                                periods: periods,
                                reason: null,
                                status: 'approved'
                            })
                            .eq('id', existingVacation.id);
                        if (error) throw error;
                    } else {
                        // Insert new
                        const { error } = await supabase.from('vacation_requests').insert({
                            user_id: user.id,
                            date: dateStr,
                            type: type,
                            periods: periods,
                            reason: null,
                            status: 'approved'
                        });
                        if (error) throw error;
                    }

                    // Optimistic Update: Add/Update local state
                    setVacationData(prev => {
                        const next = { ...prev };
                        const key = `${user.id}_${dateStr}`;
                        next[key] = { type, periods, reason: null, status: 'approved' };
                        return next;
                    });

                    fetchData(); // Background refresh
                }
            } catch (e) {
                console.error("Error creating vacation:", e);
                alert(`휴가 등록에 실패했습니다: ${e.message}`);
            }
            setStatusPopup({ open: false, user: null, dateStr: '', period: null });
            return;
        }

        const key = `${user.id}_${dateStr}_${period}`;

        if (status === 'absent') {
            // Delete attendance (make it X)
            setAttendanceData(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
            setStatusData(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
            try {
                await supabase.from('attendance_logs').delete().eq('user_id', user.id).eq('date', dateStr).eq('period', period);
            } catch (e) { fetchData(); }
        } else {
            // Set attendance with status
            setAttendanceData(prev => {
                const next = new Set(prev);
                next.add(key);
                return next;
            });
            if (status) {
                setStatusData(prev => ({ ...prev, [key]: status }));
            } else {
                setStatusData(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
            }
            try {
                // Check if record exists
                const { data: existing } = await supabase.from('attendance_logs')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('date', dateStr)
                    .eq('period', period)
                    .single();

                if (existing) {
                    await supabase.from('attendance_logs')
                        .update({ status: status || null })
                        .eq('user_id', user.id)
                        .eq('date', dateStr)
                        .eq('period', period);
                } else {
                    await supabase.from('attendance_logs').insert({
                        user_id: user.id,
                        date: dateStr,
                        period: period,
                        status: status || null
                    });
                }
            } catch (e) {
                console.error(e);
                fetchData();
            }
        }

        setStatusPopup({ open: false, user: null, dateStr: '', period: null });
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
            // Toggle OFF
            setHighlightedSeat(null);
            setIsPopupOpen(false);
        } else {
            // Select New
            setHighlightedSeat(seatNum);
            setIsPopupOpen(true);
        }
    };

    // Separator row configuration
    const TEAL_SEPARATOR_SEATS = [54, 102]; // 청록색 두꺼운 구분선 (열람실 구분)
    const THICK_SEPARATOR_SEATS = [7, 17, 22, 27, 32, 37, 42, 47, 52, 58, 62, 66, 70, 74, 78, 82, 83, 87, 90, 93, 96, 99];
    const THIN_SEPARATOR_SEATS = [9, 11, 13, 15, 50];

    const getSeparatorStyle = (seatNum) => {
        const numericSeat = Number(seatNum);
        if (TEAL_SEPARATOR_SEATS.includes(numericSeat)) {
            return { height: 6, color: '#267E82' }; // 청록색
        } else if (THICK_SEPARATOR_SEATS.includes(numericSeat)) {
            return { height: 4, color: '#718096' }; // 두꺼운 회색
        } else if (THIN_SEPARATOR_SEATS.includes(numericSeat)) {
            return { height: 2, color: '#a0aec0' }; // 얇은 회색
        }
        return null;
    };

    const getSeatStyle = (seatNum) => {
        let bgColor = 'white';
        const numericSeat = Number(seatNum);

        if (numericSeat >= 8 && numericSeat <= 17) bgColor = '#edf2f7';
        else if (numericSeat === 53 || numericSeat === 54) bgColor = '#cbd5e0';
        else if (numericSeat === 83) bgColor = '#fed7d7';
        return { bgColor };
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
            {/* Header: Row 1 Date (Top), Row 2 Memo (Bottom) */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                {/* Row 1: Centered Date Navigator (Top) - Adjusted Padding */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', padding: '15px 10px 0 10px' }}>
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

                {/* Row 2: Right Aligned Memo Button (Bottom) */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '5px 10px 10px 10px' }}>
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
                            const { bgColor } = getSeatStyle(user.seat_number);
                            let rowOpacity = isAnyHighlighted ? (isRowHighlighted ? 1 : 0.4) : 1;
                            let stickyBg = isRowHighlighted ? '#ebf8ff' : (isDeactivated ? '#f7fafc' : bgColor);
                            const separatorStyle = getSeparatorStyle(user.seat_number);

                            return (
                                <React.Fragment key={user.id}>
                                    <div
                                        ref={el => rowRefs.current[user.seat_number] = el}
                                        style={{ display: 'flex', height: ROW_HEIGHT, borderBottom: '1px solid #edf2f7', opacity: rowOpacity, transition: 'opacity 0.2s, transform 0.3s' }}
                                    >
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
                                                        <AttendanceCell key={p} user={user} dateStr={format(date, 'yyyy-MM-dd')} period={p} isRowHighlighted={isRowHighlighted} attendanceData={attendanceData} statusData={statusData} vacationData={vacationData} toggleAttendance={toggleAttendance} onLongPress={handleLongPress} width={PERIOD_WIDTH} scale={scale} />
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Separator Row */}
                                    {separatorStyle && (
                                        <div style={{ height: separatorStyle.height, backgroundColor: separatorStyle.color, width: '100%' }} />
                                    )}
                                </React.Fragment>
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
            {showMemoModal && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
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
                </div>,
                document.body
            )}

            {/* Status Selection Popup */}
            {statusPopup.open && (
                <StatusPopup
                    onSelect={handleStatusSelect}
                    onClose={() => setStatusPopup({ open: false, user: null, dateStr: '', period: null })}
                />
            )}
        </div>
    );
};

export default StaffDailyAttendance;
