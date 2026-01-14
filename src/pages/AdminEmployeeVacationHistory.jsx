import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const AdminEmployeeVacationHistory = ({ onBack }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('전체');
    const [selectedUser, setSelectedUser] = useState(null); // If set, show Calendar view
    const [currentDate, setCurrentDate] = useState(new Date()); // For Calendar navigation
    const [userVacations, setUserVacations] = useState([]);
    const [vacationLoading, setVacationLoading] = useState(false);

    const branches = ['전체', '망미점'];

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

    // 2. Fetch Vacations when user is selected or month changes
    useEffect(() => {
        if (selectedUser) {
            fetchUserVacations();
        }
    }, [selectedUser, currentDate]);

    const fetchUserVacations = async () => {
        if (!selectedUser) return;
        setVacationLoading(true);
        try {
            // Fetch all requests for this user. 
            // Optimally we could filter by month, but fetching all is fine for now as history won't be huge yet.
            // Or better, filter by current month range to be efficient.
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();

            // Actually, let's just fetch all for simplicity in navigation for now, or fetch by range. 
            // Let's fetch by current month range from DB to be safe.
            // Wait, standardizing date strings 'YYYY-MM-DD'.
            const y = currentDate.getFullYear();
            const m = String(currentDate.getMonth() + 1).padStart(2, '0');
            const queryDateStart = `${y}-${m}-01`;
            const lastDay = new Date(y, Number(m), 0).getDate();
            const queryDateEnd = `${y}-${m}-${lastDay}`;

            const { data, error } = await supabase
                .from('vacation_requests')
                .select('*')
                .eq('user_id', selectedUser.id)
                .gte('date', queryDateStart)
                .lte('date', queryDateEnd);

            if (error) throw error;
            setUserVacations(data || []);
        } catch (error) {
            console.error('Error fetching vacations:', error);
        } finally {
            setVacationLoading(false);
        }
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];

        // Fill empty slots for previous month
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }

        // Fill actual days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(user => {
        const branchMatch = selectedBranch === '전체' || user.branch === selectedBranch;
        const nameMatch = user.name.toLowerCase().includes(searchTerm.toLowerCase());
        return branchMatch && nameMatch;
    });

    // --- RENDER ---

    // VIEW 1: User List (Similar to AdminMemberStatus)
    if (!selectedUser) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end', minWidth: 0 }}>
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
                                cursor: 'pointer',
                                flexShrink: 0
                            }}
                        >
                            {branches.map(branch => (
                                <option key={branch} value={branch}>
                                    {branch === '전체' ? '전체 지점' : branch}
                                </option>
                            ))}
                        </select>

                        <div style={{ position: 'relative', maxWidth: '140px', flex: 1 }}>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="이름 검색"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
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
    }

    // VIEW 2: Calendar for Selected User
    const days = getDaysInMonth(currentDate);

    // Helper to find vacation for a date
    const getVacationForDate = (date) => {
        if (!date) return null;
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return userVacations.find(v => v.date === dateString);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <button
                    onClick={() => setSelectedUser(null)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        marginLeft: '-8px',
                        borderRadius: '50%',
                        color: '#2d3748',
                        display: 'flex', alignItems: 'center'
                    }}
                >
                    <ChevronLeft size={26} />
                </button>
                <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: 0, lineHeight: 1.2 }}>
                        {selectedUser.name}
                    </h2>
                    <span style={{ fontSize: '0.85rem', color: '#718096' }}>{selectedUser.branch} 휴가 현황</span>
                </div>
            </div>

            {/* Calendar Controls */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px',
                marginBottom: '20px', padding: '10px', background: 'white', borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <button onClick={handlePrevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
                    <ChevronLeft size={20} color="#4a5568" />
                </button>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2d3748', minWidth: '100px', textAlign: 'center' }}>
                    {currentDate.getFullYear()}. {String(currentDate.getMonth() + 1).padStart(2, '0')}
                </span>
                <button onClick={handleNextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
                    <ChevronRight size={20} color="#4a5568" />
                </button>
            </div>

            {/* Calendar Grid */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Weekday Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '10px', textAlign: 'center' }}>
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                        <div key={day} style={{
                            fontWeight: 'bold',
                            color: i === 0 ? '#e53e3e' : i === 6 ? '#3182ce' : '#718096',
                            fontSize: '0.9rem'
                        }}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', autoRows: 'minmax(80px, 1fr)' }}>
                    {days.map((date, i) => {
                        if (!date) return <div key={`empty-${i}`} />;

                        const vacation = getVacationForDate(date);
                        let label = '';
                        let bgColor = 'white';
                        let textColor = '#2d3748';
                        let borderColor = '#f7fafc';

                        if (vacation) {
                            if (vacation.type === 'full') {
                                label = '월차';
                                bgColor = '#fff5f5';
                                textColor = '#c53030';
                                borderColor = '#feb2b2';
                            } else if (vacation.type === 'half') {
                                const periods = vacation.periods || [];
                                if (periods.includes(1)) {
                                    label = '오전반차'; // AM
                                    bgColor = '#fff5f5';
                                    textColor = '#c53030'; // Red requested
                                    borderColor = '#feb2b2';
                                } else {
                                    label = '오후반차'; // PM
                                    bgColor = '#fff5f5'; // Red requested for PM too
                                    textColor = '#c53030';
                                    borderColor = '#feb2b2';
                                }
                            } else if (vacation.type === 'special') {
                                label = '특별휴가';
                                bgColor = '#f0fff4'; // Maybe keep special Distinct? Or Red too? User didn't verify special.
                                textColor = '#2f855a'; // Greenish for special usually, or Red if 'Sick'. 
                                // Let's keep it distinguishable but clear.
                            }
                        }

                        return (
                            <div key={i} style={{
                                background: bgColor,
                                borderRadius: '8px',
                                border: `1px solid ${borderColor}`,
                                padding: '4px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                position: 'relative',
                                opacity: vacationLoading ? 0.5 : 1
                            }}>
                                <span style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    marginBottom: '4px',
                                    color: date.getDay() === 0 ? '#e53e3e' : date.getDay() === 6 ? '#3182ce' : '#718096'
                                }}>
                                    {date.getDate()}
                                </span>
                                {vacation && (
                                    <div style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        color: textColor,
                                        textAlign: 'center',
                                        wordBreak: 'keep-all',
                                        lineHeight: 1.2
                                    }}>
                                        {label}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminEmployeeVacationHistory;
