import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const BEVERAGE_1_OPTIONS = ['선식', '해독주스', '안먹음'];
const BEVERAGE_2_OPTIONS = ['아아', '기타', '안먹음'];

const cardStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    height: '100%',
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none'
};

const panelStyle = {
    border: '1px solid #d9e2ec',
    borderRadius: '14px',
    padding: '16px',
    background: '#f8fafc'
};

const optionButtonStyle = (isSelected) => ({
    width: '100%',
    textAlign: 'left',
    border: isSelected ? '2px solid #267E82' : '1px solid #d9e2ec',
    background: isSelected ? '#e6fffa' : 'white',
    color: '#2d3748',
    borderRadius: '10px',
    padding: '11px 12px',
    fontSize: '0.95rem',
    fontWeight: isSelected ? '700' : '500',
    cursor: 'pointer'
});

const InlineNewBeverageRequest = () => {
    const { user } = useAuth();
    const [beverage1, setBeverage1] = useState('');
    const [beverage2, setBeverage2] = useState('');
    const [beverage2Etc, setBeverage2Etc] = useState('');
    const [usePersonalTumbler, setUsePersonalTumbler] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchMyRequest = async () => {
            if (!user?.id) return;

            try {
                const { data, error } = await supabase
                    .from('new_beverage_requests')
                    .select('beverage_1_choice, beverage_2_choice, beverage_2_custom, use_personal_tumbler')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) throw error;
                if (!data) return;

                setBeverage1(data.beverage_1_choice || '');
                setBeverage2(data.beverage_2_choice || '');
                setBeverage2Etc(data.beverage_2_custom || '');
                setUsePersonalTumbler(Boolean(data.use_personal_tumbler));
            } catch (error) {
                console.error('Error fetching new beverage request:', error);
            }
        };

        fetchMyRequest();
    }, [user?.id]);

    const handleSelectBeverage2 = (value) => {
        setBeverage2(value);
        if (value !== '기타') {
            setBeverage2Etc('');
        }
        if (value === '안먹음') {
            setUsePersonalTumbler(false);
        }
    };

    const handleSubmit = async () => {
        if (!beverage1 || !beverage2) {
            alert('음료1, 음료2를 모두 선택해주세요');
            return;
        }

        if (beverage2 === '기타' && !beverage2Etc.trim()) {
            alert('음료2 기타 내용을 입력해주세요.');
            return;
        }

        if (!user?.id) {
            alert('사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase
                .from('new_beverage_requests')
                .upsert({
                    user_id: user.id,
                    beverage_1_choice: beverage1,
                    beverage_2_choice: beverage2,
                    beverage_2_custom: beverage2 === '기타' ? beverage2Etc.trim() : null,
                    use_personal_tumbler: beverage2 === '안먹음' ? false : usePersonalTumbler
                }, { onConflict: 'user_id' });

            if (error) throw error;

            alert('음료 신청이 저장되었습니다.');
        } catch (error) {
            console.error('Error saving new beverage request:', error);
            alert('음료 신청 저장에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={cardStyle}>
            <style>{'div::-webkit-scrollbar { display: none; }'}</style>

            <p style={{ margin: '0 0 14px 0', fontSize: '1rem', fontWeight: '700', color: '#2d3748' }}>
                드실 음료를 선택해주세요
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={panelStyle}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: '800', color: '#1f2937' }}>음료1</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {BEVERAGE_1_OPTIONS.map((option, index) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setBeverage1(option)}
                                style={optionButtonStyle(beverage1 === option)}
                            >
                                {index + 1}. {option}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={panelStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#1f2937' }}>음료2</h4>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', color: '#4a5568', fontWeight: '600' }}>
                            <input
                                type="checkbox"
                                checked={usePersonalTumbler}
                                onChange={(e) => setUsePersonalTumbler(e.target.checked)}
                                disabled={beverage2 === '안먹음'}
                                style={{ width: '16px', height: '16px', cursor: beverage2 === '안먹음' ? 'not-allowed' : 'pointer' }}
                            />
                            개인 텀블러
                        </label>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {BEVERAGE_2_OPTIONS.map((option, index) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => handleSelectBeverage2(option)}
                                style={optionButtonStyle(beverage2 === option)}
                            >
                                {index + 1}. {option}
                            </button>
                        ))}
                    </div>

                    {beverage2 === '기타' && (
                        <input
                            type="text"
                            value={beverage2Etc}
                            onChange={(e) => setBeverage2Etc(e.target.value)}
                            placeholder="원하는 음료를 입력해주세요"
                            style={{
                                width: '100%',
                                marginTop: '10px',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: '1px solid #cbd5e0',
                                fontSize: '0.92rem',
                                outline: 'none'
                            }}
                        />
                    )}
                </div>
            </div>

            <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                    marginTop: '18px',
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#267E82',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: '800',
                    cursor: loading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                }}
            >
                <CheckCircle size={18} />
                {loading ? '저장 중...' : '제출'}
            </button>
        </div>
    );
};

export default InlineNewBeverageRequest;
