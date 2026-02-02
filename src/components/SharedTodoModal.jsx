import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, User, ChevronLeft, Search } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import DailyWorkPlan from './DailyWorkPlan';

const SharedTodoModal = ({ onClose }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('전체');
    const [selectedCert, setSelectedCert] = useState('전체');
    const [searchName, setSearchName] = useState('');
    const [certOptions, setCertOptions] = useState([]);
    const [selectedMember, setSelectedMember] = useState(null); // Track viewing user

    // Fetch members with is_public_todo = true
    useEffect(() => {
        fetchPublicMembers();
        fetchCertOptions();

        // Disable body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
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
            // Use RPC to fetch public members safely
            const { data, error } = await supabase.rpc('get_public_members');

            if (error) throw error;
            setMembers(data || []);
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredMembers = members.filter(m => {
        const memberCerts = m.certificates || []; // Handle null/undefined
        const branchMatch = selectedBranch === '전체' || m.branch === selectedBranch;
        const certMatch = selectedCert === '전체' || memberCerts.includes(selectedCert);
        const nameMatch = m.name.toLowerCase().includes(searchName.toLowerCase());
        return branchMatch && certMatch && nameMatch;
    });

    const modalContent = (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999, // High z-index for portal
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
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
                {/* Check if viewing a specific member */}
                {selectedMember ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* Header for Detail View */}
                        <div style={{
                            padding: '15px 20px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexShrink: 0
                        }}>
                            <button
                                onClick={() => setSelectedMember(null)}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    color: '#4a5568', fontWeight: 'bold'
                                }}
                            >
                                <ChevronLeft size={20} />
                                <span>뒤로</span>
                            </button>
                            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
                                <X size={24} color="#a0aec0" />
                            </button>
                        </div>

                        {/* Render Read-Only Work Plan */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
                            <DailyWorkPlan
                                targetUserId={selectedMember.id}
                                targetUserName={selectedMember.name}
                                isReadOnly={true}
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header for List View */}
                        <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2d3748' }}>멤버들의 오늘 할 일</h3>
                            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
                                <X size={24} color="#a0aec0" />
                            </button>
                        </div>

                        {/* Filters */}
                        <div style={{ padding: '15px 20px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                    style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '0.9rem', flex: 1 }}
                                >
                                    <option value="전체">전체 지점</option>
                                    {['망미점'].map(b => (
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
                            <div style={{ position: 'relative' }}>
                                <Search size={16} color="#a0aec0" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    type="text"
                                    placeholder="이름으로 검색"
                                    value={searchName}
                                    onChange={(e) => setSearchName(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 8px 8px 32px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e0',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Member List */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '15px 20px' }}>
                            {loading ? (
                                <div style={{ textAlign: 'center', marginTop: '20px', color: '#a0aec0' }}>로딩 중...</div>
                            ) : filteredMembers.length === 0 ? (
                                <div style={{ textAlign: 'center', marginTop: '20px', color: '#a0aec0' }}>
                                    공개된 투두가 없거나 조건에 맞는 회원이 없습니다.
                                </div>
                            ) : (
                                filteredMembers.map(member => (
                                    <div
                                        key={member.id}
                                        onClick={() => setSelectedMember(member)}
                                        style={{
                                            marginBottom: '10px',
                                            padding: '12px 15px',
                                            background: 'white',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}
                                    >
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%', background: '#edf2f7',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#718096'
                                        }}>
                                            <User size={20} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {member.name}
                                                {member.branch && <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#718096', background: '#f7fafc', padding: '2px 6px', borderRadius: '4px' }}>{member.branch}</span>}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#3182ce', marginTop: '2px' }}>
                                                {(member.certificates && member.certificates.length > 0) ? member.certificates.join(', ') : '준비중인 자격증 없음'}
                                            </div>
                                        </div>
                                        <div style={{ color: '#a0aec0' }}>→</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

export default SharedTodoModal;
