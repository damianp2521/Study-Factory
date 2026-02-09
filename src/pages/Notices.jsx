import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import PageTemplate from '../components/PageTemplate';
import { ChevronDown, ChevronUp, Bell } from 'lucide-react';



const NoticeItem = ({ notice }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div
            className="glass-card"
            style={{
                marginBottom: 'var(--spacing-md)',
                overflow: 'hidden',
                transition: 'all var(--transition-normal)'
            }}
        >
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    padding: 'var(--spacing-md)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <div style={{ flex: 1, marginRight: 'var(--spacing-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-xs)' }}>
                        <Bell size={14} color="var(--color-primary)" style={{ marginRight: '6px' }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{notice.date}</span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text-main)' }}>
                        {notice.title}
                    </h3>
                </div>
                <div>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>

            {isExpanded && (
                <div style={{
                    padding: '0 var(--spacing-md) var(--spacing-md)',
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                    marginTop: '-4px'
                }}>
                    <p style={{
                        marginTop: 'var(--spacing-md)',
                        whiteSpace: 'pre-line',
                        color: 'var(--color-text-main)',
                        fontSize: '0.95rem',
                        lineHeight: '1.7',
                        background: 'rgba(255,255,255,0.5)',
                        padding: 'var(--spacing-sm)',
                        borderRadius: 'var(--radius-sm)'
                    }}>
                        {notice.content}
                    </p>
                </div>
            )}
        </div>
    );
};

const Notices = () => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchNotices = async () => {
            try {
                const { data, error } = await supabase
                    .from('notices')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Format date to YYYY.MM.DD
                const formattedData = data.map(item => ({
                    ...item,
                    date: new Date(item.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    }).replace(/\. /g, '.').replace('.', '') // Format: 2025.01.01
                }));

                setNotices(formattedData);
            } catch (err) {
                console.error('Error fetching notices:', err);
                setError('공지사항을 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchNotices();

        // Real-time subscription for notices
        const noticesChannel = supabase
            .channel('notices_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notices'
            }, () => {
                fetchNotices();
            })
            .subscribe();

        return () => {
            noticesChannel.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <PageTemplate title="공지사항" backPath="/memberdashboard">
                <div className="flex-center" style={{ height: '50vh' }}>
                    <p>로딩중...</p>
                </div>
            </PageTemplate>
        );
    }

    if (error) {
        return (
            <PageTemplate title="공지사항" backPath="/memberdashboard">
                <div className="flex-center" style={{ height: '50vh' }}>
                    <p>{error}</p>
                </div>
            </PageTemplate>
        );
    }

    return (
        <PageTemplate title="공지사항" backPath="/memberdashboard">
            <div style={{ paddingBottom: 'var(--spacing-xl)' }}>
                {notices.length > 0 ? (
                    notices.map(notice => (
                        <NoticeItem key={notice.id} notice={notice} />
                    ))
                ) : (
                    <div className="flex-center" style={{ height: '30vh', opacity: 0.5 }}>
                        <p>등록된 공지사항이 없습니다.</p>
                    </div>
                )}
            </div>
        </PageTemplate>
    );
};

export default Notices;
