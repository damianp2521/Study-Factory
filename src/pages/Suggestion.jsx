import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const Suggestion = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [customInput, setCustomInput] = useState('');
    const [loading, setLoading] = useState(false);

    // View Mode: 'create' | 'history'
    const [viewMode, setViewMode] = useState('create');
    const [selectedCategory, setSelectedCategory] = useState(null); // 'equipment', 'study', 'other', 'counseling'
    const [mySuggestions, setMySuggestions] = useState([]);

    const categories = [
        { id: 'equipment', label: '비품관련' },
        { id: 'study', label: '학습관련' },
        { id: 'other', label: '기타건의' },
        { id: 'counseling', label: '상담요청' }
    ];

    const equipmentPresets = [
        "A4 용지가 떨어졌어요",
        "남자화장실 휴지가 떨어졌어요",
        "여자화장실 휴지가 떨어졌어요",
        "이름스티커 더 필요해요"
    ];

    // Handle deep link state from dashboard
    useEffect(() => {
        if (location.state?.category) {
            setSelectedCategory(location.state.category);
            // Clear state so back button behaves normally? Or keep it?
            // Keeping it is fine, but navigation back might re-trigger if not careful.
            // For now, React Router state persists on refresh, which is good.
        }
    }, [location.state]);

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

    const handleSubmit = async (content, category = '기타') => {
        if (!content.trim()) return;
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        const fullContent = category !== '기타' ? `[${category}] ${content}` : content;

        if (!confirm(`"${fullContent}"\n건의사항을 보내시겠습니까?`)) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('suggestions')
                .insert([
                    { user_id: user.id, content: fullContent, status: 'pending' }
                ]);

            if (error) throw error;

            alert('건의사항이 스탭에게 전달되었습니다!');
            setCustomInput('');
            setSelectedCategory(null); // Go back to main menu
        } catch (err) {
            console.error('Error sending suggestion:', err);
            alert('전송에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (selectedCategory) {
            setSelectedCategory(null);
        } else {
            navigate('/dashboard');
        }
    };

    return (
        <div style={{ padding: 'var(--spacing-lg) var(--spacing-md)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={handleBack}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        <ArrowLeft size={24} color="var(--color-text-main)" />
                    </button>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        {selectedCategory ? categories.find(c => c.id === selectedCategory)?.label : '건의사항'}
                    </h2>
                </div>
                {!selectedCategory && (
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
                        {viewMode === 'create' ? '내 건의 내역' : '건의하기 홈'}
                    </button>
                )}
            </div>

            {viewMode === 'history' ? (
                /* History View */
                <div className="flex-col" style={{ gap: '15px', overflowY: 'auto' }}>
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
            ) : !selectedCategory ? (
                /* Main Category Selection (3x3 Grid like Admin Page) */
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)', // 2x2 grid looks better for 4 items, but user asked for 3x3 style. Let's stick to 2x2 for these 4 big buttons as per screenshot
                    gap: '15px'
                }}>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => {
                                if (cat.id === 'equipment') {
                                    setSelectedCategory('equipment');
                                } else {
                                    alert('준비 중인 기능입니다.');
                                }
                            }}
                            style={{
                                aspectRatio: '2/1', // Wider buttons for categories
                                padding: '20px',
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                background: 'white',
                                color: 'var(--color-text-main)',
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            ) : (
                /* Equipment Detail View */
                <>
                    {/* Preset Buttons - 2x2 Grid for Presets */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '15px',
                        marginBottom: '30px'
                    }}>
                        {equipmentPresets.map((text, index) => (
                            <button
                                key={index}
                                onClick={() => handleSubmit(text, '비품')}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    aspectRatio: '1',
                                    padding: '10px',
                                    borderRadius: '16px',
                                    border: 'none',
                                    background: 'white',
                                    color: 'var(--color-text-main)',
                                    fontSize: '0.95rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    wordBreak: 'keep-all',
                                    lineHeight: '1.3'
                                }}
                            >
                                {text}
                            </button>
                        ))}
                    </div>

                    {/* Custom Input */}
                    <div style={{ marginTop: 'auto' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>
                            기타 비품관련 건의
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <textarea
                                value={customInput}
                                onChange={(e) => setCustomInput(e.target.value)}
                                placeholder="필요한 비품이나 건의사항을 적어주세요..."
                                style={{
                                    width: '100%',
                                    height: '100px',
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
                                onClick={() => handleSubmit(customInput, '비품')}
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
            )}
        </div>
    );
};

export default Suggestion;
