import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Inbox, User } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const SuggestionBox = () => {
    const navigate = useNavigate();
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Run cleanup (delete old resolved items)
        const runCleanup = async () => {
            try {
                await supabase.rpc('delete_old_resolved_suggestions');
            } catch (err) {
                console.error('Cleanup failed (function might not exist yet):', err);
            }
        };

        runCleanup().then(() => {
            // 2. Fetch fresh list
            fetchSuggestions();
        });
    }, []);

    const fetchSuggestions = async () => {
        setLoading(true);
        try {
            // Fetch pending suggestions with user profile data
            const { data, error } = await supabase
                .from('suggestions')
                .select(`
                    id,
                    content,
                    created_at,
                    profiles (
                        name
                    )
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSuggestions(data || []);
        } catch (err) {
            console.error('Error fetching suggestions:', err);

            // Detailed error for debugging
            if (err.message) alert(`건의함 오류: ${err.message}`);
            else alert('건의함 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (id) => {
        if (!confirm('이 건의사항을 처리완료 하시겠습니까?\n처리하면 목록에서 사라집니다.')) return;

        try {
            const { error } = await supabase
                .from('suggestions')
                .update({
                    status: 'resolved',
                    resolved_at: new Date().toISOString() // Record completion time
                })
                .eq('id', id);

            if (error) throw error;

            // Remove from local list immediately
            setSuggestions(prev => prev.filter(item => item.id !== id));
            alert('처리되었습니다.');
        } catch (err) {
            console.error('Error resolving suggestion:', err);
            alert('처리에 실패했습니다. (DB 컬럼 업데이트가 필요할 수 있습니다)');
        }
    };

    return (
        <div style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            {/* Header */}
            <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/staff-menu')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        <ArrowLeft size={24} color="var(--color-text-main)" />
                    </button>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        건의함
                    </h2>
                </div>
            </div>

            {/* List */}
            <div className="flex-col" style={{ gap: '15px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#999' }}>로딩 중...</div>
                ) : suggestions.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#999', marginTop: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <Inbox size={48} color="#ddd" />
                        <p>현재 대기 중인 건의사항이 없습니다.</p>
                    </div>
                ) : (
                    suggestions.map((item) => (
                        <div
                            key={item.id}
                            style={{
                                background: 'white',
                                borderRadius: '12px',
                                padding: '20px',
                                boxShadow: 'var(--shadow-sm)',
                                borderLeft: '5px solid var(--color-secondary)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <User size={16} color="var(--color-primary)" />
                                    <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                        {item.profiles?.name || '알 수 없음'}
                                    </span>
                                </div>
                                <span style={{ fontSize: '0.8rem', color: '#999' }}>
                                    {new Date(item.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            <p style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--color-text-main)', marginBottom: '15px' }}>
                                {item.content}
                            </p>

                            <button
                                onClick={() => handleResolve(item.id)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--color-success)',
                                    background: 'white',
                                    color: 'var(--color-success)',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'var(--color-success)';
                                    e.currentTarget.style.color = 'white';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'white';
                                    e.currentTarget.style.color = 'var(--color-success)';
                                }}
                            >
                                <CheckCircle size={18} />
                                처리하기
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default SuggestionBox;
