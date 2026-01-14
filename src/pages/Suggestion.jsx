import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const Suggestion = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [customInput, setCustomInput] = useState('');
    const [loading, setLoading] = useState(false);

    // View Mode: 'create' | 'history'
    const [viewMode, setViewMode] = useState('create');
    const [mySuggestions, setMySuggestions] = useState([]);

    const presets = [
        "이름 스티커 만들어주세요",
        "남자화장실 휴지 떨어졌어요",
        "여자화장실 휴지 떨어졌어요",
        "A4 용지 채워주세요"
    ];

    // Fetch history when switching to history view
    useEffect(() => {
        if (viewMode === 'history' && user) {
            fetchMySuggestions();
        }
    }, [viewMode, user]);

    const fetchMySuggestions = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('suggestions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMySuggestions(data || []);
        } catch (err) {
            console.error('Error fetching suggestions:', err);
            alert('내 건의 내역을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

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
                        스탭에게 건의하기
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
                    {viewMode === 'create' ? '내 건의 내역' : '건의하기 작성'}
                </button>
            </div>

            {viewMode === 'create' ? (
                <>
                    {/* Preset Buttons - 3x3 Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '10px',
                        marginBottom: '30px'
                    }}>
                        {presets.map((text, index) => (
                            <button
                                key={index}
                                onClick={() => handleSubmit(text)}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    aspectRatio: '1', // Make them square like admin menu
                                    padding: '10px',
                                    borderRadius: '16px',
                                    border: 'none',
                                    background: 'white',
                                    color: 'var(--color-text-main)',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    wordBreak: 'keep-all',
                                    lineHeight: '1.2'
                                }}
                            >
                                {text}
                            </button>
                        ))}
                    </div>

                    {/* Custom Input */}
                    <div style={{ marginTop: 'auto' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>
                            기타 건의사항
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <textarea
                                value={customInput}
                                onChange={(e) => setCustomInput(e.target.value)}
                                placeholder="건의하실 내용을 입력해주세요..."
                                style={{
                                    width: '100%',
                                    height: '120px',
                                    padding: '15px',
                                    borderRadius: '12px',
                                    border: '1px solid #ddd',
                                    fontSize: '1rem',
                                    resize: 'none',
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <button
                                onClick={() => handleSubmit(customInput)}
                                disabled={loading || !customInput.trim()}
                                className="btn-primary" // Use global class if available, or inline styles
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
                                    opacity: (!customInput.trim() || loading) ? 0.7 : 1,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span>전송하기</span>
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                /* History View */
                <div className="flex-col" style={{ gap: '15px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#999' }}>로딩 중...</div>
                    ) : mySuggestions.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#999', marginTop: '50px' }}>
                            아직 건의한 내역이 없습니다.
                        </div>
                    ) : (
                        mySuggestions.map((item) => (
                            <div
                                key={item.id}
                                style={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    boxShadow: 'var(--shadow-sm)',
                                    borderLeft: `5px solid ${item.status === 'resolved' ? 'var(--color-success)' : '#ddd'}`
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#999' }}>
                                        {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 'bold',
                                        color: item.status === 'resolved' ? 'var(--color-success)' : '#999',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        {item.status === 'resolved' ? (
                                            <><CheckCircle size={14} /> 처리완료</>
                                        ) : (
                                            <><Clock size={14} /> 대기중</>
                                        )}
                                    </span>
                                </div>
                                <p style={{ fontSize: '1rem', color: 'var(--color-text-main)' }}>
                                    {item.content}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default Suggestion;
