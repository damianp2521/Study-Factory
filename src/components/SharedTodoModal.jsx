import React, { useState, useEffect } from 'react';
import { X, User, ChevronDown, ChevronUp, Calendar, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { format } from 'date-fns';
import { BRANCH_OPTIONS } from '../constants/branches'; // Assuming this exists or I'll recreate list

const SharedTodoModal = ({ onClose }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('전체');
    const [selectedCert, setSelectedCert] = useState('전체');
    const [certOptions, setCertOptions] = useState([]);
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [userTodos, setUserTodos] = useState({}); // Cache todos: { userId: [todos] }

    // Fetch members with is_public_todo = true
    useEffect(() => {
        fetchPublicMembers();
        fetchCertOptions();
    }, []);

    const fetchCertOptions = async () => {
        try {
            const { data } = await supabase.from('certificate_options').select('*');
            setCertOptions(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchPublicMembers = async () => {
        setLoading(true);
        try {
            // Need to join user_certificates to filter by cert later, 
            // but first get all public profiles.
            // Assuming authorized_users view has is_public_todo
            const { data, error } = await supabase
                .from('authorized_users')
                .select('*')
                .eq('is_public_todo', true);

            if (error) throw error;

            // Now fetch certificates for these users to allow filtering
            // Format: { user_id: [cert_name, ...] }
            const { data: certs } = await supabase
                .from('user_certificates')
                .select('user_id, certificate_options(name)');

            const certMap = {};
            if (certs) {
                certs.forEach(item => {
                    if (!certMap[item.user_id]) certMap[item.user_id] = [];
                    if (item.certificate_options) certMap[item.user_id].push(item.certificate_options.name);
                });
            }

            const membersWithCerts = data.map(m => ({
                ...m,
                certificates: certMap[m.id] || []
            }));

            setMembers(membersWithCerts);
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserTodos = async (userId) => {
        if (userTodos[userId]) return; // Already fetched

        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            const { data, error } = await supabase
                .from('daily_todos')
                .select('*')
                .eq('user_id', userId)
                .eq('date', today)
                .order('created_at', { ascending: true });

            if (error) throw error;

            setUserTodos(prev => ({ ...prev, [userId]: data || [] }));
        } catch (error) {
            console.error('Error fetching user todos:', error);
        }
    };

    const toggleExpand = (userId) => {
        if (expandedUserId === userId) {
            setExpandedUserId(null);
        } else {
            setExpandedUserId(userId);
            fetchUserTodos(userId);
        }
    };

    // Filter Logic
    const filteredMembers = members.filter(m => {
        const branchMatch = selectedBranch === '전체' || m.branch === selectedBranch;
        const certMatch = selectedCert === '전체' || m.certificates.includes(selectedCert);
        return branchMatch && certMatch;
    });

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '500px',
                height: '80vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2d3748' }}>멤버들의 오늘 할 일</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
                        <X size={24} color="#a0aec0" />
                    </button>
                </div>

                {/* Filters */}
                <div style={{ padding: '15px 20px', background: '#f8fafc', display: 'flex', gap: '10px' }}>
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '0.9rem', flex: 1 }}
                    >
                        <option value="전체">전체 지점</option>
                        {['망미점', '안락점', '연산점', '사직점', '마린시티점'].map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                    <select
                        value={selectedCert}
                        onChange={(e) => setSelectedCert(e.target.value)}
                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '0.9rem', flex: 1 }}
                    >
                        <option value="전체">전체 자격증</option>
                        {certOptions.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '15px 20px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', marginTop: '20px', color: '#a0aec0' }}>로딩 중...</div>
                    ) : filteredMembers.length === 0 ? (
                        <div style={{ textAlign: 'center', marginTop: '20px', color: '#a0aec0' }}>
                            공개된 투두가 없거나 조건에 맞는 회원이 없습니다.
                        </div>
                    ) : (
                        filteredMembers.map(member => (
                            <div key={member.id} style={{ marginBottom: '15px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                                {/* User Header */}
                                <div
                                    onClick={() => toggleExpand(member.id)}
                                    style={{
                                        padding: '12px 15px',
                                        background: 'white',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#718096'
                                        }}>
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#2d3748' }}>
                                                {member.name}
                                                {member.branch && <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#718096', marginLeft: '6px' }}>{member.branch}</span>}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#3182ce' }}>
                                                {member.certificates.length > 0 ? member.certificates.join(', ') : '준비중인 자격증 없음'}
                                            </div>
                                        </div>
                                    </div>
                                    {expandedUserId === member.id ? <ChevronUp size={20} color="#a0aec0" /> : <ChevronDown size={20} color="#a0aec0" />}
                                </div>

                                {/* Expanded Todos */}
                                {expandedUserId === member.id && (
                                    <div style={{ background: '#f8fafc', padding: '15px', borderTop: '1px solid #e2e8f0' }}>
                                        {!userTodos[member.id] ? (
                                            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#a0aec0' }}>불러오는 중...</div>
                                        ) : userTodos[member.id].length === 0 ? (
                                            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#a0aec0' }}>오늘 등록된 할 일이 없습니다.</div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {userTodos[member.id].map(todo => (
                                                    <div key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {todo.is_completed ?
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#48bb78', flexShrink: 0 }} /> :
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#cbd5e0', flexShrink: 0 }} />
                                                        }
                                                        <span style={{
                                                            fontSize: '0.9rem',
                                                            color: todo.is_completed ? '#a0aec0' : '#4a5568',
                                                            textDecoration: todo.is_completed ? 'line-through' : 'none'
                                                        }}>
                                                            {todo.content}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SharedTodoModal;
