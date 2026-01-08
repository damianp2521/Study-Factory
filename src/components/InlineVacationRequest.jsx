import React, { useState } from 'react';
import { Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import CustomDatePicker from './CustomDatePicker';

const InlineVacationRequest = () => {
    const { user } = useAuth();
    const [date, setDate] = useState('');
    const [type, setType] = useState('full'); // 'full' | 'half_am' | 'half_pm'
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!date) {
            alert('날짜를 선택해주세요.');
            return;
        }

        let dbType = 'full';
        let periods = null;

        if (type === 'half_am') {
            dbType = 'half';
            periods = [1, 2, 3, 4];
        } else if (type === 'half_pm') {
            dbType = 'half';
            periods = [5, 6, 7]; // Assuming PM starts from 5th period
        }

        let typeName = type === 'full' ? '월차' : type === 'half_am' ? '오전반차' : '오후반차';

        if (!confirm(`${date}에 ${typeName}를 신청하시겠습니까?`)) return;

        setLoading(true);
        try {
            const payload = {
                user_id: user.id,
                type: dbType,
                date,
                periods,
                reason: null
            };

            const { error } = await supabase
                .from('vacation_requests')
                .insert([payload]);

            if (error) throw error;

            alert('휴가 신청이 완료되었습니다.');
            setDate(''); // Reset
        } catch (err) {
            console.error('Error submitting vacation request:', err);
            alert('신청에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            marginBottom: '20px'
        }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-text-main)', margin: '0 0 15px 0' }}>
                🏖️ 간편 휴가 신청
            </h3>

            {/* Button Group */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                <button
                    onClick={() => setType('full')}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: type === 'full' ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
                        background: type === 'full' ? '#ebf8ff' : 'white',
                        color: type === 'full' ? 'var(--color-primary)' : '#4a5568',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    월차
                </button>
                <button
                    onClick={() => setType('half_am')}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: type === 'half_am' ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
                        background: type === 'half_am' ? '#ebf8ff' : 'white',
                        color: type === 'half_am' ? 'var(--color-primary)' : '#4a5568',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    오전반차
                </button>
                <button
                    onClick={() => setType('half_pm')}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: type === 'half_pm' ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
                        background: type === 'half_pm' ? '#ebf8ff' : 'white',
                        color: type === 'half_pm' ? 'var(--color-primary)' : '#4a5568',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    오후반차
                </button>
            </div>

            {/* Date Picker */}
            <div style={{ marginBottom: '15px' }}>
                <CustomDatePicker
                    value={date}
                    onChange={setDate}
                    label="날짜 선택"
                />
            </div>

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                    width: '100%',
                    padding: '15px',
                    borderRadius: '12px',
                    background: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: loading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                }}
            >
                <CheckCircle size={18} />
                {loading ? '신청 중...' : '신청하기'}
            </button>
        </div>
    );
};

export default InlineVacationRequest;
