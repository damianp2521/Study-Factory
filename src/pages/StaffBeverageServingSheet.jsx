import React, { useState, useEffect } from 'react';
import { ChevronLeft, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { BRANCH_OPTIONS } from '../constants/branches';
import EmbeddedCalendar from '../components/EmbeddedCalendar';
import { formatDateWithDay, getTodayString } from '../utils/dateUtils';

const StaffBeverageServingSheet = ({ onBack }) => {
    const [loading, setLoading] = useState(true);
    const [seatData, setSeatData] = useState([]); // Array of { seatNo, user: { name, ... }, status: 'present'|'absent'|'empty', details: ... }
    const [selectedBranch, setSelectedBranch] = useState('망미점');
    const [date, setDate] = useState(getTodayString());
    const [showCalendar, setShowCalendar] = useState(false);

    const branches = BRANCH_OPTIONS.filter(b => b !== '전체');

    useEffect(() => {
        const updateDate = () => {
            const today = getTodayString();
            setDate(today);
        };
        window.addEventListener('focus', updateDate);
        return () => window.removeEventListener('focus', updateDate);
    }, []);

    useEffect(() => {
        fetchData();
    }, [selectedBranch, date]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const today = date;

            // 1. Fetch ALL Users in Branch (Seated only)
            const { data: userData, error: userError } = await supabase
                .from('authorized_users')
                .select('id, name, seat_number')
                .eq('branch', selectedBranch)
                .not('seat_number', 'is', null)
                .order('seat_number', { ascending: true });

            if (userError) throw userError;

            // 2. Fetch Beverage Options & Selections
            const { data: optionsData } = await supabase.from('beverage_options').select('id, name');
            const optionsMap = {};
            (optionsData || []).forEach(o => optionsMap[o.id] = o.name);

            const userIds = (userData || []).map(u => u.id);
            let selectionMap = {};
            if (userIds.length > 0) {
                const { data: selectionsData } = await supabase
                    .from('user_beverage_selections')
                    .select('*')
                    .in('user_id', userIds);
                (selectionsData || []).forEach(s => selectionMap[s.user_id] = s);
            }

            // 3. Check Absences (Vacation & Attendance Logs)
            let absenceMap = {}; // userId -> reason (string)

            if (userIds.length > 0) {
                // Vacation Requests
                const { data: vacData } = await supabase
                    .from('vacation_requests')
                    .select('user_id, type, periods')
                    .eq('date', today)
                    .in('user_id', userIds);

                (vacData || []).forEach(req => {
                    if (req.type === 'full') absenceMap[req.user_id] = '휴가(전일)';
                    else if (req.type === 'half' && req.periods?.includes(1)) absenceMap[req.user_id] = '오전반차'; // Assuming morning absence checks period 1
                });

                // Attendance Logs (Daily Status like Late, Hospital, etc.)
                const { data: attData } = await supabase
                    .from('attendance_logs')
                    .select('user_id, status, period')
                    .eq('date', today)
                    .in('user_id', userIds)
                    .not('status', 'is', null);

                (attData || []).forEach(log => {
                    // If marked with a status for period 1, treat as absent/late for serving time
                    if (log.period === 1) {
                        // If already has a reason, append or overwrite? Overwrite is usually fine or detail it.
                        absenceMap[log.user_id] = log.status;
                    }
                });
            }

            // 4. Build Seat Grid
            // Find max seat number to define grid range? Or just list occupied seats + gaps?
            // "1번부터 좌석 쫙 놓은 다음에" implies a continuous grid.
            // Let's find MAX seat number, or default to a reasonable number (e.g. 50 or 100) if small.
            // But usually we just map the layout. For now, let's just use the max seat number found or at least 100 if user wants "쫙 놓은".
            // Actually, simply filling gaps is safer.
            const maxSeat = userData && userData.length > 0 ? Math.max(...userData.map(u => u.seat_number)) : 0;
            const gridLimit = Math.max(maxSeat, 20); // Show at least 20, or up to max.

            const finalData = [];
            // Create a map for quick lookup
            const userSeatMap = {};
            (userData || []).forEach(u => userSeatMap[u.seat_number] = u);

            for (let i = 1; i <= gridLimit; i++) {
                const user = userSeatMap[i];
                if (!user) {
                    finalData.push({ seatNo: i, status: 'empty' });
                    continue;
                }

                const absenceReason = absenceMap[user.id];
                if (absenceReason) {
                    finalData.push({
                        seatNo: i,
                        status: 'absent',
                        user,
                        reason: absenceReason
                    });
                } else {
                    // Present
                    const sel = selectionMap[user.id] || {};
                    const beverages = [];
                    [1, 2, 3].forEach(idx => {
                        const optId = sel[`selection_${idx}`];
                        if (optId && optionsMap[optId]) beverages.push(optionsMap[optId]);
                    });

                    finalData.push({
                        seatNo: i,
                        status: 'present',
                        user,
                        beverages
                    });
                }
            }

            setSeatData(finalData);

        } catch (err) {
            console.error(err);
            alert('데이터 로딩 실패');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0 0 20px 0' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px 0 0', display: 'flex', alignItems: 'center' }}>
                        <ChevronLeft size={24} color="#2d3748" />
                    </button>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>음료 서빙표</h3>
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
                    {formatDateWithDay(date)}
                    <Calendar size={16} color="#718096" />
                </button>
            </div>

            {showCalendar && (
                <div style={{ position: 'absolute', top: '60px', right: '20px', zIndex: 100, background: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', padding: '10px' }}>
                    <EmbeddedCalendar
                        selectedDate={date}
                        onSelectDate={(val) => {
                            setDate(val);
                            setShowCalendar(false);
                        }}
                    />
                </div>
            )}

            {/* Branch Selection */}
            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', overflowX: 'auto', paddingBottom: '5px', scrollbarWidth: 'none' }}>
                {branches.map(b => (
                    <button
                        key={b}
                        onClick={() => setSelectedBranch(b)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: selectedBranch === b ? 'none' : '1px solid #e2e8f0',
                            background: selectedBranch === b ? 'var(--color-primary)' : 'white',
                            color: selectedBranch === b ? 'white' : '#718096',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {b}
                    </button>
                ))}
            </div>

            {/* Grid Content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '12px'
                }}>
                    {seatData.map(item => (
                        <SeatCard key={item.seatNo} item={item} />
                    ))}
                </div>
                {seatData.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>데이터가 없습니다.</div>
                )}
            </div>
        </div>
    );
};

const SeatCard = ({ item }) => {
    // Styles based on status
    let cardStyle = {
        borderRadius: '12px',
        padding: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '100px',
        position: 'relative',
        border: '1px solid #e2e8f0'
    };

    // Status: present (Green), absent (Red), empty (Gray)
    if (item.status === 'present') {
        cardStyle.background = '#f0fff4'; // Light green bg
        cardStyle.border = '1px solid #9ae6b4';
    } else if (item.status === 'absent') {
        cardStyle.background = '#fff5f5'; // Light red bg
        cardStyle.border = '1px solid #feb2b2';
    } else {
        cardStyle.background = '#f7fafc'; // Gray bg
        cardStyle.border = '1px solid #edf2f7';
    }

    return (
        <div style={cardStyle}>
            {/* Header: Seat & Name */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    color: item.status === 'empty' ? '#a0aec0' : (item.status === 'present' ? '#2f855a' : '#c53030')
                }}>
                    {item.seatNo}
                </span>
                {item.status !== 'empty' && (
                    <span style={{
                        fontSize: '0.95rem',
                        fontWeight: 'bold',
                        color: '#2d3748',
                        textAlign: 'right',
                        wordBreak: 'keep-all'
                    }}>
                        {item.user.name}
                    </span>
                )}
            </div>

            {/* Content: Beverages or Status Text */}
            <div style={{ fontSize: '0.85rem' }}>
                {item.status === 'present' && (
                    <div style={{ color: '#276749', fontWeight: '500', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {item.beverages && item.beverages.length > 0 ? (
                            item.beverages.map((bev, idx) => <span key={idx}>{bev}</span>)
                        ) : (
                            <span style={{ color: '#718096', fontSize: '0.8rem' }}>(음료 없음)</span>
                        )}
                        <span style={{
                            marginTop: '6px',
                            fontSize: '0.75rem',
                            color: '#22543d',
                            border: '1px solid #48bb78',
                            padding: '2px 6px',
                            borderRadius: '12px',
                            alignSelf: 'flex-start',
                            fontWeight: 'bold',
                            background: '#c6f6d5'
                        }}>
                            정상출근
                        </span>
                    </div>
                )}

                {item.status === 'absent' && (
                    <div style={{ textAlign: 'right', marginTop: '4px' }}>
                        <span style={{
                            color: '#e53e3e',
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                        }}>
                            {item.reason}
                        </span>
                    </div>
                )}

                {item.status === 'empty' && (
                    <div style={{ textAlign: 'center', color: '#cbd5e0', fontSize: '0.9rem', marginTop: '10px' }}>
                        미배정
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffBeverageServingSheet;
