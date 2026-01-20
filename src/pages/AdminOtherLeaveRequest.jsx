import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, Check } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import EmbeddedCalendar from '../components/EmbeddedCalendar';

const AdminOtherLeaveRequest = ({ onBack }) => {
    const [view, setView] = useState('list'); // 'list' | 'form'
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(false);

    // Form State
    const [selectedDates, setSelectedDates] = useState([]); // Array of strings 'YYYY-MM-DD'
    const [timeType, setTimeType] = useState('full'); // 'full', 'am', 'pm'
    const [reasonType, setReasonType] = useState('알바'); // '알바', '스터디', '병원', '기타'
    const [customReason, setCustomReason] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (users) {
            setFilteredUsers(
                users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
    }, [searchTerm, users]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('authorized_users')
                .select('*')
                .order('name');
            if (error) throw error;
            setUsers(data || []);
            setFilteredUsers(data || []);
        } catch (err) {
            console.error(err);
            alert('사용자 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleUserSelect = (user) => {
        setSelectedUser(user);
        setView('form');
        setSelectedDates([]); // Reset dates
        setCustomReason('');
        setReasonType('알바');
        setTimeType('full');
    };

    const toggleDate = (dateStr) => {
        setSelectedDates(prev => {
            if (prev.includes(dateStr)) {
                return prev.filter(d => d !== dateStr);
            } else {
                return [...prev, dateStr].sort();
            }
        });
    };

    const handleSubmit = async () => {
        if (selectedDates.length === 0) {
            alert('날짜를 선택해주세요.');
            return;
        }

        // Determine final reason text
        let finalReason = reasonType;
        if (reasonType === '기타') {
            if (!customReason.trim()) {
                alert('기타 사유를 입력해주세요.');
                return;
            }
            finalReason = customReason.trim();
        }

        if (confirm(`${selectedUser.name}님의 휴무를 신청하시겠습니까?\n\n날짜: ${selectedDates.join(', ')}\n사유: ${finalReason}`)) {
            setLoading(true);
            try {
                // Prepare Insert Payload
                const inserts = selectedDates.map(date => {
                    let dbType = 'full';
                    let periods = null;

                    if (timeType === 'am') {
                        dbType = 'half';
                        periods = [1, 2, 3, 4]; // Morning
                    } else if (timeType === 'pm') {
                        dbType = 'half';
                        periods = [5, 6, 7]; // Afternoon
                    }

                    return {
                        user_id: selectedUser.id,
                        type: dbType,
                        periods: periods,
                        date: date,
                        reason: finalReason
                    };
                });

                const { error } = await supabase
                    .from('vacation_requests')
                    .insert(inserts);

                if (error) throw error;

                alert('신청되었습니다.');
                onBack(); // Go back to menu
            } catch (err) {
                console.error(err);
                alert('신청 실패: ' + err.message);
            } finally {
                setLoading(false);
            }
        }
    };

    // --- RENDER: LIST VIEW ---
    if (view === 'list') {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', marginLeft: '-8px' }}>
                        <ChevronLeft size={26} color="#2d3748" />
                    </button>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0 4px' }}>사원 선택</h2>
                </div>

                <div style={{ position: 'relative', marginBottom: '15px' }}>
                    <Search size={20} color="#a0aec0" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="이름 검색"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px',
                            border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box'
                        }}
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredUsers.map(user => (
                        <div key={user.id} onClick={() => handleUserSelect(user)} style={{
                            padding: '15px', background: 'white', borderRadius: '12px',
                            border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontWeight: 'bold', color: '#2d3748' }}>{user.name}</div>
                                <div style={{ fontSize: '0.85rem', color: '#718096' }}>{user.branch}</div>
                            </div>
                            <ChevronRight size={20} color="#cbd5e0" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // --- RENDER: FORM VIEW ---
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', marginLeft: '-8px' }}>
                    <ChevronLeft size={26} color="#2d3748" />
                </button>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0 4px' }}>
                    {selectedUser.name} 기타 휴무 신청
                </h2>
            </div>

            {/* Calendar */}
            <div style={{ background: 'white', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <EmbeddedCalendar
                    selectedDates={selectedDates}
                    onSelectDate={toggleDate}
                />
                <div style={{ textAlign: 'center', marginTop: '10px', color: '#718096', fontSize: '0.9rem' }}>
                    {selectedDates.length > 0 ? `${selectedDates.length}일 선택됨` : '날짜를 선택하세요 (다중 선택 가능)'}
                </div>
            </div>

            {/* Time Selection */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#4a5568' }}>시간</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['full', 'am', 'pm'].map(type => (
                        <button
                            key={type}
                            onClick={() => setTimeType(type)}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '8px',
                                border: timeType === type ? '2px solid #3182ce' : '1px solid #e2e8f0',
                                background: timeType === type ? '#ebf8ff' : 'white',
                                color: timeType === type ? '#2c5282' : '#a0aec0',
                                fontWeight: 'bold', cursor: 'pointer'
                            }}
                        >
                            {type === 'full' ? '종일' : type === 'am' ? '오전' : '오후'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Reason Selection */}
            <div style={{ marginBottom: '25px', flex: 1 }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#4a5568' }}>사유</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    {['알바', '스터디', '병원'].map(r => (
                        <button
                            key={r}
                            onClick={() => { setReasonType(r); setCustomReason(''); }}
                            style={{
                                flex: 1, padding: '10px', borderRadius: '8px',
                                border: reasonType === r ? '2px solid #38a169' : '1px solid #e2e8f0',
                                background: reasonType === r ? '#f0fff4' : 'white',
                                color: reasonType === r ? '#276749' : '#a0aec0',
                                fontWeight: 'bold', cursor: 'pointer'
                            }}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                {/* Custom Reason Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => setReasonType('기타')}
                        style={{
                            padding: '10px 15px', borderRadius: '8px',
                            border: reasonType === '기타' ? '2px solid #d69e2e' : '1px solid #e2e8f0',
                            background: reasonType === '기타' ? '#fffff0' : 'white',
                            color: reasonType === '기타' ? '#975a16' : '#a0aec0',
                            fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap'
                        }}
                    >
                        기타
                    </button>
                    <input
                        type="text"
                        placeholder="사유 입력 (8자 이내)"
                        maxLength={8}
                        value={customReason}
                        onChange={(e) => {
                            setCustomReason(e.target.value);
                            setReasonType('기타');
                        }}
                        disabled={reasonType !== '기타'}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '8px',
                            border: '1px solid #e2e8f0', outline: 'none',
                            background: reasonType === '기타' ? 'white' : '#f7fafc'
                        }}
                    />
                </div>
            </div>

            <button
                onClick={handleSubmit}
                disabled={loading || selectedDates.length === 0}
                style={{
                    width: '100%', padding: '16px', borderRadius: '12px',
                    background: 'var(--color-primary)', color: 'white',
                    border: 'none', fontSize: '1.1rem', fontWeight: 'bold',
                    cursor: loading ? 'wait' : 'pointer',
                    opacity: (loading || selectedDates.length === 0) ? 0.7 : 1,
                    marginBottom: '20px'
                }}
            >
                {loading ? '처리 중...' : '신청하기'}
            </button>
        </div>
    );
};

export default AdminOtherLeaveRequest;
