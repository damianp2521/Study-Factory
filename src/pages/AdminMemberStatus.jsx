import React, { useState, useEffect } from 'react';
import { ChevronLeft, Trash2, Edit2, Save, X, Search } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { BRANCH_OPTIONS, BRANCH_LIST } from '../constants/branches';

const AdminMemberStatus = ({ onBack }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({
        branch: '',
        role: '',
        seat_number: '',
        selection_1: null,
        selection_2: null,
        selection_3: null
    });
    const [selectedBranch, setSelectedBranch] = useState('전체');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [beverageOptions, setBeverageOptions] = useState([]);

    const branches = BRANCH_OPTIONS;

    useEffect(() => {
        fetchUsers();
        fetchBeverageOptions();
    }, []);

    const fetchBeverageOptions = async () => {
        try {
            const { data, error } = await supabase.from('beverage_options').select('*').order('created_at', { ascending: true });
            if (error) throw error;
            setBeverageOptions(data || []);
        } catch (e) {
            console.error('Error fetching beverage options:', e);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const [usersRes, pendingRes] = await Promise.all([
                supabase.from('authorized_users').select('*').order('name', { ascending: true }),
                supabase.from('pending_registrations').select('*').order('name', { ascending: true })
            ]);

            if (usersRes.error) throw usersRes.error;
            if (pendingRes.error) throw pendingRes.error;

            const activeUsers = (usersRes.data || []).map(u => ({ ...u, type: 'active' }));
            const pendingUsers = (pendingRes.data || []).map(u => ({ ...u, type: 'pending' }));

            // Merge and sort by Name
            const allUsers = [...activeUsers, ...pendingUsers].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
            setUsers(allUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
            alert('사원 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name, type) => {
        if (type === 'pending') {
            if (!window.confirm(`${name} (가입대기) 님을 삭제하시겠습니까?`)) return;
            try {
                const { error } = await supabase.from('pending_registrations').delete().eq('id', id);
                if (error) throw error;
                fetchUsers();
                alert('삭제되었습니다.');
            } catch (e) {
                console.error('Delete pending error:', e);
                alert(`삭제 실패: ${e.message}`);
            }
            return;
        }

        if (!window.confirm(`${name} 님을 정말 삭제하시겠습니까?\n삭제 후에는 로그인이 불가능하며, 계정 정보가 완전히 제거됩니다.`)) return;

        try {
            // Use the RPC to delete from both authorized_users and auth.users
            const { error } = await supabase.rpc('delete_user_completely', {
                target_user_id: id
            });

            if (error) throw error;

            fetchUsers();
            alert('삭제되었습니다.');
        } catch (error) {
            console.error('Delete error:', error);
            alert(`삭제에 실패했습니다.\n${error.message}`);
        }
    };

    const startEdit = (user) => {
        setEditingId(user.id);
        setEditForm({
            branch: user.branch,
            role: user.role,
            seat_number: user.seat_number || '',
            selection_1: null,
            selection_2: null,
            selection_3: null
        });

        // Fetch current beverage selections for this user
        supabase.from('user_beverage_selections')
            .select('*')
            .eq('user_id', user.id)
            .single()
            .then(({ data, error }) => {
                if (data) {
                    setEditForm(prev => ({
                        ...prev,
                        selection_1: data.selection_1,
                        selection_2: data.selection_2,
                        selection_3: data.selection_3
                    }));
                }
            });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({
            branch: '',
            role: '',
            seat_number: '',
            selection_1: null,
            selection_2: null,
            selection_3: null,
            selection_4: null,
            selection_5: null
        });
    };

    const saveEdit = async (id) => {
        try {
            // Prepare seat number: if empty or '미지정', send NULL
            const seatNum = editForm.seat_number === '미지정' || editForm.seat_number === ''
                ? null
                : parseInt(editForm.seat_number, 10);

            // Apply updates securely using the RPC function we just created
            const { data, error } = await supabase.rpc('update_employee_info', {
                target_id: id,
                new_branch: editForm.branch,
                new_role: editForm.role,
                new_seat_number: seatNum
            });

            if (error) throw error;

            // Save Beverage Selections
            const beverageData = {
                user_id: id,
                selection_1: editForm.selection_1,
                selection_2: editForm.selection_2,
                selection_3: editForm.selection_3,
                // Ensure unused slots are nulled out if desired, or just ignored. 
                // Since we want to display only 3, saving only 3 is sufficient.
                selection_4: null,
                selection_5: null
            };

            const { error: bevError } = await supabase
                .from('user_beverage_selections')
                .upsert(beverageData, { onConflict: 'user_id' });

            if (bevError) throw bevError;

            console.log('Update result:', data);

            setEditingId(null);
            console.log('Update successful, refreshing list...');
            await fetchUsers();
            alert('수정되었습니다.');
            // Double check list after alert
            setTimeout(() => {
                fetchUsers();
            }, 500);
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

    const filteredUsers = users.filter(user => {
        // Branch filter
        const branchMatch = selectedBranch === '전체' || user.branch === selectedBranch;
        // Name search filter
        const nameMatch = !searchTerm.trim() || user.name.toLowerCase().includes(searchTerm.toLowerCase());
        return branchMatch && nameMatch;
    });

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '20px',
                flexShrink: 0 // Prevent header from shrinking
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                        onClick={onBack}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px',
                            marginLeft: '-8px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#2d3748'
                        }}
                    >
                        <ChevronLeft size={26} />
                    </button>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0 4px', lineHeight: 1 }}>사원 현황</h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Name Search */}
                    {isSearchOpen ? (
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
                            padding: '8px 12px'
                        }}>
                            <Search size={16} color="#a0aec0" style={{ marginRight: '6px', flexShrink: 0 }} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="이름 검색"
                                style={{
                                    border: 'none', outline: 'none', fontSize: '0.9rem', width: '70px', color: '#4a5568'
                                }}
                                autoFocus
                                onBlur={() => {
                                    if (!searchTerm) setIsSearchOpen(false);
                                }}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => { setSearchTerm(''); setIsSearchOpen(false); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}
                                >
                                    <X size={14} color="#a0aec0" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            style={{
                                background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
                                padding: '8px 12px', fontSize: '0.9rem', color: '#4a5568',
                                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                            }}
                        >
                            <Search size={16} color="#718096" />
                            <span>이름 검색</span>
                        </button>
                    )}

                    {/* Branch Filter */}
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
            </div>

            {/* List */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                flex: 1, // Take remaining space
                overflowY: 'auto' // Enable scrolling for list
            }}>
                {loading && <div style={{ textAlign: 'center', color: '#a0aec0' }}>로딩 중...</div>}

                {!loading && filteredUsers.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '50px' }}>
                        {selectedBranch === '전체' ? '등록된 사원이 없습니다.' : '해당 지점에 사원이 없습니다.'}
                    </div>
                )}

                {filteredUsers.map(user => (
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
                                            {BRANCH_LIST.map(b => <option key={b} value={b}>{b}</option>)}
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
                                {/* Seat Selection */}
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#718096', display: 'block', marginBottom: '4px' }}>좌석 (망미점 1~102)</label>
                                    <select
                                        value={editForm.seat_number || '미지정'}
                                        onChange={(e) => setEditForm({ ...editForm, seat_number: e.target.value })}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
                                        disabled={editForm.branch !== '망미점'}
                                    >
                                        <option value="미지정">미지정</option>
                                        {editForm.branch === '망미점' && Array.from({ length: 102 }, (_, i) => i + 1).map(num => (
                                            <option key={num} value={num}>{num}번</option>
                                        ))}
                                    </select>
                                    {editForm.branch !== '망미점' && (
                                        <div style={{ fontSize: '0.75rem', color: '#a0aec0', marginTop: '2px' }}>
                                            *좌석 지정은 망미점만 가능합니다.
                                        </div>
                                    )}
                                </div>

                                {/* Beverage Selection */}
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#718096', display: 'block', marginBottom: '8px' }}>음료 설정 (최대 3개)</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {[1, 2, 3].map(idx => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#a0aec0', width: '20px' }}>{idx}.</span>
                                                <select
                                                    value={editForm[`selection_${idx}`] || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, [`selection_${idx}`]: e.target.value || null })}
                                                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '0.9rem' }}
                                                >
                                                    <option value="">(선택 안함)</option>
                                                    {beverageOptions.map(opt => (
                                                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // View Mode (Active & Pending)
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748' }}>{user.name}</span>
                                        {user.type === 'pending' && (
                                            <span style={{ fontSize: '0.8rem', color: '#e53e3e', background: '#fff5f5', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                가입대기중
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#718096' }}>{user.branch}</span>
                                        <span style={{ width: '1px', height: '12px', background: '#cbd5e0' }}></span>
                                        <span style={{
                                            fontSize: '0.85rem',
                                            fontWeight: 'bold',
                                            color: getRoleColor(user.role)
                                        }}>
                                            {getRoleLabel(user.role)}
                                        </span>
                                        {(user.seat_number || (user.type === 'pending' && user.seat_number)) && (
                                            <>
                                                <span style={{ width: '1px', height: '12px', background: '#cbd5e0' }}></span>
                                                <span style={{
                                                    fontSize: '0.85rem',
                                                    color: '#2b6cb0',
                                                    fontWeight: 'bold'
                                                }}>
                                                    좌석 {user.seat_number}번
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    {user.memo && (
                                        <div style={{ fontSize: '0.85rem', color: '#718096', marginTop: '4px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {user.memo}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {user.type === 'active' && (
                                        <button
                                            onClick={() => startEdit(user)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', color: '#718096' }}
                                        >
                                            <Edit2 size={20} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(user.id, user.name, user.type)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', color: '#e53e3e' }}
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

            </div >
        </div >
    );
};

export default AdminMemberStatus;
