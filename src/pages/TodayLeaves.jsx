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
            // 1. Fetch leaves for the selected DATE
            const { data: dailyData, error: dailyError } = await supabase
                .from('vacation_requests')
                .select(`
                    id,
                    type,
                    periods,
                    reason,
                    user_id,
                    profiles (name, id)
                `)
                .eq('date', date);

            if (dailyError) throw dailyError;

            if (!dailyData || dailyData.length === 0) {
                setLeaves([]);
                return;
            }

            // 2. For each user found, calculate their WEEKLY usage
            // Filter unique user IDs to avoid double counting if multiple entries (unlikely for 1 day but safe)
            const userIds = [...new Set(dailyData.map(item => item.user_id))];
            const { start, end } = getWeekRange(date);

            const { data: weeklyData, error: weeklyError } = await supabase
                .from('vacation_requests')
                .select('user_id, type')
                .in('user_id', userIds)
                .gte('date', start)
                .lte('date', end);

            if (weeklyError) throw weeklyError;

            // Calculate usage per user
            const usageMap = {};
            weeklyData.forEach(r => {
                const weight = r.type === 'full' ? 1.0 : 0.5;
                usageMap[r.user_id] = (usageMap[r.user_id] || 0) + weight;
            });

            // Merge Data
            const results = dailyData.map(item => ({
                ...item,
                weeklyUsage: usageMap[item.user_id] || 0
            }));

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
            {/* Header */}
            <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/staff-menu')}
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
                            {date.split('-')[0]}. {date.split('-')[1]}. {date.split('-')[2]}.
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
                            events={[/* Potential future enhancement: show leaves dots here */]}
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
                    leaves.map((item) => (
                        <div
                            key={item.id}
                            style={{
                                background: 'white',
                                borderRadius: '12px',
                                padding: '20px',
                                boxShadow: 'var(--shadow-sm)',
                                borderLeft: `5px solid ${item.type === 'full' ? '#805ad5' : '#3182ce'}`
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
                                    background: item.type === 'full' ? '#e9d8fd' : item.type === 'special' ? '#fed7d7' : '#ebf8ff',
                                    color: item.type === 'full' ? '#553c9a' : item.type === 'special' ? '#c53030' : '#2c5282',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold'
                                }}>
                                    {item.type === 'full' ? '월차' : item.type === 'special' ? '특별휴가' : '반차'}
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
                    ))
                )}
            </div>
        </div>
    );
};

export default TodayLeaves;
