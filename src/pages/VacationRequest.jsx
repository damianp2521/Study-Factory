import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, CheckCircle, AlertCircle, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { format, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

import EmbeddedCalendar from '../components/EmbeddedCalendar';

const VacationRequest = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // View Mode: 'create' | 'history'
    const [viewMode, setViewMode] = useState('create');
    const [myRequests, setMyRequests] = useState([]);
    const [specialAttendance, setSpecialAttendance] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date()); // 월별 필터링

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
            fetchSpecialAttendance();
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

    // Fetch special attendance statuses for this user
    const fetchSpecialAttendance = async () => {
        try {
            const { data, error } = await supabase
                .from('attendance_logs')
                .select('date, period, status')
                .eq('user_id', user.id)
                .not('status', 'is', null)
                .order('date', { ascending: false })
                .limit(200); // 넉넉하게 200개

            if (error) throw error;
            setSpecialAttendance(data || []);
        } catch (err) {
            console.error('Error fetching special attendance:', err);
        }
    };

    // Merge and Filter List
    const mergedList = useMemo(() => {
        // 1. Tag items
        const requests = myRequests.map(r => ({ ...r, category: 'vacation' }));
        const attendances = specialAttendance.map(a => ({ ...a, category: 'attendance', id: `att_${a.date}_${a.period}` }));

        // 2. Merge
        const all = [...requests, ...attendances];

        // 3. Filter by month (String comparison is safer for YYYY-MM-DD)
        const targetMonth = format(selectedMonth, 'yyyy-MM');
        const filtered = all.filter(item => item.date.startsWith(targetMonth));

        // Debug log
        console.log('Target Month:', targetMonth);
        console.log('All Items:', all.length);
        console.log('Filtered Items:', filtered.length);

        // 4. Sort by date desc, then period asc
        return filtered.sort((a, b) => {
            if (a.date !== b.date) return new Date(b.date) - new Date(a.date);
            // Same date: period logic if available
            if (a.periods && b.period) return a.periods[0] - b.period;
            return 0;
        });
    }, [myRequests, specialAttendance, selectedMonth]);

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
        if ((type === 'half' || type === 'half_am' || type === 'half_pm') && selectedPeriods.length === 0) {
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
        else if (type === 'half_am') confirmMsg = `${date}에 오전반차를 신청하시겠습니까?`;
        else if (type === 'half_pm') confirmMsg = `${date}에 오후반차를 신청하시겠습니까?`;
        else if (type === 'half') confirmMsg = `${date}에 ${selectedPeriods.join(', ')}교시 반차를 신청하시겠습니까?`;
        else confirmMsg = `${date}에 특별휴가(${specialReason}, ${selectedPeriods.length === 7 ? '전체' : selectedPeriods.join(', ') + '교시'})를 신청하시겠습니까?`;

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            // Transform UI types to DB types
            let dbType = type;
            if (type === 'half_am' || type === 'half_pm') {
                dbType = 'half';
            }

            const payload = {
                user_id: user.id,
                type: dbType,
                date,
                periods: (dbType === 'half' || dbType === 'special') ? selectedPeriods : null,
                reason: dbType === 'special' ? specialReason : null
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
            setType('full');
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
                    {/* Content */}
                    <div className="flex-col" style={{ gap: '25px' }}>

                        {/* 1. Date Selection with Embedded Calendar */}
                        <div style={{ marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#718096', display: 'block', marginBottom: '8px' }}>
                                {date ? (() => {
                                    const [y, m, d] = date.split('-');
                                    const dateObj = new Date(date);
                                    const days = ['일', '월', '화', '수', '목', '금', '토'];
                                    return `날짜선택: ${y}. ${m}. ${d}. (${days[dateObj.getDay()]})`;
                                })() : '날짜선택'}
                            </span>
                            <EmbeddedCalendar
                                selectedDate={date}
                                onSelectDate={(val) => {
                                    // Basic validation
                                    const todayStr = new Date().toISOString().split('T')[0];
                                    const maxDate = new Date();
                                    maxDate.setDate(maxDate.getDate() + 14);
                                    const maxDateStr = maxDate.toISOString().split('T')[0];

                                    if (val < todayStr) {
                                        alert('지난 날짜는 신청할 수 없습니다.');
                                        return;
                                    }
                                    if (val > maxDateStr) {
                                        alert('최대 2주 뒤까지만 신청 가능합니다.');
                                        return;
                                    }
                                    setDate(val);
                                }}
                                events={myRequests}
                                minDate={new Date().toISOString().split('T')[0]}
                                maxDate={(() => {
                                    const d = new Date();
                                    d.setDate(d.getDate() + 14);
                                    return d.toISOString().split('T')[0];
                                })()}
                            />
                        </div>

                        {/* 2. Type Buttons (Style Update) */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {/* Full (Month) */}
                            <button
                                onClick={() => { setType('full'); setSelectedPeriods([]); setSpecialReason(''); }}
                                style={{
                                    flex: 1,
                                    padding: '12px 10px',
                                    borderRadius: '12px',
                                    border: type === 'full' ? '2px solid #e53e3e' : '1px solid #e2e8f0',
                                    background: type === 'full' ? '#fff5f5' : 'white',
                                    color: type === 'full' ? '#c53030' : '#a0aec0',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontSize: '0.9rem'
                                }}
                            >
                                월차
                            </button>

                            {/* Half AM */}
                            <button
                                onClick={() => {
                                    setType('half_am');
                                    setSelectedPeriods([1, 2, 3, 4]);
                                    setSpecialReason('');
                                }}
                                style={{
                                    flex: 1,
                                    padding: '12px 10px',
                                    borderRadius: '12px',
                                    border: type === 'half_am' ? '2px solid #e53e3e' : '1px solid #e2e8f0',
                                    background: type === 'half_am' ? '#fff5f5' : 'white',
                                    color: type === 'half_am' ? '#c53030' : '#a0aec0',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontSize: '0.9rem'
                                }}
                            >
                                오전반차
                            </button>

                            {/* Half PM */}
                            <button
                                onClick={() => {
                                    setType('half_pm');
                                    setSelectedPeriods([5, 6, 7]);
                                    setSpecialReason('');
                                }}
                                style={{
                                    flex: 1,
                                    padding: '12px 10px',
                                    borderRadius: '12px',
                                    border: type === 'half_pm' ? '2px solid #3182ce' : '1px solid #e2e8f0',
                                    background: type === 'half_pm' ? '#ebf8ff' : 'white',
                                    color: type === 'half_pm' ? '#2c5282' : '#a0aec0',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontSize: '0.9rem'
                                }}
                            >
                                오후반차
                            </button>
                        </div>

                        {/* Special Leave (Style Match) */}
                        <button
                            onClick={() => { setType('special'); setSelectedPeriods([]); setSpecialReason(''); }}
                            style={{
                                width: '100%',
                                padding: '12px 10px',
                                borderRadius: '12px',
                                border: type === 'special' ? '2px solid #805ad5' : '1px solid #e2e8f0',
                                background: type === 'special' ? '#faf5ff' : 'white',
                                color: type === 'special' ? '#553c9a' : '#a0aec0',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontSize: '0.9rem'
                            }}
                        >
                            특별휴가 / 기타
                        </button>

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
                    {/* Month Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '10px' }}>
                        <button
                            onClick={() => setSelectedMonth(prev => subMonths(prev, 1))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}
                        >
                            <ChevronLeft size={24} color="#4a5568" />
                        </button>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2d3748' }}>
                            {format(selectedMonth, 'yyyy년 M월')}
                        </span>
                        <button
                            onClick={() => setSelectedMonth(prev => addMonths(prev, 1))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}
                        >
                            <ChevronRight size={24} color="#4a5568" />
                        </button>
                    </div>

                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4a5568', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={18} />
                        출석 및 휴무 내역 ({mergedList.length}건)
                    </h3>

                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>로딩 중...</div>
                    ) : mergedList.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#999', marginTop: '30px', padding: '20px', background: '#f7fafc', borderRadius: '12px' }}>
                            해당 월의 내역이 없습니다.
                        </div>
                    ) : (
                        mergedList.map((item) => {
                            // Attendance Item
                            if (item.category === 'attendance') {
                                return (
                                    <div
                                        key={item.id}
                                        style={{
                                            background: 'white',
                                            borderRadius: '12px',
                                            padding: '16px 20px',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            borderLeft: '5px solid #38a169',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2d3748' }}>
                                                {format(parseISO(item.date), 'MM.dd(EEE)', { locale: ko })}
                                            </span>
                                            <span style={{
                                                fontSize: '0.95rem', fontWeight: 'bold',
                                                color: '#c53030',
                                                background: '#c6f6d5',
                                                padding: '2px 8px',
                                                borderRadius: '4px'
                                            }}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <div style={{ color: '#718096', fontSize: '0.9rem', fontWeight: '600' }}>
                                            {item.period}교시
                                        </div>
                                    </div>
                                );
                            }

                            // Vacation Request Item
                            const req = item;
                            return (
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
                                            {req.date} ({['일', '월', '화', '수', '목', '금', '토'][new Date(req.date).getDay()]})
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
                            );
                        })
                    )}
                </div>
            )
            }
        </div >
    );
};

export default VacationRequest;

