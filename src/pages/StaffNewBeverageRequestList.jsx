import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { BRANCH_OPTIONS } from '../constants/branches';

const formatBeverage2 = (request) => {
    if (!request) return '-';

    if (request.beverage_2_choice === '안먹음') {
        return '안먹음';
    }

    let value = request.beverage_2_choice === '기타'
        ? (request.beverage_2_custom || '기타')
        : request.beverage_2_choice;

    if (request.use_personal_tumbler) {
        value = `텀블러 ${value}`;
    }

    return value;
};

const cardStyle = {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '14px 16px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
};

const StaffNewBeverageRequestList = ({ onBack }) => {
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('전체');

    const branches = useMemo(() => BRANCH_OPTIONS, []);

    const fetchRequests = useCallback(async () => {
        setLoading(true);

        try {
            let requestQuery = supabase
                .from('new_beverage_requests')
                .select('user_id, beverage_1_choice, beverage_2_choice, beverage_2_custom, use_personal_tumbler, updated_at')
                .order('updated_at', { ascending: false });

            const { data: requestData, error: requestError } = await requestQuery;

            if (requestError) throw requestError;

            const rows = requestData || [];
            if (rows.length === 0) {
                setRequests([]);
                return;
            }

            const userIds = rows.map((row) => row.user_id);

            let usersQuery = supabase
                .from('authorized_users')
                .select('id, name, seat_number, branch')
                .in('id', userIds);

            if (selectedBranch !== '전체') {
                usersQuery = usersQuery.eq('branch', selectedBranch);
            }

            const { data: userData, error: userError } = await usersQuery;
            if (userError) throw userError;

            const userMap = new Map((userData || []).map((user) => [user.id, user]));

            const merged = rows
                .map((row) => {
                    const user = userMap.get(row.user_id);
                    if (!user) return null;

                    return {
                        id: row.user_id,
                        name: user.name,
                        seatNumber: user.seat_number,
                        branch: user.branch,
                        beverage1: row.beverage_1_choice,
                        beverage2: formatBeverage2(row),
                        updatedAt: row.updated_at
                    };
                })
                .filter(Boolean)
                .sort((a, b) => {
                    if (a.seatNumber && b.seatNumber) return a.seatNumber - b.seatNumber;
                    if (a.seatNumber) return -1;
                    if (b.seatNumber) return 1;
                    return a.name.localeCompare(b.name, 'ko');
                });

            setRequests(merged);
        } catch (error) {
            console.error('Error fetching new beverage requests:', error);
            alert('신음료 신청 데이터를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [selectedBranch]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0 8px 0 0',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <ChevronLeft size={24} color="#2d3748" />
                </button>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>신음료 신청</h3>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                {branches.map((branch) => (
                    <button
                        key={branch}
                        onClick={() => setSelectedBranch(branch)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: selectedBranch === branch ? 'none' : '1px solid #e2e8f0',
                            background: selectedBranch === branch ? 'var(--color-primary)' : 'white',
                            color: selectedBranch === branch ? 'white' : '#718096',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {branch}
                    </button>
                ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', marginTop: '20px', color: '#a0aec0' }}>로딩 중...</div>
                ) : requests.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '20px', color: '#a0aec0' }}>신음료 신청 내역이 없습니다.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {requests.map((item) => (
                            <div key={item.id} style={cardStyle}>
                                <div style={{ fontWeight: 'bold', color: '#2d3748', marginBottom: '6px' }}>
                                    {(item.seatNumber || '-')}번 {item.name}
                                </div>
                                <div style={{ color: '#4a5568', fontSize: '0.95rem' }}>
                                    {item.beverage1}, {item.beverage2}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffNewBeverageRequestList;
