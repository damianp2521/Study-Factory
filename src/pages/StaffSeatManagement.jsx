import React, { useState, useEffect } from 'react';
import { ChevronLeft, Search, User, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { BRANCH_OPTIONS } from '../constants/branches';

const StaffSeatManagement = ({ onBack }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('망미점'); // Default to Mangmi
    const [seatMap, setSeatMap] = useState({}); // Map seat_number -> user object

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [targetSeat, setTargetSeat] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const branches = BRANCH_OPTIONS.filter(b => b !== '전체'); // Exclude '전체' for assignment context

    useEffect(() => {
        fetchUsers();
    }, [selectedBranch]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('authorized_users')
                .select('*')
                .eq('branch', selectedBranch)
                .order('name', { ascending: true });

            if (error) throw error;

            setUsers(data || []);

            // Build Seat Map
            const map = {};
            (data || []).forEach(u => {
                if (u.seat_number) {
                    map[u.seat_number] = u;
                }
            });
            setSeatMap(map);

        } catch (error) {
            console.error('Error fetching users:', error);
            alert('사원 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSeatClick = (seatNum) => {
        setTargetSeat(seatNum);
        setIsModalOpen(true);
        setSearchTerm('');
    };

    const handleAssignUser = async (user) => {
        if (!window.confirm(`${user.name} 사원을 ${targetSeat}번 좌석에 배정하시겠습니까?`)) return;

        try {
            // Update RPC
            const { error } = await supabase.rpc('update_employee_info', {
                target_id: user.id,
                new_branch: user.branch, // Keep existing
                new_role: user.role,     // Keep existing
                new_seat_number: targetSeat
            });

            if (error) throw error;

            alert('배정되었습니다.');
            setIsModalOpen(false);
            await fetchUsers(); // Refresh

        } catch (error) {
            console.error('Assignment Error:', error);
            alert(`배정에 실패했습니다.\n${error.message}`);
        }
    };

    const handleUnassign = async (seatNum) => {
        const user = seatMap[seatNum];
        if (!user) return;
        if (!window.confirm(`${user.name} 사원의 좌석 배정을 해제하시겠습니까?`)) return;

        try {
            const { error } = await supabase.rpc('update_employee_info', {
                target_id: user.id,
                new_branch: user.branch,
                new_role: user.role,
                new_seat_number: null // Unassign
            });

            if (error) throw error;

            alert('해제되었습니다.');
            fetchUsers();

        } catch (error) {
            console.error('Unassign Error:', error);
            alert(`해제에 실패했습니다.\n${error.message}`);
        }
    };

    const filteredUsersForSearch = users.filter(u =>
        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                        onClick={onBack}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px',
                            marginLeft: '-8px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#2d3748'
                        }}
                    >
                        <ChevronLeft size={26} />
                    </button>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 0 4px', lineHeight: 1 }}>사원 좌석 관리</h2>
                </div>
                {/* Branch Selection */}
                <div style={{ display: 'flex', gap: '5px' }}>
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
                                cursor: 'pointer'
                            }}
                        >
                            {b}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                {selectedBranch === '망미점' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Array.from({ length: 102 }, (_, i) => i + 1).map(num => {
                            const user = seatMap[num];
                            return (
                                <div key={num} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 15px',
                                    background: 'white',
                                    borderRadius: '12px',
                                    border: user ? '1px solid #90cdf4' : '1px solid #e2e8f0',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{
                                            width: '32px', height: '32px',
                                            borderRadius: '8px',
                                            background: user ? '#ebf8ff' : '#edf2f7',
                                            color: user ? '#2b6cb0' : '#a0aec0',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 'bold', fontSize: '0.9rem'
                                        }}>
                                            {num}
                                        </div>
                                        {user ? (
                                            <div>
                                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2d3748' }}>{user.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#718096' }}>{user.role === 'admin' ? '관리자' : user.role === 'staff' ? '스탭' : '회원'}</div>
                                            </div>
                                        ) : (
                                            <div style={{ color: '#a0aec0', fontSize: '0.9rem' }}>공석</div>
                                        )}
                                    </div>

                                    {user ? (
                                        <button
                                            onClick={() => handleUnassign(num)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                background: '#fff5f5',
                                                color: '#c53030',
                                                border: '1px solid #feb2b2',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            배정 해제
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleSeatClick(num)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                background: '#f0fff4',
                                                color: '#2f855a',
                                                border: '1px solid #9ae6b4',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            배정 하기
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', marginTop: '50px', color: '#a0aec0' }}>
                        망미점 외 지점은 준비 중입니다.
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        width: '90%', maxWidth: '400px',
                        borderRadius: '16px',
                        padding: '20px',
                        display: 'flex', flexDirection: 'column',
                        maxHeight: '80vh'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
                                {targetSeat}번 좌석 배정
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ position: 'relative', marginBottom: '15px' }}>
                            <Search size={20} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
                            <input
                                type="text"
                                placeholder="이름 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 10px 10px 38px',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {filteredUsersForSearch.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => handleAssignUser(u)}
                                    style={{
                                        width: '100%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '12px',
                                        border: 'none',
                                        background: u.seat_number ? '#f7fafc' : 'white',
                                        borderBottom: '1px solid #edf2f7',
                                        cursor: 'pointer',
                                        textAlign: 'left'
                                    }}
                                    disabled={!!u.seat_number} // Already seated elsewhere
                                >
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: u.seat_number ? '#a0aec0' : '#2d3748' }}>{u.name || '이름 없음'}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#a0aec0' }}>{u.branch} | {u.role === 'member' ? '회원' : '스탭/관리자'}</div>
                                    </div>
                                    {u.seat_number ? (
                                        <div style={{ fontSize: '0.8rem', color: '#e53e3e' }}>{u.seat_number}번 사용중</div>
                                    ) : (
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #cbd5e0' }}></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffSeatManagement;
