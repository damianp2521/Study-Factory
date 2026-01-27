import React, { useState, useEffect } from 'react';
import { ChevronLeft, Trash2, Calendar, Play } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { addDays, startOfWeek, endOfWeek, format, nextMonday } from 'date-fns';

const AdminFixedLeaveManagement = ({ onBack }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
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
        } finally {
            setLoading(false);
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
        // Calculate next Week's Monday to Sunday
        const today = new Date();
        const nextMon = nextMonday(today);
        const nextSun = addDays(nextMon, 6);

        const startDateStr = format(nextMon, 'yyyy-MM-dd');
        const endDateStr = format(nextSun, 'yyyy-MM-dd');

        if (!confirm(`다음 주(${startDateStr} ~ ${endDateStr})의 휴무를 자동 생성하시겠습니까?`)) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .rpc('generate_fixed_leaves', {
                    target_start_date: startDateStr,
                    target_end_date: endDateStr
                });

            if (error) throw error;

            alert(`생성 완료! 총 ${data}건의 출석 기록이 생성/갱신되었습니다.`);
        } catch (err) {
            console.error(err);
            alert('생성 실패: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const daysMap = ['일', '월', '화', '수', '목', '금', '토'];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', marginLeft: '-8px' }}>
                        <ChevronLeft size={26} color="#2d3748" />
                    </button>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0 4px' }}>고정 기타 휴무 관리</h2>
                </div>

                {/* Manual Generation Button */}
                <button
                    onClick={handleGenerateNextWeek}
                    style={{
                        padding: '8px 12px', borderRadius: '8px',
                        background: '#38a169', color: 'white', border: 'none',
                        fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px',
                        cursor: 'pointer', fontSize: '0.9rem'
                    }}
                >
                    <Play size={16} />
                    다음주 자동 생성
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {requests.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '50px', color: '#a0aec0' }}>
                        등록된 고정 휴무가 없습니다.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {requests.map(req => (
                            <div key={req.id} style={{
                                padding: '15px', background: 'white', borderRadius: '12px',
                                border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                        <span style={{
                                            background: '#ebf8ff', color: '#2b6cb0', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem'
                                        }}>
                                            {req.profiles?.branch}
                                        </span>
                                        <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#2d3748' }}>
                                            {req.profiles?.name}
                                        </span>
                                        <span style={{ color: '#718096', fontSize: '0.9rem' }}>
                                            매주 {daysMap[req.day_of_week]}요일
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#4a5568' }}>
                                        <span style={{ fontWeight: 'bold', color: '#2f855a', marginRight: '5px' }}>
                                            {req.reason}
                                        </span>
                                        <span>
                                            ({req.periods.join(', ')}교시)
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDelete(req.id)}
                                    style={{
                                        background: '#fff5f5', color: '#c53030', border: 'none',
                                        padding: '8px', borderRadius: '8px', cursor: 'pointer'
                                    }}
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminFixedLeaveManagement;
