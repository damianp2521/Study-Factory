import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, Check, Trash2 } from 'lucide-react';
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
    const [selectedPeriods, setSelectedPeriods] = useState([]); // [1, 2, ..., 7]
    const [reasonType, setReasonType] = useState('알바'); // '알바', '스터디', '병원', '개인'
    const [customReason, setCustomReason] = useState('');

    // History State
    const [history, setHistory] = useState([]);

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

    // Fetch History when User is selected
    useEffect(() => {
        if (selectedUser) {
            fetchHistory();
        }
    }, [selectedUser]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
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

    const fetchHistory = async () => {
        if (!selectedUser) return;
        try {
            // Fetch RECENT attendance logs with status
            const { data, error } = await supabase
                .from('attendance_logs')
                .select('*')
                .eq('user_id', selectedUser.id)
                .not('status', 'is', null) // Only special statuses
                .order('date', { ascending: false })
                .limit(50);

            if (error) throw error;
            setHistory(data || []);
        } catch (err) {
            console.error('Error fetching history:', err);
        }
    };

    const handleUserSelect = (user) => {
        setSelectedUser(user);
        setView('form');
        setSelectedDates([]); // Reset dates
        setCustomReason('');
        setReasonType('알바');
        setSelectedPeriods([]);
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

    const togglePeriod = (p) => {
        if (p === 'all') {
            setSelectedPeriods(prev => prev.length === 7 ? [] : [1, 2, 3, 4, 5, 6, 7]);
            return;
        }
        setSelectedPeriods(prev => {
            if (prev.includes(p)) return prev.filter(x => x !== p);
            return [...prev, p].sort((a, b) => a - b);
        });
    };

    const handleSubmit = async () => {
        if (selectedDates.length === 0) {
            alert('날짜를 선택해주세요.');
            return;
        }
        if (selectedPeriods.length === 0) {
            alert('교시를 선택해주세요.');
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

        if (confirm(`${selectedUser.name}님의 일정(${finalReason})을 등록하시겠습니까?\n날짜: ${selectedDates.join(', ')}\n교시: ${selectedPeriods.join(', ')}`)) {
            setLoading(true);
            try {
                // Prepare Upserts for attendance_logs
                const upserts = [];
                selectedDates.forEach(date => {
                    selectedPeriods.forEach(p => {
                        upserts.push({
                            user_id: selectedUser.id,
                            date: date,
                            period: p,
                            status: finalReason
                        });
                    });
                });

                const { error } = await supabase
                    .from('attendance_logs')
                    .upsert(upserts, { onConflict: 'user_id, date, period' });

                if (error) throw error;

                alert('등록되었습니다.');
                setSelectedDates([]);
                setSelectedPeriods([]);
                fetchHistory(); // Refresh history
            } catch (err) {
                console.error(err);
                alert('등록 실패: ' + err.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDeleteHistory = async (id) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            const { error } = await supabase
                .from('attendance_logs')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchHistory();
        } catch (err) {
            console.error(err);
            alert('삭제 실패');
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

            {/* Period Selection */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#4a5568' }}>교시</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {[1, 2, 3, 4, 5, 6, 7].map(p => (
                        <button
                            key={p}
                            onClick={() => togglePeriod(p)}
                            style={{
                                padding: '12px 0', borderRadius: '8px',
                                border: selectedPeriods.includes(p) ? '2px solid #3182ce' : '1px solid #e2e8f0',
                                background: selectedPeriods.includes(p) ? '#ebf8ff' : 'white',
                                color: selectedPeriods.includes(p) ? '#2c5282' : '#a0aec0',
                                fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem'
                            }}
                        >
                            {p}
                        </button>
                    ))}
                    <button
                        onClick={() => togglePeriod('all')}
                        style={{
                            gridColumn: 'span 7', marginTop: '4px', padding: '10px', borderRadius: '8px',
                            border: selectedPeriods.length === 7 ? '2px solid #3182ce' : '1px solid #e2e8f0',
                            background: selectedPeriods.length === 7 ? '#ebf8ff' : 'white',
                            color: selectedPeriods.length === 7 ? '#2c5282' : '#a0aec0',
                            fontWeight: 'bold', cursor: 'pointer'
                        }}
                    >
                        전체 선택
                    </button>
                </div>
            </div>

            {/* Reason Selection */}
            <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#4a5568' }}>사유</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
                    {['알바', '스터디', '병원', '개인'].map(r => (
                        <button
                            key={r}
                            onClick={() => { setReasonType(r); setCustomReason(''); }}
                            style={{
                                padding: '10px', borderRadius: '8px',
                                border: reasonType === r ? '2px solid #38a169' : '1px solid #e2e8f0',
                                background: reasonType === r ? '#f0fff4' : 'white',
                                color: reasonType === r ? '#276749' : '#a0aec0',
                                fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem'
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
                    marginBottom: '30px'
                }}
            >
                {loading ? '처리 중...' : '신청하기'}
            </button>

            {/* History Section */}
            <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '15px', color: '#2d3748' }}>
                    신청 내역 (기타 휴무)
                </h3>
                {history.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#a0aec0', padding: '20px', background: '#f7fafc', borderRadius: '12px' }}>
                        신청 내역이 없습니다.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {history.map(item => {
                            // item is attendance_log: { id, date, period, status }
                            return (
                                <div key={item.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '15px', background: 'white', borderRadius: '12px',
                                    border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: '#2d3748', marginBottom: '4px' }}>
                                            {item.date}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: '#4a5568' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                background: '#ebf8ff',
                                                color: '#2c5282',
                                                fontSize: '0.85rem',
                                                marginRight: '6px',
                                                fontWeight: 'bold'
                                            }}>
                                                {item.status} ({item.period}교시)
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteHistory(item.id)}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '8px', color: '#e53e3e' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminOtherLeaveRequest;
