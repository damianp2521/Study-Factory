import React, { useState, useEffect } from 'react';
import PageTemplate from '../components/PageTemplate';
import { supabase } from '../lib/supabaseClient';

const ManageMembers = () => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBranch, setSelectedBranch] = useState('전체');

    const branches = ['전체', '망미점'];

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const { data, error } = await supabase
                .from('authorized_users')
                .select('*')
                .order('name');

            if (error) throw error;
            setMembers(data || []);
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredMembers = selectedBranch === '전체'
        ? members
        : members.filter(m => m.branch === selectedBranch);

    return (
        <PageTemplate title="사원 현황">
            <div style={{ padding: '0 20px 20px 20px' }}>
                {/* Branch Filter */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.9rem',
                            color: '#4a5568',
                            backgroundColor: 'white',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {branches.map(branch => (
                            <option key={branch} value={branch}>
                                {branch === '전체' ? '전체 지점' : branch}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Member List */}
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#718096', padding: '20px' }}>
                        불러오는 중...
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {filteredMembers.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#a0aec0', padding: '40px' }}>
                                해당하는 사원이 없습니다.
                            </div>
                        ) : (
                            filteredMembers.map(member => (
                                <div
                                    key={member.id}
                                    className="card"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px',
                                        marginBottom: '0' // Override card margin if needed
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '4px' }}>
                                            {member.name}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#718096' }}>
                                            {member.branch} · <span style={{
                                                color: member.role === 'admin' ? '#e53e3e' : (member.role === 'staff' ? '#805ad5' : '#4299e1'),
                                                fontWeight: 'bold'
                                            }}>
                                                {member.role === 'admin' ? '관리자' : (member.role === 'staff' ? '스탭' : '회원')}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        {member.is_registered ? (
                                            <span style={{ fontSize: '0.8rem', color: '#38a169', background: '#f0fff4', padding: '4px 8px', borderRadius: '20px', fontWeight: 'bold' }}>
                                                가입완료
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '0.8rem', color: '#d69e2e', background: '#fffaf0', padding: '4px 8px', borderRadius: '20px', fontWeight: 'bold' }}>
                                                미가입
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </PageTemplate>
    );
};

export default ManageMembers;
