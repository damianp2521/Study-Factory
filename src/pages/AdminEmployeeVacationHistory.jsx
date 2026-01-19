import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { BRANCH_OPTIONS } from '../constants/branches';
import AdminVacationDetails from '../components/AdminVacationDetails';

const AdminEmployeeVacationHistory = ({ onBack }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('전체');
    const [selectedUser, setSelectedUser] = useState(null); // If set, show Calendar view

    // Removed duplicate state logic for calendar as it's now in child component

    const branches = BRANCH_OPTIONS;

    // 1. Fetch Users
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Fetch relevant users (Staff/Member) from profiles table which matches auth.uid()
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            alert('사원 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(user => {
        const branchMatch = selectedBranch === '전체' || user.branch === selectedBranch;
        const nameMatch = user.name.toLowerCase().includes(searchTerm.toLowerCase());
        return branchMatch && nameMatch;
    });

    // --- RENDER ---

    // VIEW 2: Calendar for Selected User (Using Reusable Component)
    if (selectedUser) {
        return (
            <AdminVacationDetails
                user={selectedUser}
                onBack={() => setSelectedUser(null)}
            />
        );
    }

    // VIEW 1: User List (Similar to AdminMemberStatus)
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
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
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0 4px', lineHeight: 1, whiteSpace: 'nowrap' }}>
                            사원별 휴가 현황
                        </h2>
                    </div>

                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.9rem',
                            color: '#4a5568',
                            backgroundColor: 'white',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {branches.map(branch => (
                            <option key={branch} value={branch}>
                                {branch === '전체' ? '전체 지점' : branch}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ width: '100%' }}>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="이름 검색"
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            fontSize: '1rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                            background: '#f7fafc'
                        }}
                    />
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#a0aec0' }}>로딩 중...</div>
                ) : filteredUsers.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '50px' }}>
                        사원이 없습니다.
                    </div>
                ) : (
                    filteredUsers.map(user => (
                        <div
                            key={user.id}
                            onClick={() => setSelectedUser(user)}
                            style={{
                                background: 'white',
                                borderRadius: '16px',
                                padding: '15px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                border: '1px solid #e2e8f0',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '4px' }}>
                                    {user.name}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#718096' }}>
                                    {user.branch} <span style={{ color: '#cbd5e0' }}>|</span> {user.role === 'admin' ? '관리자' : user.role === 'staff' ? '스탭' : '회원'}
                                </div>
                            </div>
                            <div style={{ color: '#a0aec0' }}>
                                <ChevronRight size={20} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminEmployeeVacationHistory;
