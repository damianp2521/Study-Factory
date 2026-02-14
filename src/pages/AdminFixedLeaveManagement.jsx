import React, { useState, useEffect } from 'react';
import { ChevronLeft, Trash2, Calendar, Play } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { addDays, startOfWeek, format, nextMonday } from 'date-fns';

const AdminFixedLeaveManagement = ({ onBack }) => {
    const [requests, setRequests] = useState([]);
    const [lastGenerated, setLastGenerated] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchRequests();
        const saved = localStorage.getItem('fixed_leave_last_generated');
        if (saved) setLastGenerated(saved);
    }, []);

    const fetchRequests = async () => {
        try {
            // Join with profiles to get name and branch
            const { data, error } = await supabase
                .from('fixed_leave_requests')
                .select(`
                    *,
                    profiles:user_id (name, branch)
                `)
                .order('day_of_week', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data || []);
        } catch (err) {
            console.error(err);
            alert('목록을 불러오지 못했습니다.');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('정말 삭제하시겠습니까? 더 이상 자동 생성되지 않습니다.')) return;
        try {
            const { error } = await supabase
                .from('fixed_leave_requests')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchRequests();
        } catch (err) {
            console.error(err);
            alert('삭제 실패');
        }
    };

    const handleGenerateNextWeek = async () => {
        // Calculate Range: This Week Monday ~ Next Week Sunday
        const today = new Date();
        const thisMon = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        const nextMon = nextMonday(today);
        const nextSun = addDays(nextMon, 6);

        const startDateStr = format(thisMon, 'yyyy-MM-dd');
        const endDateStr = format(nextSun, 'yyyy-MM-dd');

        if (!confirm(`이번 주 + 다음 주(${startDateStr} ~ ${endDateStr})의 고정 휴무를 생성하시겠습니까?\n(이미 존재하는 기록은 덮어씌워질 수 있습니다.)`)) return;

        try {
            const { data, error } = await supabase
                .rpc('generate_fixed_leaves', {
                    target_start_date: startDateStr,
                    target_end_date: endDateStr
                });

            if (error) throw error;

            const nowStr = format(new Date(), 'yy.MM.dd(eee) HH:mm', { locale: (await import('date-fns/locale')).ko });
            setLastGenerated(nowStr);
            localStorage.setItem('fixed_leave_last_generated', nowStr);

            alert(`생성 완료! 총 ${data}건의 기록이 처리되었습니다.`);
        } catch (err) {
            console.error(err);
            alert('생성 실패: ' + err.message);
        }
    };

    // Group requests by User
    const groupedRequests = {};
    requests.forEach(req => {
        const uid = req.user_id;
        if (!groupedRequests[uid]) {
            groupedRequests[uid] = {
                user: req.profiles,
                items: []
            };
        }
        groupedRequests[uid].items.push(req);
    });

    // Convert to array and filter
    const groupedArray = Object.values(groupedRequests)
        .filter(group => (group.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''));

    // Sort items within user: Day -> Start Period
    groupedArray.forEach(group => {
        group.items.sort((a, b) => {
            if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
            const periodA = a.periods[0] || 0;
            const periodB = b.periods[0] || 0;
            return periodA - periodB;
        });
    });

    const daysMap = ['일', '월', '화', '수', '목', '금', '토'];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header Area */}
            <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', marginLeft: '-8px' }}>
                            <ChevronLeft size={26} color="#2d3748" />
                        </button>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0 4px' }}>고정 기타 휴무 관리</h2>
                    </div>

                    {/* Manual Generation Button & Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <button
                            onClick={handleGenerateNextWeek}
                            style={{
                                padding: '6px 10px', borderRadius: '6px',
                                background: '#38a169', color: 'white', border: 'none',
                                fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px',
                                cursor: 'pointer', fontSize: '0.85rem'
                            }}
                        >
                            <Play size={14} />
                            다음주 자동 생성
                        </button>
                        {lastGenerated && (
                            <div style={{ fontSize: '0.7rem', color: '#718096' }}>
                                {lastGenerated} 생성됨
                            </div>
                        )}
                    </div>
                </div>

                {/* Search Bar */}
                <input
                    type="text"
                    placeholder="이름 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%', padding: '10px', borderRadius: '8px',
                        border: '1px solid #e2e8f0', fontSize: '0.95rem',
                        background: '#f7fafc', outline: 'none', boxSizing: 'border-box'
                    }}
                />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
                {groupedArray.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '50px', color: '#a0aec0' }}>
                        {searchTerm ? '검색 결과가 없습니다.' : '등록된 고정 휴무가 없습니다.'}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {groupedArray.map((group, idx) => (
                            <div key={idx} style={{
                                padding: '15px', background: 'white', borderRadius: '12px',
                                border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}>
                                {/* Header: Branch + Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #f7fafc' }}>
                                    <span style={{
                                        background: '#ebf8ff', color: '#2b6cb0', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem'
                                    }}>
                                        {group.user?.branch}
                                    </span>
                                    <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#2d3748' }}>
                                        {group.user?.name}
                                    </span>
                                </div>

                                {/* Items List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {group.items.map(req => (
                                        <div key={req.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}>
                                                <span style={{ color: '#718096', width: '80px' }}>
                                                    매주 {daysMap[req.day_of_week]}요일
                                                </span>
                                                <span style={{ fontWeight: 'bold', color: '#2f855a', width: '40px' }}>
                                                    {req.reason}
                                                </span>
                                                <span style={{ color: '#4a5568' }}>
                                                    ({req.periods.join(', ')}교시)
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => handleDelete(req.id)}
                                                style={{
                                                    background: '#fff5f5', color: '#c53030', border: 'none',
                                                    padding: '6px', borderRadius: '6px', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminFixedLeaveManagement;
