import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const VacationRequest = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Type: 'full' | 'half'
    const [type, setType] = useState('full');
    const [date, setDate] = useState('');
    const [selectedPeriods, setSelectedPeriods] = useState([]);
    const [loading, setLoading] = useState(false);

    // Periods 1 to 7
    const periodOptions = [1, 2, 3, 4, 5, 6, 7];

    const togglePeriod = (p) => {
        if (selectedPeriods.includes(p)) {
            setSelectedPeriods(prev => prev.filter(item => item !== p));
        } else {
            // Max 4 periods allowed for Half Day (Must work at least 3 periods)
            if (selectedPeriods.length >= 4) {
                alert('반차는 최대 4개 교시까지만 쉴 수 있습니다.\n(하루 최소 3교시 근무 필수)');
                return;
            }
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

        const confirmMsg = type === 'full'
            ? `${date}에 월차(하루 휴무)를 신청하시겠습니까?`
            : `${date}에 ${selectedPeriods.join(', ')}교시 반차를 신청하시겠습니까?`;

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('vacation_requests')
                .insert([
                    {
                        user_id: user.id,
                        type,
                        date,
                        periods: type === 'half' ? selectedPeriods : null
                    }
                ]);

            if (error) throw error;

            alert('휴가 신청이 완료되었습니다.');
            navigate('/dashboard');
        } catch (err) {
            console.error('Error submitting vacation request:', err);
            alert('신청에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            {/* Header */}
            <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        <ArrowLeft size={24} color="var(--color-text-main)" />
                    </button>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        휴가 사용
                    </h2>
                </div>
            </div>

            {/* Type Toggle */}
            <div style={{
                display: 'flex',
                background: '#edf2f7',
                padding: '5px',
                borderRadius: '12px',
                marginBottom: '30px'
            }}>
                <button
                    onClick={() => { setType('full'); setSelectedPeriods([]); }}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        background: type === 'full' ? 'white' : 'transparent',
                        color: type === 'full' ? 'var(--color-primary)' : '#718096',
                        fontWeight: 'bold',
                        boxShadow: type === 'full' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                    }}
                >
                    월차 (하루)
                </button>
                <button
                    onClick={() => setType('half')}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        background: type === 'half' ? 'white' : 'transparent',
                        color: type === 'half' ? 'var(--color-primary)' : '#718096',
                        fontWeight: 'bold',
                        boxShadow: type === 'half' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                    }}
                >
                    반차 (시간제)
                </button>
            </div>

            {/* Content */}
            <div className="flex-col" style={{ gap: '25px' }}>

                {/* Date Picker */}
                <div>
                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                        <Calendar size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                        날짜 선택
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '15px',
                            borderRadius: '12px',
                            border: '1px solid #ddd',
                            fontSize: '1.1rem',
                            fontFamily: 'inherit',
                            outline: 'none'
                        }}
                    />
                </div>

                {/* Period Selection (Only for Half) */}
                {type === 'half' && (
                    <div className="fade-in">
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                            <Clock size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                            쉬고 싶은 교시 선택 <span style={{ fontSize: '0.85rem', color: '#e53e3e', fontWeight: 'normal' }}>(최대 4개)</span>
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
                        </div>
                        <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#718096' }}>
                            * 하루 최소 3교시는 근무해야 합니다.
                        </p>
                    </div>
                )}

                {/* Info Box */}
                <div style={{ background: '#f7fafc', padding: '15px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'start' }}>
                    <AlertCircle size={20} color="#4a5568" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ fontSize: '0.9rem', color: '#4a5568', lineHeight: '1.5' }}>
                        주 1.5일(월차 1회+반차 1회 또는 반차 3회)을 초과하여 사용할 경우,
                        관리자 확인 후 조정될 수 있습니다.
                    </div>
                </div>

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
        </div>
    );
};

export default VacationRequest;
