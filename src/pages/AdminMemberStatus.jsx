import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Edit2, Save, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const AdminMemberStatus = ({ onBack }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ branch: '', role: '' });

    const branches = ['망미점']; // Add more if needed in future

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Fetch ALL users (or just registered ones? "가입되어있는" implies registered)
            // Let's filter by is_registered = true as requested "가입되어있는 모든 사원"
            const { data, error } = await supabase
                .from('authorized_users')
                .select('*')
                // .eq('is_registered', true) // Removed filter to show all users for management
                .order('name', { ascending: true });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            alert('사원 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`${name} 님을 정말 삭제하시겠습니까?\n삭제 후에는 로그인이 불가능합니다.`)) return;

        try {
            const { error } = await supabase
                .from('authorized_users')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchUsers();
            alert('삭제되었습니다.');
        } catch (error) {
            console.error('Delete error:', error);
            alert('삭제에 실패했습니다.');
        }
    };

    const startEdit = (user) => {
        setEditingId(user.id);
        setEditForm({ branch: user.branch, role: user.role });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ branch: '', role: '' });
    };

    const saveEdit = async (id) => {
        try {
            // Apply updates securely using the RPC function we just created
            const { data, error } = await supabase.rpc('update_employee_info', {
                target_id: id,
                new_branch: editForm.branch,
                new_role: editForm.role
            });

            if (error) throw error;

            console.log('Update result:', data);

            setEditingId(null);
            fetchUsers();

            alert('수정되었습니다.');
        } catch (error) {
            console.error('Update error:', error);
            // Alert detailed error message to help debugging
            alert(`수정에 실패했습니다.\n사유: ${error.message || error.details || JSON.stringify(error)}`);
        }
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case 'admin': return '관리자';
            case 'staff': return '스탭';
            default: return '회원';
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin': return '#e53e3e'; // Red
            case 'staff': return '#805ad5'; // Purple
            default: return '#3182ce'; // Blue
        }
    };

    return (
        <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
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
                    <ArrowLeft size={24} />
                </button>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0 4px', lineHeight: 1 }}>사원 현황</h2>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {loading && <div style={{ textAlign: 'center', color: '#a0aec0' }}>로딩 중...</div>}

                {!loading && users.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '50px' }}>
                        등록된 사원이 없습니다.
                    </div>
                )}

                {users.map(user => (
                    <div key={user.id} style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '15px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        border: '1px solid #e2e8f0'
                    }}>
                        {editingId === user.id ? (
                            // Edit Mode
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{user.name}</span>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <button onClick={() => saveEdit(user.id)} style={{ padding: '8px', background: '#38a169', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                            <Save size={18} />
                                        </button>
                                        <button onClick={cancelEdit} style={{ padding: '8px', background: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.8rem', color: '#718096', display: 'block', marginBottom: '4px' }}>지점</label>
                                        <select
                                            value={editForm.branch}
                                            onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                                            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                                        >
                                            {branches.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.8rem', color: '#718096', display: 'block', marginBottom: '4px' }}>구분</label>
                                        <select
                                            value={editForm.role}
                                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                                        >
                                            <option value="member">회원</option>
                                            <option value="staff">스탭</option>
                                            <option value="admin">관리자</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // View Mode
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '4px' }}>
                                        {user.name}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#718096' }}>{user.branch}</span>
                                        <span style={{ width: '1px', height: '12px', background: '#cbd5e0' }}></span>
                                        <span style={{
                                            fontSize: '0.85rem',
                                            fontWeight: 'bold',
                                            color: getRoleColor(user.role)
                                        }}>
                                            {getRoleLabel(user.role)}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => startEdit(user)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', color: '#718096' }}
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user.id, user.name)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', color: '#feb2b2' }}
                                    >
                                        <Trash2 size={20} color="#e53e3e" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminMemberStatus;
