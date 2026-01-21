import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Trash2, Settings, X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { BRANCH_OPTIONS } from '../constants/branches';

const StaffBeverageManagement = ({ onBack }) => {
    const [users, setUsers] = useState([]); // List of users with seat_number
    const [loading, setLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('망미점');
    const [beverageOptions, setBeverageOptions] = useState([]);
    const [userSelections, setUserSelections] = useState({}); // user_id -> { selection_1, ... }
    const [expandedUser, setExpandedUser] = useState(null); // user_id of expanded row

    // Modal State for Menu Settings
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [newOptionName, setNewOptionName] = useState('');

    const branches = BRANCH_OPTIONS.filter(b => b !== '전체');

    useEffect(() => {
        fetchBeverageOptions();
    }, []);

    useEffect(() => {
        fetchUsersAndSelections();
    }, [selectedBranch]);

    const fetchBeverageOptions = async () => {
        try {
            const { data, error } = await supabase
                .from('beverage_options')
                .select('*')
                .order('created_at', { ascending: true });
            if (error) throw error;
            setBeverageOptions(data || []);
        } catch (err) {
            console.error('Error fetching options:', err);
        }
    };

    const fetchUsersAndSelections = async () => {
        setLoading(true);
        try {
            // 1. Fetch Users in Branch
            const { data: userData, error: userError } = await supabase
                .from('authorized_users')
                .select('*')
                .eq('branch', selectedBranch)
                .order('seat_number', { ascending: true, nullsFirst: false }); // Sort by seat

            if (userError) throw userError;

            // Filter only seated users? or show all? 
            // User request: "Member list from Seat 1..." implies seated users primarily, 
            // but unseated might need beverages too? Let's show all but sort by seat.
            // Actually, usually beverage is for people PRESENT or with SEATS.
            // Let's filter to those with seat_number for now to match "Seat 1 ~" request.
            const seatedUsers = (userData || []).filter(u => u.seat_number);

            // Sort reliably by integer seat number
            seatedUsers.sort((a, b) => (a.seat_number || 999) - (b.seat_number || 999));
            setUsers(seatedUsers);

            // 2. Fetch Selections for these users
            if (seatedUsers.length > 0) {
                const userIds = seatedUsers.map(u => u.id);
                const { data: selectionData, error: selectionError } = await supabase
                    .from('user_beverage_selections')
                    .select('*')
                    .in('user_id', userIds);

                if (selectionError) throw selectionError;

                const map = {};
                (selectionData || []).forEach(s => {
                    map[s.user_id] = s;
                });
                setUserSelections(map);
            } else {
                setUserSelections({});
            }

        } catch (err) {
            console.error('Error fetching data:', err);
            // alert('데이터를 불러오지 못했습니다.'); // Silent fail better for UI polish
        } finally {
            setLoading(false);
        }
    };

    // --- Menu Settings Logic ---
    const handleAddOption = async () => {
        if (!newOptionName.trim()) return;
        try {
            const { data, error } = await supabase
                .from('beverage_options')
                .insert([{ name: newOptionName.trim() }])
                .select();

            if (error) throw error;

            setBeverageOptions([...beverageOptions, data[0]]);
            setNewOptionName('');
        } catch (err) {
            console.error(err);
            alert('추가 실패: 이미 존재하는 이름일 수 있습니다.');
        }
    };

    const handleDeleteOption = async (id) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            const { error } = await supabase
                .from('beverage_options')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setBeverageOptions(beverageOptions.filter(o => o.id !== id));
        } catch (err) {
            console.error(err);
            alert('삭제 실패');
        }
    };

    // --- Selection Logic ---
    const handleSelectionChange = async (userId, slotIndex, optionId) => {
        // slotIndex: 1~5
        const fieldName = `selection_${slotIndex}`;
        const currentSelection = userSelections[userId] || { user_id: userId };

        // Optimistic Update
        const updatedSelection = { ...currentSelection, [fieldName]: optionId };
        setUserSelections(prev => ({ ...prev, [userId]: updatedSelection }));

        try {
            // Upsert
            const { error } = await supabase
                .from('user_beverage_selections')
                .upsert(updatedSelection, { onConflict: 'user_id' });

            if (error) throw error;
        } catch (err) {
            console.error('Update error:', err);
            alert('저장 실패');
            // Revert? (Complex, skipping for prototype)
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', marginLeft: '-8px', borderRadius: '50%', display: 'flex' }}>
                        <ChevronLeft size={26} color="#2d3748" />
                    </button>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 0 4px', lineHeight: 1 }}>음료 관리</h2>
                </div>
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: '#edf2f7',
                        border: 'none',
                        color: '#4a5568',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}
                >
                    <Settings size={16} />
                    메뉴 설정
                </button>
            </div>

            {/* Branch Selection (Optional, if multiple branches supported later) */}
            {/* For now, just fixed or hidden if Mangmi only, but kept for consistency */}
            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                {branches.map(b => (
                    <button
                        key={b}
                        onClick={() => setSelectedBranch(b)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: selectedBranch === b ? 'none' : '1px solid #e2e8f0',
                            background: selectedBranch === b ? 'var(--color-primary)' : 'white',
                            color: selectedBranch === b ? 'white' : '#718096',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        {b}
                    </button>
                ))}
            </div>

            {/* User List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '20px' }}>로딩 중...</div>
                ) : users.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '20px' }}>좌석 배정된 사원이 없습니다.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {users.map(user => {
                            const isExpanded = expandedUser === user.id;
                            const selection = userSelections[user.id] || {};

                            // Create summary string of selections
                            const selectionNames = [];
                            [1, 2, 3, 4, 5].forEach(i => {
                                const optId = selection[`selection_${i}`];
                                const opt = beverageOptions.find(o => o.id === optId);
                                if (opt) selectionNames.push(opt.name);
                            });
                            const summary = selectionNames.length > 0 ? selectionNames.join(', ') : '선택 없음';

                            return (
                                <div key={user.id} style={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    border: isExpanded ? '1px solid #3182ce' : '1px solid #e2e8f0',
                                    overflow: 'hidden',
                                    transition: 'all 0.2s'
                                }}>
                                    {/* Header Row */}
                                    <div
                                        onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                                        style={{
                                            padding: '12px 15px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            background: isExpanded ? '#ebf8ff' : 'white'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div style={{
                                                width: '28px', height: '28px',
                                                background: '#bee3f8', color: '#2b6cb0',
                                                borderRadius: '8px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 'bold', fontSize: '0.9rem'
                                            }}>
                                                {user.seat_number}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: '#2d3748' }}>{user.name}</div>
                                                {!isExpanded && (
                                                    <div style={{ fontSize: '0.85rem', color: '#718096', marginTop: '2px' }}>
                                                        {summary}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp size={20} color="#3182ce" /> : <ChevronDown size={20} color="#cbd5e0" />}
                                    </div>

                                    {/* Expanded Selection Area */}
                                    {isExpanded && (
                                        <div style={{ padding: '15px', borderTop: '1px solid #e2e8f0', background: '#fcfcfc' }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#4a5568', marginBottom: '10px' }}>음료 선택 (최대 5개)</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontSize: '0.9rem', color: '#a0aec0', width: '20px' }}>{i}.</span>
                                                        <select
                                                            value={selection[`selection_${i}`] || ''}
                                                            onChange={(e) => handleSelectionChange(user.id, i, e.target.value || null)}
                                                            style={{
                                                                flex: 1,
                                                                padding: '8px',
                                                                borderRadius: '8px',
                                                                border: '1px solid #cbd5e0',
                                                                fontSize: '0.95rem',
                                                                background: 'white'
                                                            }}
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
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Menu Settings Modal */}
            {isSettingsOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 2000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: 'white', width: '90%', maxWidth: '350px',
                        borderRadius: '16px', padding: '20px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>음료 메뉴 설정</h3>
                            <button onClick={() => setIsSettingsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                            <input
                                type="text"
                                placeholder="새 메뉴 이름"
                                value={newOptionName}
                                onChange={(e) => setNewOptionName(e.target.value)}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: '8px',
                                    border: '1px solid #e2e8f0', fontSize: '1rem'
                                }}
                            />
                            <button
                                onClick={handleAddOption}
                                style={{
                                    padding: '10px', borderRadius: '8px',
                                    background: '#3182ce', color: 'white',
                                    border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {beverageOptions.map(opt => (
                                <div key={opt.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px', borderBottom: '1px solid #f7fafc'
                                }}>
                                    <span style={{ fontSize: '1rem', color: '#2d3748' }}>{opt.name}</span>
                                    <button
                                        onClick={() => handleDeleteOption(opt.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: '5px' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {beverageOptions.length === 0 && (
                                <div style={{ textAlign: 'center', color: '#a0aec0', padding: '20px' }}>등록된 메뉴가 없습니다.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffBeverageManagement;
