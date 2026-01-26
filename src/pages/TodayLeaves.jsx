import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import EmbeddedCalendar from '../components/EmbeddedCalendar';

const TodayLeaves = () => {
    const navigate = useNavigate();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default today
    const [showCalendar, setShowCalendar] = useState(false);
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchLeaves();
    }, [date]);

    // Helper: Get start(Mon) and end(Sun) of the week for a given date
    const getWeekRange = (dateStr) => {
        const d = new Date(dateStr);
        const day = d.getDay(); // 0(Sun) to 6(Sat)
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday

        const monday = new Date(d.setDate(diff));
        const sunday = new Date(d.setDate(monday.getDate() + 6));

        return {
            start: monday.toISOString().split('T')[0],
            end: sunday.toISOString().split('T')[0]
        };
    };

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            // 1. Parallel Fetch: Vacation Requests AND Attendance Logs (Period 1 with Status)
            const [localVacRes, localLogRes] = await Promise.all([
                supabase
                    .from('vacation_requests')
                    .select(`
                        id, type, periods, reason, user_id,
                        profiles (name, id)
                    `)
                    .eq('date', date),
                supabase
                    .from('attendance_logs')
                    .select(`
                        user_id, status, period,
                        profiles (name, id)
                    `)
                    .eq('date', date)
                    // .eq('period', 1) // Removed to fetch all periods
                    .not('status', 'is', null) // Only with status
            ]);

            if (localVacRes.error) throw localVacRes.error;
            if (localLogRes.error) throw localLogRes.error;

            const dailyData = localVacRes.data || [];
            const dailyLogs = localLogRes.data || [];

            // 2. Weekly Usage Calculation (Only for Vacation Request Users)
            // ... (Keeping existing logic for usage warning if needed, or maybe skip for simplicity)
            // The existing logic calculates usage for ALL users found in dailyData.
            // I should extend this to include users from dailyLogs if I want warnings for them too?
            // "Special Leave" (attendance_log) might not count towards 1.5 day limit? Usually it doesn't.
            // So I will only calculate usage for `dailyData` users.

            let results = [...dailyData];

            // 3. Transform Logs to Leaf Format and Merge
            const logItems = dailyLogs.map(log => ({
                id: `log_${log.user_id}_${log.period}`,
                type: 'special_log', // Custom type
                reason: log.status,
                periods: [log.period], // Use actual period
                user_id: log.user_id,
                profiles: log.profiles,
                weeklyUsage: 0 // Logs don't trigger warning usually
            }));

            // Merge: avoid duplicates?
            // If user has both (unlikely given logic), show both or prefer Vacation?
            // Vacation Request Full Day overrides Log?
            // I'll show both for now to be safe, or filter.
            // Filter: If user is in dailyData (as Full/Half), don't show log?
            // Actually, "Special" is now ONLY in logs.
            // "Full/Half" is in requests.
            // So they should be distinct sets mostly.

            // Check for duplicates just in case
            const existingUserIds = new Set(results.map(r => r.user_id));
            const newLogItems = logItems.filter(item => !existingUserIds.has(item.user_id));

            results = [...results, ...newLogItems];


            // Calculate Weekly Usage for Vacation Requests Only
            const userIds = [...new Set(dailyData.map(item => item.user_id))];
            if (userIds.length > 0) {
                const { start, end } = getWeekRange(date);
                const { data: weeklyData } = await supabase
                    .from('vacation_requests')
                    .select('user_id, type')
                    .in('user_id', userIds)
                    .gte('date', start)
                    .lte('date', end);

                const usageMap = {};
                (weeklyData || []).forEach(r => {
                    const weight = r.type === 'full' ? 1.0 : 0.5;
                    usageMap[r.user_id] = (usageMap[r.user_id] || 0) + weight;
                });

                results = results.map(item => {
                    // Only update usage for vacation items
                    if (item.type !== 'special_log') {
                        return { ...item, weeklyUsage: usageMap[item.user_id] || 0 };
                    }
                    return item;
                });
            }

            setLeaves(results);

        } catch (err) {
            console.error('Error fetching leaves:', err);
            alert('정보를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            {/* ... Header and DatePicker unchanged ... */}
            <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/manage-members')} // Change back link if needed
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        <ArrowLeft size={24} color="var(--color-text-main)" />
                    </button>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        금일 휴무 사원
                    </h2>
                </div>
            </div>

            {/* Date Picker Component (Toggleable) */}
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        marginBottom: showCalendar ? '10px' : '0'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={20} color="#718096" />
                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2d3748' }}>
                            {(() => {
                                const [y, m, d] = date.split('-');
                                const dateObj = new Date(date);
                                const days = ['일', '월', '화', '수', '목', '금', '토'];
                                const dayName = days[dateObj.getDay()];
                                return `${y}. ${m}. ${d}. (${dayName})`;
                            })()}
                        </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#718096' }}>
                        {showCalendar ? '닫기' : '변경'}
                    </span>
                </button>

                {showCalendar && (
                    <div className="fade-in" style={{
                        background: 'white',
                        padding: '15px',
                        borderRadius: '16px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <EmbeddedCalendar
                            selectedDate={date}
                            onSelectDate={(val) => {
                                setDate(val);
                                setShowCalendar(false); // Auto close on select
                            }}
                        />
                    </div>
                )}
            </div>

            {/* List */}
            <div className="flex-col" style={{ gap: '15px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#999' }}>로딩 중...</div>
                ) : leaves.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#999', marginTop: '30px' }}>
                        해당 날짜에 휴무 내역이 없습니다.
                    </div>
                ) : (
                    leaves.map((item) => {
                        // Determine Style
                        // Full -> Purple
                        // Low priority / Half -> Blue
                        // Special Log -> Same as others? User said "Same as Month or Morning"
                        // I'll make Special Log match Morning (Blue)

                        let borderColor = '#3182ce'; // Blue
                        let badgeBg = '#ebf8ff';
                        let badgeColor = '#2c5282';
                        let label = '반차';

                        if (item.type === 'full') {
                            borderColor = '#805ad5'; // Purple
                            badgeBg = '#e9d8fd';
                            badgeColor = '#553c9a';
                            label = '월차';
                        } else if (item.type === 'special') {
                            // Legacy special
                            borderColor = '#e53e3e';
                            badgeBg = '#fed7d7';
                            badgeColor = '#c53030';
                            label = '특별휴가';
                        } else if (item.type === 'special_log') {
                            // New Attendance Log Special
                            // User wants it to look like Month or Morning Leave.
                            // Let's use Blue (Morning) style but custom label
                            // 1교시 -> Same as before (Red)
                            // 2~7교시 -> Blue
                            const p = item.periods ? item.periods[0] : 1;
                            if (p === 1) {
                                borderColor = '#e53e3e';
                                badgeBg = '#fed7d7';
                                badgeColor = '#c53030';
                            } else {
                                borderColor = '#3182ce';
                                badgeBg = '#ebf8ff';
                                badgeColor = '#2c5282';
                            }
                            label = `${p}교시 ${item.reason}`;
                        }

                        return (
                            <div
                                key={item.id}
                                style={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    boxShadow: 'var(--shadow-sm)',
                                    borderLeft: `5px solid ${borderColor}`
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <User size={20} color="var(--color-primary)" />
                                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                                            {item.profiles?.name || '알 수 없음'}
                                        </span>
                                    </div>
                                    <span style={{
                                        background: badgeBg,
                                        color: badgeColor,
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {label}
                                    </span>
                                </div>

                                {item.type === 'half' && item.periods && (
                                    <div style={{ marginLeft: '28px', color: '#4a5568', marginBottom: '10px' }}>
                                        <span style={{ fontWeight: '600' }}>사용 교시:</span> {item.periods.join(', ')}교시
                                    </div>
                                )}

                                {item.type === 'special' && item.reason && (
                                    <div style={{ marginLeft: '28px', color: '#c53030', marginBottom: '10px' }}>
                                        <span style={{ fontWeight: '600' }}>사유:</span> {item.reason}
                                    </div>
                                )}

                                {/* No extra details needed for special_log as reason is in label */}

                                {/* Warning if weekly limit exceeded */}
                                {item.weeklyUsage > 1.5 && (
                                    <div style={{
                                        marginTop: '10px',
                                        padding: '8px',
                                        background: '#fff5f5',
                                        borderRadius: '8px',
                                        color: '#c53030',
                                        fontSize: '0.9rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <AlertTriangle size={16} />
                                        <span>
                                            월차 사용 현황을 확인하여 주세요.
                                            <br />(이번 주 {item.weeklyUsage}일 사용)
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default TodayLeaves;
