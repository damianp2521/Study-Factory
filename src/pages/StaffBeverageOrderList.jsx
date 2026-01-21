import React, { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { BRANCH_OPTIONS } from '../constants/branches';

const StaffBeverageOrderList = ({ onBack }) => {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]); // [{ beverageName, count, users: [name, ...] }]
    const [absentUsers, setAbsentUsers] = useState([]); // List of names excluded
    const [selectedBranch, setSelectedBranch] = useState('망미점');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const branches = BRANCH_OPTIONS.filter(b => b !== '전체');

    useEffect(() => {
        const updateDate = () => {
            const today = new Date().toISOString().split('T')[0];
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

            // 1. Fetch Users in Branch (Seated)
            const { data: userData, error: userError } = await supabase
                .from('authorized_users')
                .select('id, name, seat_number')
                .eq('branch', selectedBranch)
                .not('seat_number', 'is', null) // Only seated
                .order('seat_number', { ascending: true });

            if (userError) throw userError;
            const allUsers = userData || [];

            // 2. Fetch Beverage Options
            const { data: optionsData, error: optionsError } = await supabase
                .from('beverage_options')
                .select('id, name');

            if (optionsError) throw optionsError;
            const optionsMap = {}; // id -> name
            (optionsData || []).forEach(o => optionsMap[o.id] = o.name);

            // 3. Fetch User Selections
            const userIds = allUsers.map(u => u.id);
            const { data: selectionsData, error: selectionsError } = await supabase
                .from('user_beverage_selections')
                .select('user_id, selection_1')
                .in('user_id', userIds);

            if (selectionsError) throw selectionsError;

            const selectionMap = {}; // user_id -> beverage_id (selection_1 only)
            (selectionsData || []).forEach(s => selectionMap[s.user_id] = s.selection_1);

            // 4. Fetch Today's Vacation Requests (To exclude absentees)
            // Logic: Exclude if type='full' OR (type='half' AND periods includes 1)
            const { data: vacationData, error: vacationError } = await supabase
                .from('vacation_requests')
                .select('user_id, type, periods')
                .eq('date', today)
                .in('user_id', userIds);

            if (vacationError) throw vacationError;

            const absentUserIdSet = new Set();
            (vacationData || []).forEach(req => {
                if (req.type === 'full') {
                    absentUserIdSet.add(req.user_id);
                } else if (req.type === 'half') {
                    // Check if period 1 is included (Morning absence)
                    // DB stores periods as array for 'half'. 
                    // 'half_am' usually has [1,2,3,4]. 'half_pm' [5,6,7].
                    if (req.periods && req.periods.includes(1)) {
                        absentUserIdSet.add(req.user_id);
                    }
                }
            });

            // 5. Aggregate Orders
            const orderMap = {}; // beverage_name -> { count, users: [] }
            const absentList = [];

            allUsers.forEach(user => {
                if (absentUserIdSet.has(user.id)) {
                    absentList.push(`${user.name} (${user.seat_number})`);
                    return; // Skip absentee
                }

                const beverageId = selectionMap[user.id];
                if (!beverageId) return; // No selection

                const beverageName = optionsMap[beverageId];
                if (!beverageName) return; // Unknown beverage

                if (!orderMap[beverageName]) {
                    orderMap[beverageName] = { count: 0, users: [] };
                }

                orderMap[beverageName].count++;
                orderMap[beverageName].users.push(`${user.name} (${user.seat_number})`);
            });

            // Convert to array and sort by count DESC
            const sortedOrders = Object.entries(orderMap)
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.count - a.count);

            setOrders(sortedOrders);
            setAbsentUsers(absentList);

        } catch (err) {
            console.error('Error fetching order list:', err);
            alert('데이터를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // Color palette for cards to distinct them
    const cardColors = [
        { header: '#38b2ac', body: '#e6fffa', text: '#234e52' }, // Teal
        { header: '#4299e1', body: '#ebf8ff', text: '#2c5282' }, // Blue
        { header: '#ed8936', body: '#fffaf0', text: '#7b341e' }, // Orange
        { header: '#9f7aea', body: '#faf5ff', text: '#553c9a' }, // Purple
        { header: '#f56565', body: '#fff5f5', text: '#742a2a' }, // Red
        { header: '#48bb78', body: '#f0fff4', text: '#22543d' }, // Green
    ];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0 0 20px 0' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px 0 0', display: 'flex', alignItems: 'center' }}>
                        <ChevronLeft size={24} color="#2d3748" />
                    </button>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>음료 제조표</h3>
                </div>
                <div>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.9rem',
                            color: '#4a5568',
                            outline: 'none',
                            fontFamily: 'inherit'
                        }}
                    />
                </div>
            </div>

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

            {/* Content Aggregation */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', marginTop: '20px', color: '#a0aec0' }}>로딩 중...</div>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                            {orders.map((order, idx) => {
                                const theme = cardColors[idx % cardColors.length];
                                return (
                                    <div key={order.name} style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                        <div style={{
                                            background: theme.header,
                                            color: 'white',
                                            padding: '10px',
                                            textAlign: 'center',
                                            fontWeight: 'bold',
                                            fontSize: '1rem'
                                        }}>
                                            {order.name} <span style={{ fontSize: '1.1rem', marginLeft: '5px' }}>({order.count}잔)</span>
                                        </div>
                                        <div style={{
                                            background: theme.body,
                                            color: theme.text,
                                            padding: '10px',
                                            minHeight: '100px',
                                            fontSize: '0.9rem',
                                            lineHeight: '1.5'
                                        }}>
                                            {order.users.map((u, i) => (
                                                <div key={i}>{u}</div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            {orders.length === 0 && (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#a0aec0' }}>
                                    제조할 음료가 없습니다.
                                </div>
                            )}
                        </div>

                        {/* Absentee Info (Optional debug or info) */}
                        {absentUsers.length > 0 && (
                            <div style={{ padding: '15px', background: '#f7fafc', borderRadius: '8px', border: '1px solid #edf2f7' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#718096' }}>제외된 인원 (오전 부재)</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.85rem', color: '#a0aec0' }}>
                                    {absentUsers.map((u, i) => <span key={i}>{u}</span>)}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default StaffBeverageOrderList;
