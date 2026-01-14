import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

import CustomDatePicker from '../components/CustomDatePicker';

const VacationRequest = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // View Mode: 'create' | 'history'
    const [viewMode, setViewMode] = useState('create');
    const [myRequests, setMyRequests] = useState([]);

    // Type: 'full' | 'half' | 'special'
    const [type, setType] = useState('full');
    const [date, setDate] = useState('');
    const [selectedPeriods, setSelectedPeriods] = useState([]);
    const [specialReason, setSpecialReason] = useState(''); // '병가' | '기타'
    const [loading, setLoading] = useState(false);

    // Periods 1 to 7
    const periodOptions = [1, 2, 3, 4, 5, 6, 7];

    // Fetch history on view toggle
    useEffect(() => {
        if (viewMode === 'history' && user) {
            fetchMyRequests();
        }
    }, [viewMode, user]);

    const fetchMyRequests = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('vacation_requests')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (error) throw error;
            setMyRequests(data || []);
        } catch (err) {
            console.error('Error fetching requests:', err);
            alert('내역을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id, date) => {
        if (!confirm(`${date} 휴가 신청을 취소하시겠습니까?`)) return;

        try {
            const { error } = await supabase
                .from('vacation_requests')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert('취소되었습니다.');
            setMyRequests(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            console.error('Error cancelling request:', err);
            alert('취소에 실패했습니다.');
        }
    };

    const togglePeriod = (p) => {
        // Special "All" button logic (p === 'all')
        if (p === 'all') {
            setSelectedPeriods(prev => prev.length === 7 ? [] : [1, 2, 3, 4, 5, 6, 7]);
            return;
        }

        if (selectedPeriods.includes(p)) {
            setSelectedPeriods(prev => prev.filter(item => item !== p));
        } else {
            // Check logic based on type
            if (type === 'half') {
                if (selectedPeriods.length >= 4) {
                    alert('반차는 최대 4개 교시까지만 쉴 수 있습니다.\n(하루 최소 3교시 근무 필수)');
                    return;
                }
            }
            // type === 'special' has no max limit (except 7 total)
            setSelectedPeriods(prev => [...prev, p].sort((a, b) => a - b));
        }
    };

    const handleSubmit = async () => {
        if (!date) {
            alert('날짜를 선택해주세요.');
            return;
        }
        if (type === 'half' && selectedPeriods.length === 0) {
            alert('사용할 교시를 선택해주세요.');
            return;
        }
        if (type === 'special') {
            if (!specialReason) {
                alert('사유(병가/기타)를 선택해주세요.');
                return;
            }
            if (selectedPeriods.length === 0) {
                alert('사용할 교시를 선택해주세요 (최소 1개 이상).');
                return;
            }
        }

        let confirmMsg = '';
        if (type === 'full') confirmMsg = `${date}에 월차를 신청하시겠습니까?`;
        else if (type === 'half') confirmMsg = `${date}에 ${selectedPeriods.join(', ')}교시 반차를 신청하시겠습니까?`;
        else confirmMsg = `${date}에 특별휴가(${specialReason}, ${selectedPeriods.length === 7 ? '전체' : selectedPeriods.join(', ') + '교시'})를 신청하시겠습니까?`;

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const payload = {
                user_id: user.id,
                type,
                date,
                periods: (type === 'half' || type === 'special') ? selectedPeriods : null,
                reason: type === 'special' ? specialReason : null
            };

            const { error } = await supabase
                .from('vacation_requests')
                .insert([payload]);

            if (error) throw error;

            alert('휴가 신청이 완료되었습니다.');
            setViewMode('history');
            setDate('');
            setSelectedPeriods([]);
            setSpecialReason('');
            setType('full'); // Reset type to default or keep it? User might want to add another. Resetting is safer.
        } catch (err) {
            console.error('Error submitting vacation request:', err);
            alert('신청에 실패했습니다. (DB 업데이트가 필요할 수 있습니다)');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-content">
            {/* Header */}
            <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)' }}>
                {/* ... existing header code ... */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/memberdashboard')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        <ArrowLeft size={24} color="var(--color-text-main)" />
                    </button>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        휴가 사용
                    </h2>
                </div>
                <button
                    onClick={() => setViewMode(viewMode === 'create' ? 'history' : 'create')}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: 'var(--color-text-secondary)',
                        textDecoration: 'underline',
                        cursor: 'pointer'
                    }}
                >
                    {viewMode === 'create' ? '신청 현황' : '휴가 신청'}
                </button>
            </div>

            {viewMode === 'create' ? (
                <>
                    {/* Type Toggle */}
                    <div style={{
                        display: 'flex',
                        background: '#edf2f7',
                        padding: '5px',
                        borderRadius: '12px',
                        marginBottom: '30px'
                    }}>
                        {['full', 'half', 'special'].map((t) => (
                            <button
                                key={t}
                                onClick={() => { setType(t); setSelectedPeriods([]); setSpecialReason(''); }}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: type === t ? 'white' : 'transparent',
                                    color: type === t ? 'var(--color-primary)' : '#718096',
                                    fontWeight: 'bold',
                                    boxShadow: type === t ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer'
                                }}
                            >
                                {t === 'full' ? '월차' : t === 'half' ? '반차' : '특별휴가'}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-col" style={{ gap: '25px' }}>

                        {/* Date Picker Component */}
                        <CustomDatePicker
                            value={date}
                            onChange={setDate}
                        />

                        {/* Period Selection (For Half AND Special) */}
                        {(type === 'half' || type === 'special') && (
                            <div className="fade-in">
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                                    <Clock size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                    쉬고 싶은 교시 선택
                                    {type === 'half' && <span style={{ fontSize: '0.85rem', color: '#e53e3e', fontWeight: 'normal', marginLeft: '5px' }}>(최대 4개)</span>}
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                    {periodOptions.map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => togglePeriod(p)}
                                            style={{
                                                padding: '15px 0',
                                                borderRadius: '12px',
                                                border: selectedPeriods.includes(p) ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
                                                background: selectedPeriods.includes(p) ? '#ebf8ff' : 'white',
                                                color: selectedPeriods.includes(p) ? 'var(--color-primary)' : '#4a5568',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                transition: 'all 0.1s'
                                            }}
                                        >
                                            {p}교시
                                        </button>
                                    ))}
                                    {/* 'All' Button for Special Leave */}
                                    {type === 'special' && (
                                        <button
                                            onClick={() => togglePeriod('all')}
                                            style={{
                                                padding: '15px 0',
                                                borderRadius: '12px',
                                                border: selectedPeriods.length === 7 ? '2px solid var(--color-primary)' : '1px solid #e2e8f0', // Highlight if all are selected
                                                background: selectedPeriods.length === 7 ? '#ebf8ff' : 'white',
                                                color: selectedPeriods.length === 7 ? 'var(--color-primary)' : '#4a5568',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                transition: 'all 0.1s'
                                            }}
                                        >
                                            전체
                                        </button>
                                    )}
                                </div>
                                {type === 'half' && (
                                    <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#718096' }}>
                                        * 하루 최소 3교시는 근무해야 합니다.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Reason Selection (Only for Special) */}
                        {type === 'special' && (
                            <div className="fade-in">
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                                    <CheckCircle size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                    사유 선택
                                </label>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    {['병가', '기타'].map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => setSpecialReason(r)}
                                            style={{
                                                flex: 1,
                                                padding: '15px 0',
                                                borderRadius: '12px',
                                                border: specialReason === r ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
                                                background: specialReason === r ? '#ebf8ff' : 'white',
                                                color: specialReason === r ? 'var(--color-primary)' : '#4a5568',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                transition: 'all 0.1s'
                                            }}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                                <div style={{
                                    marginTop: '15px',
                                    padding: '12px',
                                    background: '#fff5f5',
                                    borderRadius: '8px',
                                    color: '#c53030',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.5',
                                    fontWeight: 'bold',
                                    textAlign: 'center'
                                }}>
                                    특별휴가는 사장님과 상의 후 사용하여주시기 바랍니다.
                                </div>
                            </div>
                        )}

                        {/* Info Box (Only for Full/Half) */}
                        {type !== 'special' && (
                            <div style={{ background: '#f7fafc', padding: '15px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'start' }}>
                                <AlertCircle size={20} color="#4a5568" style={{ marginTop: '2px', flexShrink: 0 }} />
                                <div style={{ fontSize: '0.9rem', color: '#4a5568', lineHeight: '1.5' }}>
                                    주 1.5일(월차 1회+반차 1회 또는 반차 3회)을 초과하여 사용할 경우,
                                    관리자 확인 후 조정될 수 있습니다.
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="btn-primary" // Assuming global class or reuse style
                            style={{
                                width: '100%',
                                padding: '18px',
                                marginTop: '20px',
                                background: 'var(--color-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                cursor: loading ? 'wait' : 'pointer',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <CheckCircle size={20} />
                            {loading ? '신청 중...' : '신청하기'}
                        </button>
                    </div>
                </>
            ) : (
                /* History Mode */
                <div className="flex-col" style={{ gap: '15px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#999' }}>로딩 중...</div>
                    ) : myRequests.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#999', marginTop: '50px' }}>
                            신청된 휴가가 없습니다.
                        </div>
                    ) : (
                        myRequests.map((req) => (
                            <div
                                key={req.id}
                                style={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    boxShadow: 'var(--shadow-sm)',
                                    borderLeft: `5px solid ${req.type === 'full' ? '#805ad5' : req.type === 'special' ? '#e53e3e' : '#3182ce'}`,
                                    position: 'relative'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                                        {req.date}
                                    </span>
                                    <span style={{
                                        background: req.type === 'full' ? '#e9d8fd' : req.type === 'special' ? '#fed7d7' : '#ebf8ff',
                                        color: req.type === 'full' ? '#553c9a' : req.type === 'special' ? '#c53030' : '#2c5282',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {req.type === 'full' ? '월차' : req.type === 'special' ? '특별휴가' : '반차'}
                                    </span>
                                </div>

                                {(req.type === 'half' || (req.type === 'special' && req.periods)) && (
                                    <div style={{ color: '#4a5568', marginBottom: '15px' }}>
                                        <span style={{ fontWeight: '600' }}>사용 교시:</span> {req.periods ? req.periods.join(', ') : ''}교시
                                    </div>
                                )}
                                {req.type === 'special' && req.reason && (
                                    <div style={{ color: '#c53030', marginBottom: '15px' }}>
                                        <span style={{ fontWeight: '600' }}>사유:</span> {req.reason}
                                    </div>
                                )}
                                {req.type === 'full' && (
                                    <div style={{ color: '#aaa', marginBottom: '15px', fontSize: '0.9rem' }}>
                                        하루 종일 휴무
                                    </div>
                                )}

                                <button
                                    onClick={() => handleCancel(req.id, req.date)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #e53e3e',
                                        background: 'white',
                                        color: '#e53e3e',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = '#e53e3e';
                                        e.currentTarget.style.color = 'white';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'white';
                                        e.currentTarget.style.color = '#e53e3e';
                                    }}
                                >
                                    <Trash2 size={16} />
                                    취소하기
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default VacationRequest;
