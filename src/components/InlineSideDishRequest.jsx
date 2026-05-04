import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const createEmptyRequestState = () => ({
    items: [],
    paymentCompleted: false,
    submittedAt: null
});

const DEADLINE_LIMIT_DISABLED = false;

const getKstNowParts = (timestamp = Date.now()) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(new Date(timestamp));

    const map = {};
    parts.forEach((part) => {
        if (part.type !== 'literal') {
            map[part.type] = part.value;
        }
    });

    return {
        dateStr: `${map.year}-${map.month}-${map.day}`,
        hour: Number(map.hour || 0),
        minute: Number(map.minute || 0)
    };
};

const getDeadlineInfo = (period, nowParts) => {
    if (period === 'am') {
        const closed = DEADLINE_LIMIT_DISABLED
            ? false
            : nowParts.hour > 10 || (nowParts.hour === 10 && nowParts.minute >= 45);
        return { closed, text: '오전 10:45 마감', closedMessage: '오전 반찬 신청 마감' };
    }

    const closed = DEADLINE_LIMIT_DISABLED
        ? false
        : nowParts.hour > 16 || (nowParts.hour === 16 && nowParts.minute >= 30);
    return { closed, text: '오후 16:30 마감', closedMessage: '오후 반찬 신청 마감' };
};

const parseAmount = (value) => {
    const numeric = String(value ?? '').replace(/[^0-9]/g, '');
    const amount = parseInt(numeric, 10);
    return Number.isFinite(amount) ? amount : 0;
};

const formatAmount = (value) => `${Number(value || 0).toLocaleString('ko-KR')}원`;

const cardStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '18px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    height: '100%',
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none'
};

const panelStyle = (isClosed) => ({
    border: `1px solid ${isClosed ? '#d1d5db' : '#d9e2ec'}`,
    borderRadius: '14px',
    padding: '12px',
    background: isClosed ? '#f3f4f6' : '#f8fafc',
    opacity: isClosed ? 0.9 : 1
});

