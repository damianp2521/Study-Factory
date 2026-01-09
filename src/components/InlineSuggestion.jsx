import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const InlineSuggestion = () => {
    const { user } = useAuth();
    const [customInput, setCustomInput] = useState('');
    const [loading, setLoading] = useState(false);

    const presets = [
        "이름 스티커 만들어주세요",
        "남자화장실 휴지 떨어졌어요",
        "여자화장실 휴지 떨어졌어요",
        "A4 용지 채워주세요"
    ];

    const handleSubmit = async (content) => {
        if (!content.trim()) return;
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        if (!confirm(`"${content}"\n건의사항을 보내시겠습니까?`)) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('suggestions')
                .insert([
                    { user_id: user.id, content: content, status: 'pending' }
                ]);

            if (error) throw error;

            alert('건의사항이 스탭에게 전달되었습니다!');
            setCustomInput('');
        } catch (err) {
            console.error('Error sending suggestion:', err);
            alert('전송에 실패했습니다. 다시 시도해주세요.');
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
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-text-main)', margin: '0 0 20px 0' }}>
                🗳️ 건의함
            </h3>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Presets */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {presets.map((text, index) => (
                        <button
                            key={index}
                            onClick={() => handleSubmit(text)}
                            disabled={loading}
                            style={{
                                padding: '15px 10px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                background: '#f7fafc',
                                color: 'var(--color-text-main)',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textAlign: 'center',
                                wordBreak: 'keep-all'
                            }}
                        >
                            {text}
                        </button>
                    ))}
                </div>

                {/* Custom Input */}
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <textarea
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="기타 건의사항을 입력하세요..."
                        style={{
                            width: '100%',
                            flex: 1,
                            minHeight: '100px',
                            padding: '15px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            fontSize: '1rem',
                            resize: 'none',
                            outline: 'none',
                            fontFamily: 'inherit'
                        }}
                    />
                    <button
                        onClick={() => handleSubmit(customInput)}
                        disabled={loading || !customInput.trim()}
                        style={{
                            width: '100%',
                            padding: '15px',
                            background: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: (!customInput.trim() || loading) ? 0.7 : 1
                        }}
                    >
                        <span>전송하기</span>
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InlineSuggestion;
