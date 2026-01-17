import React, { useState, useEffect } from 'react';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { BRANCH_LIST } from '../constants/branches';

const AdminMemberRegister = ({ onBack }) => {
    console.log('AdminMemberRegister mounting');
    const [name, setName] = useState('');
    const [branch, setBranch] = useState('망미점');
    const [role, setRole] = useState('member'); // Default to member
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const branches = BRANCH_LIST;

    useEffect(() => {
        fetchList();
    }, []);

    const fetchList = async () => {
        try {
            const { data, error } = await supabase
                .from('authorized_users')
                .select('*')
                .eq('is_registered', false) // Only show pending users
                .order('created_at', { ascending: false });

            if (error) throw error;
            setList(data || []);
        } catch (err) {
            console.error('Error fetching list:', err);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        setError('');

        try {
            // Check for duplicates
            const { data: existing } = await supabase
                .from('authorized_users')
                .select('id')
                .eq('name', name.trim())
                .single();

            if (existing) {
                setError('이미 등록된 이름입니다.');
                setLoading(false);
                return;
            }

            const { error } = await supabase
                .from('authorized_users')
                .insert([{
                    name: name.trim(),
                    branch,
                    role // Insert Selected Role
                }]);

            if (error) throw error;

            setName('');
            fetchList();
        } catch (err) {
            console.error('Add error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('정말 삭제하시겠습니까? 계정 정보가 완전히 제거됩니다.')) return;
        try {
            // Use the RPC to delete from both authorized_users and auth.users
            const { error } = await supabase.rpc('delete_user_completely', {
                target_user_id: id
            });

            if (error) throw error;
            fetchList();
        } catch (err) {
            console.error('Delete error:', err);
            alert(`삭제 실패: ${err.message}`);
        }
    };

    return (
        <div style={{ height: '100%', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        marginLeft: '-8px', // Compensate for padding to align visually
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2d3748'
                    }}
                >
                    <ChevronLeft size={26} />
                </button>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0 4px', lineHeight: 1 }}>사원 사전 등록</h2>
            </div>

            {/* Form */}
            <form onSubmit={handleAdd} style={{ marginBottom: '30px', background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', color: '#718096', marginBottom: '5px' }}>지점</label>
                        <select
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem', background: 'white' }}
                        >
                            {branches.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', color: '#718096', marginBottom: '5px' }}>사원 구분</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem', background: 'white' }}
                        >
                            <option value="member">회원</option>
                            <option value="staff">스탭</option>
                            <option value="admin">관리자</option>
                        </select>
                    </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#718096', marginBottom: '5px' }}>이름 (로그인 ID)</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="이름을 입력하여 주세요."
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 'bold' }}
                    />
                </div>

                {error && <div style={{ color: '#e53e3e', fontSize: '0.9rem', marginBottom: '10px' }}>{error}</div>}
                <button
                    type="submit"
                    disabled={loading}
                    style={{ // Premium Button Style
                        width: '100%',
                        padding: '14px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        boxShadow: '0 4px 6px rgba(118, 75, 162, 0.3)'
                    }}
                >
                    {loading ? '등록 중...' : '등록하기'}
                </button>
            </form>

            {/* List */}
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '15px', color: '#4a5568' }}>등록 대기 현황 ({list.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {list.length === 0 && <div style={{ textAlign: 'center', color: '#a0aec0', padding: '20px' }}>대기 중인 인원이 없습니다.</div>}
                {list.map(user => (
                    <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2d3748' }}>{user.name}</div>
                            <div style={{ fontSize: '0.85rem', color: '#718096' }}>
                                {user.branch} · <span style={{ color: user.role === 'admin' ? '#e53e3e' : (user.role === 'staff' ? '#805ad5' : '#4299e1'), fontWeight: 'bold' }}>
                                    {user.role === 'admin' ? '관리자' : (user.role === 'staff' ? '스탭' : '회원')}
                                </span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#d69e2e', background: '#fffaf0', padding: '4px 8px', borderRadius: '20px', fontWeight: 'bold' }}>대기중</span>
                            <button onClick={() => handleDelete(user.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '5px' }}>
                                <Trash2 size={18} color="#e53e3e" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminMemberRegister;