const InlineSideDishRequest = () => {
    const { user } = useAuth();
    const [nowTick, setNowTick] = useState(Date.now());
    const [loading, setLoading] = useState(true);
    const [savingPeriod, setSavingPeriod] = useState('');

    const [amRequest, setAmRequest] = useState(createEmptyRequestState());
    const [pmRequest, setPmRequest] = useState(createEmptyRequestState());

    const nowParts = useMemo(() => getKstNowParts(nowTick), [nowTick]);
    const todayKst = nowParts.dateStr;

    const amDeadline = useMemo(() => getDeadlineInfo('am', nowParts), [nowParts]);
    const pmDeadline = useMemo(() => getDeadlineInfo('pm', nowParts), [nowParts]);

    useEffect(() => {
        const timer = setInterval(() => setNowTick(Date.now()), 30000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const loadTodayRequests = async () => {
            if (!user?.id) return;

            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('side_dish_requests')
                    .select('period, items, payment_completed, submitted_at')
                    .eq('user_id', user.id)
                    .eq('request_date', todayKst);

                if (error) throw error;

                const nextAm = createEmptyRequestState();
                const nextPm = createEmptyRequestState();

                (data || []).forEach((row) => {
                    const normalizedItems = Array.isArray(row.items)
                        ? row.items.map((item, idx) => ({
                            id: `${row.period}-${idx}-${Date.now()}`,
                            name: item?.name || '',
                            amount: String(item?.amount ?? ''),
                            isEditing: false
                        }))
                        : [];

                    const target = row.period === 'am' ? nextAm : nextPm;
                    target.items = normalizedItems;
                    target.paymentCompleted = Boolean(row.payment_completed);
                    target.submittedAt = row.submitted_at || null;
                });

                setAmRequest(nextAm);
                setPmRequest(nextPm);
            } catch (error) {
                console.error('Error loading side dish requests:', error);
            } finally {
                setLoading(false);
            }
        };

        loadTodayRequests();
    }, [todayKst, user?.id]);

    const setPeriodState = (period, updater) => {
        if (period === 'am') {
            setAmRequest((prev) => updater(prev));
        } else {
            setPmRequest((prev) => updater(prev));
        }
    };

    const addItem = (period, isClosed) => {
        if (isClosed) return;

        setPeriodState(period, (prev) => ({
            ...prev,
            items: [
                ...prev.items,
                { id: `${period}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: '', amount: '', isEditing: true }
            ]
        }));
    };

    const updateItemField = (period, id, field, value) => {
        setPeriodState(period, (prev) => ({
            ...prev,
            items: prev.items.map((item) => item.id === id ? { ...item, [field]: value } : item)
        }));
    };

    const completeItem = (period, id) => {
        const target = period === 'am' ? amRequest : pmRequest;
        const item = target.items.find((x) => x.id === id);
        if (!item) return;

        const name = String(item.name || '').trim();
        const amount = parseAmount(item.amount);

        if (!name) {
            alert('반찬명을 입력해주세요.');
            return;
        }
        if (amount <= 0) {
            alert('금액을 입력해주세요.');
            return;
        }

        setPeriodState(period, (prev) => ({
            ...prev,
            items: prev.items.map((x) => x.id === id ? { ...x, name, amount: String(amount), isEditing: false } : x)
        }));
    };

    const removeItem = (period, id) => {
        setPeriodState(period, (prev) => ({
            ...prev,
            items: prev.items.filter((item) => item.id !== id)
        }));
    };

    const getTotalAmount = (requestState) => {
        return requestState.items.reduce((sum, item) => sum + parseAmount(item.amount), 0);
    };

    const getCleanItems = (requestState) => {
        return requestState.items
            .filter((item) => String(item.name || '').trim())
            .map((item) => ({
                name: String(item.name || '').trim(),
                amount: parseAmount(item.amount)
            }))
            .filter((item) => item.amount > 0);
    };

    const submitRequest = async (period) => {
        const isMorning = period === 'am';
        const deadline = isMorning ? amDeadline : pmDeadline;
        const requestState = isMorning ? amRequest : pmRequest;

        if (deadline.closed) {
            alert(deadline.closedMessage);
            return;
        }

        if (!requestState.paymentCompleted) {
            alert('송금을 완료 후 신청해주세요');
            return;
        }

        if (requestState.items.some((item) => item.isEditing)) {
            alert('추가한 반찬을 완료해주세요.');
            return;
        }

        const cleanItems = getCleanItems(requestState);
        if (cleanItems.length === 0) {
            alert('반찬을 한 개 이상 추가해주세요.');
            return;
        }

        if (!user?.id) {
            alert('사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
            return;
        }

        setSavingPeriod(period);
        try {
            const { data, error } = await supabase
                .from('side_dish_requests')
                .upsert({
                    user_id: user.id,
                    request_date: todayKst,
                    period,
                    items: cleanItems,
                    total_amount: cleanItems.reduce((sum, item) => sum + item.amount, 0),
                    payment_completed: true,
                    submitted_at: new Date().toISOString()
                }, { onConflict: 'user_id,request_date,period' })
                .select('submitted_at')
                .single();

            if (error) throw error;

            setPeriodState(period, (prev) => ({
                ...prev,
                submittedAt: data?.submitted_at || new Date().toISOString()
            }));

            alert(`${isMorning ? '오전' : '오후'} 반찬 신청이 완료되었습니다.`);
        } catch (error) {
            console.error('Error submitting side dish request:', error);
            alert('반찬 신청 저장에 실패했습니다.');
        } finally {
            setSavingPeriod('');
        }
    };

    const renderPeriodPanel = (period, title, deadline, requestState) => {
        const totalAmount = getTotalAmount(requestState);

        return (
            <div style={panelStyle(deadline.closed)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#1f2937' }}>{title}</h4>
                    <span style={{ fontSize: '0.76rem', color: '#6b7280', fontWeight: '700' }}>{deadline.text}</span>
                </div>

                {deadline.closed && (
                    <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: '700', marginBottom: '8px' }}>
                        {deadline.closedMessage}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {requestState.items.length === 0 && (
                        <div style={{ fontSize: '0.82rem', color: '#9ca3af' }}>추가 버튼으로 반찬을 입력해주세요.</div>
                    )}

                    {requestState.items.map((item, index) => (
                        <div key={item.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '7px 8px' }}>
                            {item.isEditing ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 52px', gap: '6px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => updateItemField(period, item.id, 'name', e.target.value)}
                                        placeholder="반찬명"
                                        disabled={deadline.closed}
                                        style={{ padding: '7px 8px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '0.82rem', outline: 'none' }}
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        value={item.amount}
                                        onChange={(e) => updateItemField(period, item.id, 'amount', e.target.value)}
                                        placeholder="금액"
                                        disabled={deadline.closed}
                                        style={{ padding: '7px 8px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '0.82rem', outline: 'none' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => completeItem(period, item.id)}
                                        disabled={deadline.closed}
                                        style={{
                                            padding: '7px 0',
                                            border: 'none',
                                            borderRadius: '7px',
                                            background: deadline.closed ? '#d1d5db' : '#267E82',
                                            color: 'white',
                                            fontSize: '0.78rem',
                                            fontWeight: '700',
                                            cursor: deadline.closed ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        완료
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <div style={{ fontSize: '0.82rem', color: '#374151' }}>
                                        {index + 1}. {item.name} · {formatAmount(parseAmount(item.amount))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(period, item.id)}
                                        disabled={deadline.closed}
                                        style={{
                                            border: 'none',
                                            background: 'none',
                                            color: deadline.closed ? '#d1d5db' : '#ef4444',
                                            fontSize: '0.74rem',
                                            fontWeight: '700',
                                            cursor: deadline.closed ? 'not-allowed' : 'pointer',
                                            padding: 0
                                        }}
                                    >
                                        삭제
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => addItem(period, deadline.closed)}
                    disabled={deadline.closed}
                    style={{
                        marginTop: '8px',
                        width: '100%',
                        padding: '8px 0',
                        borderRadius: '8px',
                        border: `1px dashed ${deadline.closed ? '#d1d5db' : '#94a3b8'}`,
                        background: 'white',
                        color: deadline.closed ? '#9ca3af' : '#475569',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        cursor: deadline.closed ? 'not-allowed' : 'pointer'
                    }}
                >
                    + 추가
                </button>

                <div style={{ marginTop: '8px', fontSize: '0.86rem', fontWeight: '800', color: '#334155' }}>
                    합계: {formatAmount(totalAmount)}
                </div>

                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#4b5563', fontWeight: '700' }}>
                        <input
                            type="checkbox"
                            checked={requestState.paymentCompleted}
                            onChange={(e) => setPeriodState(period, (prev) => ({ ...prev, paymentCompleted: e.target.checked }))}
                            disabled={deadline.closed}
                            style={{ width: '15px', height: '15px', cursor: deadline.closed ? 'not-allowed' : 'pointer' }}
                        />
                        송금완료
                    </label>
                    <button
                        type="button"
                        onClick={() => submitRequest(period)}
                        disabled={deadline.closed || savingPeriod === period}
                        style={{
                            flex: 1,
                            padding: '9px 0',
                            borderRadius: '9px',
                            border: 'none',
                            background: deadline.closed ? '#d1d5db' : '#267E82',
                            color: 'white',
                            fontSize: '0.84rem',
                            fontWeight: '800',
                            cursor: deadline.closed ? 'not-allowed' : (savingPeriod === period ? 'wait' : 'pointer')
                        }}
                    >
                        {savingPeriod === period ? '신청 중...' : '신청버튼'}
                    </button>
                </div>

                {requestState.submittedAt && (
                    <div style={{ marginTop: '6px', fontSize: '0.72rem', color: '#94a3b8' }}>
                        신청 완료
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={cardStyle}>
            <style>{'div::-webkit-scrollbar { display: none; }'}</style>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#4b5563', lineHeight: 1.35 }}>- 단톡방 반찬집 링크로 들어가서 원하는 반찬을 신청해주세요</p>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#4b5563', lineHeight: 1.35 }}>- 2천원짜리 하나도 괜찮아요</p>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#4b5563', lineHeight: 1.35 }}>- 사장 카카오페이로 송금 후 신청 버튼을 눌러주세요</p>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#4b5563', lineHeight: 1.35 }}>- 반찬집 공장과 아무 연고 없음</p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '16px' }}>불러오는 중...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {renderPeriodPanel('am', '오전 반찬 신청', amDeadline, amRequest)}
                    {renderPeriodPanel('pm', '오후 반찬 신청', pmDeadline, pmRequest)}
                </div>
            )}
        </div>
    );
};

export default InlineSideDishRequest;
