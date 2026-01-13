import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const AdminMemberRegister = ({ onBack }) => {
    const [name, setName] = useState('');
    const [branch, setBranch] = useState('망미점');
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const branches = ['망미점']; // Add more as needed

    useEffect(() => {
        fetchList();
    }, []);


    const fetchList = async () => {
        try {
            const { data, error } = await supabase
                .from('authorized_users')
                .select('*')
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
                .insert([{ name: name.trim(), branch }]);

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
        if (!window.confirm('정말 삭제하시겠습니까?')) return;
        try {
            const { error } = await supabase
                .from('authorized_users')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchList();
        } catch (err) {
            console.error('Delete error:', err);
            alert('삭제 실패');
        }
    };

    return (
        <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginRight: '10px' }}>
                    <ArrowLeft size={24} color="#2d3748" />
                </button>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>사원 사전 등록</h2>
            </div>

            {/* Form */}
            <form onSubmit={handleAdd} style={{ marginBottom: '30px', background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
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
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#718096', marginBottom: '5px' }}>지점</label>
                    <select
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem', background: 'white' }}
                    >
                        {branches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
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
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '15px', color: '#4a5568' }}>등록된 명단 ({list.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {list.map(user => (
                    <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2d3748' }}>{user.name}</div>
                            <div style={{ fontSize: '0.85rem', color: '#718096' }}>{user.branch}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {user.is_registered ? (
                                <span style={{ fontSize: '0.8rem', color: '#38a169', background: '#f0fff4', padding: '4px 8px', borderRadius: '20px', fontWeight: 'bold' }}>가입완료</span>
                            ) : (
                                <span style={{ fontSize: '0.8rem', color: '#d69e2e', background: '#fffaf0', padding: '4px 8px', borderRadius: '20px', fontWeight: 'bold' }}>대기중</span>
                            )}
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
