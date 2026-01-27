import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, AlertTriangle, Search, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import EmbeddedCalendar from '../components/EmbeddedCalendar';
import { BRANCH_LIST } from '../constants/branches';

const TodayLeaves = () => {
    const navigate = useNavigate();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default today
    const [showCalendar, setShowCalendar] = useState(false);
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(false);

    // UI State
    const [selectedBranch, setSelectedBranch] = useState('전체'); // '전체', '망미점', '화명점', ...
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('전체'); // '전체', '월차', '오전', '오후'

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
                        profiles (name, id, branch)
                    `)
                    .eq('date', date),
                supabase
                    .from('attendance_logs')
                    .select(`
                        user_id, status, period,
                        profiles (name, id, branch)
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

            // Improved Merge Logic:
            // Allow logs to appear even if user has vacation, UNLESS it's a redundant label (e.g. '월차', '반차').
            // This ensures specific statuses like '병원', '지각' appear alongside or independent of vacations.
            const vacationUserIds = new Set(results.map(r => r.user_id));
            const newLogItems = logItems.filter(item => {
                const hasVacation = vacationUserIds.has(item.user_id);
                if (!hasVacation) return true; // Show if no vacation

                // If user has vacation, filter out generic/redundant statuses
                const redundantStatuses = ['월차', '반차', '오전', '오후', '출석', '결석', 'O', 'X'];
                if (redundantStatuses.includes(item.reason)) return false;

                return true; // Show specific statuses (Late, Hospital, etc.)
            });

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

    // Filtering Logic
    const filteredLeaves = leaves.filter(item => {
        const userBranch = item.profiles?.branch || '미지정';
        const userName = item.profiles?.name || '';

        // 1. Branch Filter
        if (selectedBranch !== '전체' && userBranch !== selectedBranch) return false;

        // 2. Search Filter
        if (searchTerm.trim() && !userName.includes(searchTerm.trim())) return false;

        // 3. Tab Filter
        if (activeTab === '월차') {
            return item.type === 'full';
        }
        if (activeTab === '오전') {
            // Half AM or Special Log AM
            if (item.type === 'half') {
                return (item.periods || []).some(p => p <= 4);
            }
            if (item.type === 'special_log') {
                const p = item.periods ? item.periods[0] : 1;
                return p <= 4;
            }
            return false;
        }
        if (activeTab === '오후') {
            // Half PM or Special Log PM
            if (item.type === 'half') {
                return (item.periods || []).some(p => p > 4);
            }
            if (item.type === 'special_log') {
                const p = item.periods ? item.periods[0] : 1;
                return p > 4;
            }
            return false;
        }

        return true;
    });

    return (
        <div style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            {/* ... Header and DatePicker unchanged ... */}
            <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/manage-members')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        <ArrowLeft size={24} color="var(--color-text-main)" />
                    </button>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        일별 사원 휴무 현황
                    </h2>
                </div>
            </div>

            {/* Controls: Search, Branch, Date, Tabs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>

                {/* 1. Top Row: Search (Left) & Branch (Right) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Search */}
                    <div>
                        {isSearchOpen ? (
                            <form style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center',
                                    background: 'white', border: '1px solid #cbd5e0', borderRadius: '20px',
                                    padding: '6px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    <Search size={18} color="#a0aec0" style={{ marginRight: '5px' }} />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="이름 검색"
                                        style={{
                                            border: 'none', outline: 'none', fontSize: '0.9rem', width: '100px', color: '#4a5568'
                                        }}
                                        autoFocus
                                        onBlur={() => {
                                            if (!searchTerm) setIsSearchOpen(false);
                                        }}
                                    />
                                </div>
                            </form>
                        ) : (
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                style={{
                                    background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px',
                                    padding: '8px 14px', fontSize: '0.9rem', color: '#718096', fontWeight: 'bold',
                                    display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                            >
                                <Search size={18} />
                                <span>이름 검색</span>
                            </button>
                        )}
                    </div>

                    {/* Branch Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            style={{
                                appearance: 'none',
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '20px',
                                padding: '8px 32px 8px 16px',
                                fontSize: '0.9rem',
                                color: '#2d3748',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                outline: 'none'
                            }}
                        >
                            <option value="전체">전체 지점</option>
                            {BRANCH_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <ChevronDown size={16} color="#718096" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>
                </div>

                {/* 2. Date Picker */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        style={{
                            width: '100%', padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                            fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748', fontFamily: 'monospace' // Monospace for date look
                        }}
                    >
                        <span>
                            {(() => {
                                const [y, m, d] = date.split('-');
                                const dateObj = new Date(date);
                                const days = ['일', '월', '화', '수', '목', '금', '토'];
                                const dayName = days[dateObj.getDay()];
                                return `${y}. ${parseInt(m)}. ${parseInt(d)}. (${dayName})`;
                            })()}
                        </span>
                        <Calendar size={22} color="#718096" />
                    </button>
                    {showCalendar && (
                        <div style={{
                            position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 10,
                            background: 'white', padding: '15px', borderRadius: '16px',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0'
                        }}>
                            <EmbeddedCalendar
                                selectedDate={date}
                                onSelectDate={(val) => {
                                    setDate(val);
                                    setShowCalendar(false);
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* 3. Filter Tabs */}
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '2px' }}>
                    {['전체', '월차', '오전', '오후'].map(tab => {
                        const confirmColor = tab === '월차' ? '#e53e3e' : tab === '오전' ? '#e53e3e' : tab === '오후' ? '#3182ce' : '#2d3748'; // Colors based on screenshot roughly
                        // Actually screenshot: 월차(Red text?), 오전(Red text?), 오후(Blue text?)

                        // Active Style
                        const isActive = activeTab === tab;
                        let activeBorder = '#e53e3e';
                        let activeText = '#e53e3e';

                        if (tab === '전체') { activeBorder = '#718096'; activeText = '#2d3748'; }
                        if (tab === '월차') { activeBorder = '#e53e3e'; activeText = '#e53e3e'; }
                        if (tab === '오전') { activeBorder = '#e53e3e'; activeText = '#e53e3e'; }
                        if (tab === '오후') { activeBorder = '#3182ce'; activeText = '#3182ce'; }

                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: isActive ? `2px solid ${activeBorder}` : '1px solid #e2e8f0',
                                    background: isActive ? '#fff' : '#f7fafc',
                                    color: isActive ? activeText : '#a0aec0',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {tab}
                            </button>
                        );
                    })}
                </div>

            </div>

            {/* List */}
            <div className="flex-col" style={{ gap: '15px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#999' }}>로딩 중...</div>
                ) : filteredLeaves.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#999', marginTop: '30px' }}>
                        내역이 없습니다.
                    </div>
                ) : (
                    filteredLeaves.map((item) => {
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
