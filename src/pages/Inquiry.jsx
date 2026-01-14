import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import PageTemplate from '../components/PageTemplate';
import { MessageCircle, Plus, Trash2 } from 'lucide-react';

const Inquiry = () => {
    const { user } = useAuth();
    const [inquiries, setInquiries] = useState([]);
    // const [loading, setLoading] = useState(true);
    // const [error, setError] = useState(null);

    useEffect(() => {
        if (user) {
            fetchInquiries();
        }
    }, [user]);

    const fetchInquiries = async () => {
        try {
            const { data, error } = await supabase
                .from('inquiries')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Format date
            const formattedData = data.map(item => ({
                ...item,
                date: new Date(item.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).replace(/\. /g, '.').replace('.', '')
            }));

            setInquiries(formattedData);
        } catch (err) {
            console.error('Error fetching inquiries:', err);
            setError('문의 내역을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('정말 삭제하시겠습니까?')) return;

        try {
            const { error } = await supabase
                .from('inquiries')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setInquiries(prev => prev.filter(item => item.id !== id));
            alert('삭제되었습니다.');
        } catch (err) {
            console.error('Error deleting inquiry:', err);
            alert('삭제에 실패했습니다.');
        }
    };

    const InquiryItem = ({ item }) => (
        <div
            className="glass-card"
            style={{
                marginBottom: 'var(--spacing-md)',
                padding: 'var(--spacing-md)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start'
            }}
        >
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                marginBottom: 'var(--spacing-xs)'
            }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{item.date}</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        color: item.status === '답변완료' ? 'var(--color-success)' : 'var(--color-secondary)',
                        background: item.status === '답변완료' ? 'rgba(56, 142, 60, 0.1)' : 'rgba(255, 111, 0, 0.1)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        marginRight: '8px'
                    }}>
                        {item.status}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                        }}
                        style={{ background: 'none', padding: '0', display: 'flex' }}
                    >
                        <Trash2 size={16} color="var(--color-text-secondary)" />
                    </button>
                </div>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-main)' }}>
                {item.title}
            </h3>
            {item.answer && (
                <div style={{
                    background: 'rgba(0,0,0,0.03)',
                    padding: 'var(--spacing-sm)',
                    borderRadius: 'var(--radius-sm)',
                    width: '100%',
                    marginTop: 'calc(var(--spacing-xs) / 2)'
                }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                        <span style={{ fontWeight: 'bold', marginRight: '4px' }}>A.</span>
                        {item.answer}
                    </p>
                </div>
            )}
        </div>
    );

    return (
        <PageTemplate title="문의하기">
            <div style={{ paddingBottom: '80px' }}>
                {inquiries.length > 0 ? (
                    inquiries.map(item => (
                        <InquiryItem key={item.id} item={item} />
                    ))
                ) : (
                    <div className="flex-center flex-col" style={{ padding: 'var(--spacing-xl) 0', opacity: 0.5 }}>
                        <MessageCircle size={48} style={{ marginBottom: 'var(--spacing-md)' }} />
                        <p>작성된 문의 내역이 없습니다.</p>
                    </div>
                )}
            </div>

            {/* Floating Action Button */}
            <div style={{
                position: 'fixed',
                bottom: 'var(--spacing-lg)',
                right: 'max(var(--spacing-lg), calc((100vw - 480px)/2 + var(--spacing-lg)))',
                zIndex: 10
            }}>
                <button
                    onClick={() => alert('문의 작성 기능은 준비중입니다.')}
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--color-primary)',
                        color: 'white',
                        boxShadow: 'var(--shadow-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform var(--transition-fast)'
                    }}
                    className="flex-center"
                >
                    <Plus size={28} />
                </button>
            </div>
        </PageTemplate>
    );
};

export default Inquiry;
