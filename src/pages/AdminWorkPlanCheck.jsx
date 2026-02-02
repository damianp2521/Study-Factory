import React, { useState, useEffect } from 'react';
import { X, User, ChevronLeft, Search } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import DailyWorkPlan from '../components/DailyWorkPlan';

const AdminWorkPlanCheck = ({ onBack }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('전체');
    const [selectedCert, setSelectedCert] = useState('전체');
    const [searchName, setSearchName] = useState('');
    const [certOptions, setCertOptions] = useState([]);
    const [selectedMember, setSelectedMember] = useState(null);

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
        const memberCerts = m.certificates || [];
        const branchMatch = selectedBranch === '전체' || m.branch === selectedBranch;
        const certMatch = selectedCert === '전체' || memberCerts.includes(selectedCert);
        const nameMatch = m.name.toLowerCase().includes(searchName.toLowerCase());
        return branchMatch && certMatch && nameMatch;
    });

    if (selectedMember) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white' }}>
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
                        <span>전체 목록</span>
                    </button>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#2d3748' }}>{selectedMember.name} 님의 작업계획</h3>
                    <div style={{ width: '40px' }} /> {/* Spacer */}
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
                    <DailyWorkPlan
                        targetUserId={selectedMember.id}
                        targetUserName={selectedMember.name}
                        isReadOnly={true}
                    />
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'white' }}>
            {/* Header */}
            <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', display: 'flex' }}>
                    <ChevronLeft size={24} color="#2d3748" />
                </button>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#2d3748' }}>작업계획 확인</h2>
            </div>

            {/* Filters */}
            <div style={{ padding: '20px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e0', fontSize: '0.95rem', flex: 1, outline: 'none' }}
                    >
                        <option value="전체">전체 지점</option>
                        {['망미점'].map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                    <select
                        value={selectedCert}
                        onChange={(e) => setSelectedCert(e.target.value)}
                        style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e0', fontSize: '0.95rem', flex: 1, outline: 'none' }}
                    >
                        <option value="전체">전체 자격증</option>
                        {certOptions.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div style={{ position: 'relative' }}>
                    <Search size={18} color="#a0aec0" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="이름으로 검색"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 12px 10px 40px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e0',
                            fontSize: '0.95rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
            </div>

            {/* Member List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', marginTop: '40px', color: '#a0aec0' }}>사원 목록 로딩 중...</div>
                ) : filteredMembers.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '40px', color: '#a0aec0' }}>
                        검색 결과가 없거나 작업 계획이 공유된 멤버가 없습니다.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                        {filteredMembers.map(member => (
                            <div
                                key={member.id}
                                onClick={() => setSelectedMember(member)}
                                style={{
                                    padding: '16px',
                                    background: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                                }}
                            >
                                <div style={{
                                    width: '45px', height: '45px', borderRadius: '50%', background: '#edf2f7',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#718096'
                                }}>
                                    <User size={24} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {member.name}
                                        {member.branch && <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#718096', background: '#f7fafc', padding: '2px 8px', borderRadius: '4px' }}>{member.branch}</span>}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#3182ce', marginTop: '4px' }}>
                                        {(member.certificates && member.certificates.length > 0) ? member.certificates.join(', ') : '준비중인 자격증 없음'}
                                    </div>
                                </div>
                                <div style={{ color: '#cbd5e0' }}>→</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminWorkPlanCheck;
