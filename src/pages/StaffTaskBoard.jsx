import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BRANCH_OPTIONS } from '../constants/branches';
import { useAuth } from '../context/AuthContext';
import { Plus, Check, Trash2, AlertCircle, MessageCircle, Edit2, ChevronDown, Settings, Calendar } from 'lucide-react';

const StaffTaskBoard = () => {
    const { user } = useAuth();
    const [view, setView] = useState(() => localStorage.getItem('staff_task_board_view') || 'tasks'); // 'tasks' | 'schedule'
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTodo, setNewTodo] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [editContent, setEditContent] = useState('');

    // Persist view
    useEffect(() => {
        localStorage.setItem('staff_task_board_view', view);
    }, [view]);

    // Branch configuration
    // Branch configuration
    const BASIC_BRANCHES = BRANCH_OPTIONS;

    // Sorted Branch List
    const branches = React.useMemo(() => {
        const userBranch = user?.branch || '';
        // 1. Combine and Deduplicate
        const all = new Set([...BASIC_BRANCHES]);
        if (userBranch && userBranch !== '미정') all.add(userBranch);

        // 2. Sort
        return Array.from(all).sort((a, b) => {
            // '전체' always first
            if (a === '전체') return -1;
            if (b === '전체') return 1;

            // User branch always second (right after '전체')
            if (a === userBranch) return -1;
            if (b === userBranch) return 1;

            // Others alphabetical
            return a.localeCompare(b);
        });
    }, [user?.branch]);

    // Initialize selection
    const [selectedBranch, setSelectedBranch] = useState(() => {
        if (user?.branch && user.branch !== '미정') return user.branch;
        return '전체';
    });

    // Update selected branch if user data updates
    useEffect(() => {
        if (user?.branch) {
            const target = (user.branch === '미정' || user.branch === '전체') ? '전체' : user.branch;
            setSelectedBranch(target);
        }
    }, [user?.branch]);

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Staff Todos
            const { data: todos, error: todoError } = await supabase
                .from('staff_todos')
                .select(`
                    *,
                    author:created_by ( name, branch ),
                    completer:completed_by ( name )
                `);

            if (todoError) throw todoError;

            // 2. Fetch Member Suggestions
            const { data: suggestions, error: suggestionError } = await supabase
                .from('suggestions')
                .select(`
                    *,
                    author:user_id ( name, branch ),
                    completer:completed_by ( name )
                `);

            if (suggestionError) throw suggestionError;

            // 3. Merge & Format
            const formattedTodos = (todos || []).map(t => ({
                ...t,
                type: 'staff',
                authorName: t.author?.name || '알수없음',
                branch: t.branch || t.author?.branch || '알수없음', // Use stored branch, fallback to author's current branch
                completerName: t.completer?.name
            }));

            const formattedSuggestions = (suggestions || []).map(s => ({
                id: s.id, // suggestion id
                content: s.content,
                is_urgent: false, // Member suggestions are separate priority, but technically not "urgent staff todo"
                status: s.status === 'resolved' ? 'completed' : 'pending',
                created_at: s.created_at,
                type: 'suggestion',
                authorName: s.author?.name || '익명',
                branch: s.author?.branch || '알수없음', // Suggestions still track user's *current* branch
                completerName: s.completer?.name // Now fetching completer name from newly added relation
            }));

            setTasks([...formattedTodos, ...formattedSuggestions]);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Add Staff Todo
    const handleAddTodo = async () => {
        if (selectedBranch === '전체') {
            alert('지점을 선택 후 할 일을 입력해주세요.');
            return;
        }
        if (!newTodo.trim()) return;
        try {
            const targetBranch = selectedBranch === '전체' ? user.branch : selectedBranch;
            const { error } = await supabase
                .from('staff_todos')
                .insert([{
                    content: newTodo,
                    is_urgent: isUrgent,
                    created_by: user.id,
                    branch: targetBranch // Save the target branch
                }]);

            if (error) throw error;

            setNewTodo('');
            setIsUrgent(false);
            fetchData();
        } catch (error) {
            console.error('Error adding todo:', error);
            alert(`투두 추가 실패: ${error.message || error.details || JSON.stringify(error)}`);
        }
    };

    // Toggle Complete
    const handleToggleComplete = async (task) => {
        try {
            if (task.type === 'staff') {
                const newStatus = task.status === 'completed' ? 'pending' : 'completed';
                const completedBy = newStatus === 'completed' ? user.id : null;
                const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

                const { error } = await supabase
                    .from('staff_todos')
                    .update({
                        status: newStatus,
                        completed_by: completedBy,
                        completed_at: completedAt
                    })
                    .eq('id', task.id);
                if (error) throw error;

            } else if (task.type === 'suggestion') {
                const newStatus = task.status === 'completed' ? 'pending' : 'resolved'; // 'resolved' matches suggestion table
                const completedBy = newStatus === 'resolved' ? user.id : null;
                // Note: suggestions table might not track completed_at, but we track completed_by now.

                const { error } = await supabase
                    .from('suggestions')
                    .update({
                        status: newStatus,
                        completed_by: completedBy
                    })
                    .eq('id', task.id);
                if (error) throw error;
            }
            fetchData();
        } catch (error) {
            console.error('Error updating task:', error);
            alert('상태 업데이트 실패');
        }
    };

    // Delete Task
    const handleDelete = async (task) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        // Permission Check
        // Permission Check
        const isAdmin = user.role === 'admin' || user.role === 'manager';

        let canDelete = false;

        // Admin overrides all
        if (isAdmin) {
            canDelete = true;
        } else if (task.type === 'staff') {
            // Staff can only delete their own pending tasks
            if (task.status === 'pending' && task.created_by === user.id) canDelete = true;
        }

        if (!canDelete) {
            console.log('Delete permission denied:', { role: user.role, type: task.type, status: task.status, creator: task.created_by, userId: user.id });
            alert('삭제 권한이 없습니다.');
            return;
        }

        try {
            const table = task.type === 'staff' ? 'staff_todos' : 'suggestions';
            const { error } = await supabase.from(table).delete().eq('id', task.id);
            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Error deleting task:', error);
            alert(`삭제 실패: ${error.message || error.details || JSON.stringify(error)}`);
        }
    };

    // Edit Task
    const handleEdit = async (task) => {
        if (!editContent.trim()) return;
        try {
            const table = task.type === 'staff' ? 'staff_todos' : 'suggestions';
            const { error } = await supabase
                .from(table)
                .update({ content: editContent })
                .eq('id', task.id);
            if (error) throw error;
            setEditingTask(null);
            setEditContent('');
            fetchData();
        } catch (error) {
            console.error('Error editing task:', error);
            alert(`수정 실패: ${error.message || error.details || JSON.stringify(error)}`);
        }
    };

    // Start Edit Mode
    const startEdit = (task) => {
        setEditingTask(task);
        setEditContent(task.content);
    };

    // Sorting & Filtering
    const sortedTasks = [...tasks]
        .filter(task => {
            if (selectedBranch === '전체') return true;
            return task.branch === selectedBranch;
        })
        .sort((a, b) => {
            // 1. Pending First
            if (a.status !== b.status) {
                return a.status === 'pending' ? -1 : 1;
            }

            // 2. Inside Pending: Urgent(Red) > Suggestion(Green) > Normal(Blue)
            if (a.status === 'pending') {
                const getPriority = (t) => {
                    if (t.type === 'staff' && t.is_urgent) return 3;
                    if (t.type === 'suggestion') return 2;
                    return 1;
                };
                const pA = getPriority(a);
                const pB = getPriority(b);
                if (pA !== pB) return pB - pA; // Higher priority first
            }

            // 3. Oldest First (created_at ASC)
            return new Date(a.created_at) - new Date(b.created_at);
        });


    // Render Helper
    const getTaskStyle = (task) => {
        if (task.status === 'completed') {
            return { borderColor: '#e2e8f0', bg: '#f8fafc', text: '#718096' }; // Darker gray for completed
        }
        if (task.type === 'staff' && task.is_urgent) {
            return { borderColor: '#feb2b2', bg: '#fff5f5', text: '#c53030' }; // Red
        }
        if (task.type === 'suggestion') {
            return { borderColor: '#9ae6b4', bg: '#f0fff4', text: '#276749' }; // Green
        }
        return { borderColor: '#bee3f8', bg: '#ebf8ff', text: '#2c5282' }; // Blue
    };

    // Check Delete/Edit Permission Helper (same rules)
    const canUserModify = (task) => {
        const isAdmin = user.role === 'admin' || user.role === 'manager';
        if (isAdmin) return true;

        // Staff can only edit/delete their own pending tasks
        if (task.type === 'staff' && task.status === 'pending' && task.created_by === user.id) {
            return true;
        }
        return false;
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px' }}>
            {/* Header Controls: Branch + View Toggle */}
            <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '15px',
                marginBottom: '15px',
                flexWrap: 'wrap'
            }}>
                {/* Compact Branch Filter Dropdown */}
                <div style={{ position: 'relative', width: 'fit-content' }}>
                    <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: '4px', paddingLeft: '4px' }}>지점</div>
                    <div style={{ position: 'relative' }}>
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            style={{
                                width: 'auto',
                                minWidth: '130px',
                                padding: '6px 32px 6px 16px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                backgroundColor: 'white',
                                color: '#4a5568',
                                fontSize: '0.95rem',
                                fontWeight: '500',
                                appearance: 'none',
                                cursor: 'pointer',
                                outline: 'none',
                            }}
                        >
                            {branches.map(branch => (
                                <option key={branch} value={branch}>
                                    {branch === '전체' ? '전체 지점' : branch}
                                </option>
                            ))}
                        </select>
                        <div style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: '#718096',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <ChevronDown size={16} />
                        </div>
                    </div>
                </div>

                {/* View Toggle Button */}
                <button
                    onClick={() => setView(view === 'tasks' ? 'schedule' : 'tasks')}
                    style={{
                        padding: '6px 16px',
                        height: '38px', // Match dropdown height roughly
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: view === 'schedule' ? 'var(--color-primary)' : 'white',
                        color: view === 'schedule' ? 'white' : '#4a5568',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: view === 'schedule' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                    }}
                >
                    {view === 'schedule' ? <MessageCircle size={18} /> : <Calendar size={18} />}
                    {view === 'schedule' ? '업무 현황 보기' : '스탭 근무표 보기'}
                </button>
            </div>

            {view === 'tasks' ? (
                <>
                    {/* Add Todo Input */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        {/* ... (rest of the input code) */}
                        <div style={{ position: 'relative', flex: 1 }}>
                            <input
                                type="text"
                                value={newTodo}
                                onChange={(e) => setNewTodo(e.target.value)}
                                placeholder={selectedBranch === '전체' ? '지점 선택 후 할 일을 입력하여 주세요' : '할 일을 입력하세요...'}
                                disabled={selectedBranch === '전체'}
                                style={{
                                    width: '100%',
                                    padding: '12px 15px',
                                    paddingRight: '80px',
                                    borderRadius: '12px',
                                    border: `2px solid ${isUrgent ? '#feb2b2' : '#e2e8f0'}`,
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    fontSize: '1rem',
                                    backgroundColor: selectedBranch === '전체' ? '#f7fafc' : 'white',
                                    cursor: selectedBranch === '전체' ? 'not-allowed' : 'text'
                                }}
                            />
                            <div
                                onClick={() => setIsUrgent(!isUrgent)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    borderRadius: '20px',
                                    background: isUrgent ? '#c53030' : '#edf2f7',
                                    color: isUrgent ? 'white' : '#718096',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    userSelect: 'none'
                                }}
                            >
                                <AlertCircle size={14} />
                                긴급
                            </div>
                        </div>
                        <button
                            onClick={handleAddTodo}
                            disabled={selectedBranch === '전체'}
                            style={{
                                padding: '0 16px',
                                borderRadius: '12px',
                                background: selectedBranch === '전체' ? '#cbd5e0' : 'var(--color-primary)',
                                color: 'white',
                                border: 'none',
                                cursor: selectedBranch === '전체' ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Plus size={24} />
                        </button>
                    </div>

                    {/* Task List */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '20px' }}>로딩중...</div>
                        ) : sortedTasks.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '20px' }}>
                                {selectedBranch === '전체' ? '등록된 업무가 없습니다.' : `${selectedBranch}의 업무가 없습니다.`}
                            </div>
                        ) : (
                            sortedTasks.map(task => {
                                const style = getTaskStyle(task);
                                const isCompleted = task.status === 'completed';
                                const canModify = canUserModify(task);
                                const isEditing = editingTask?.id === task.id && editingTask?.type === task.type;

                                return (
                                    <div
                                        key={`${task.type}-${task.id}`}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            padding: '8px 10px',
                                            borderRadius: '12px',
                                            border: `1px solid ${style.borderColor}`,
                                            backgroundColor: style.bg,
                                            transition: 'all 0.2s',
                                            gap: '8px'
                                        }}
                                    >
                                        {/* Checkbox */}
                                        <div
                                            onClick={() => handleToggleComplete(task)}
                                            style={{
                                                minWidth: '20px',
                                                height: '20px',
                                                borderRadius: '5px',
                                                border: `2px solid ${isCompleted ? '#cbd5e0' : style.text}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                flexShrink: 0,
                                                backgroundColor: isCompleted ? '#cbd5e0' : 'white'
                                            }}
                                        >
                                            {isCompleted && <Check size={12} color="white" />}
                                        </div>

                                        {/* Content - flexible width, wraps when needed */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {isEditing ? (
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <input
                                                        type="text"
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        autoFocus
                                                        style={{
                                                            flex: 1,
                                                            minWidth: '150px',
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #cbd5e0',
                                                            fontSize: '0.9rem'
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleEdit(task);
                                                            if (e.key === 'Escape') { setEditingTask(null); setEditContent(''); }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleEdit(task)}
                                                        style={{ padding: '3px 8px', borderRadius: '5px', background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >저장</button>
                                                    <button
                                                        onClick={() => { setEditingTask(null); setEditContent(''); }}
                                                        style={{ padding: '3px 8px', borderRadius: '5px', background: '#e2e8f0', color: '#4a5568', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >취소</button>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    fontSize: '0.9rem',
                                                    color: isCompleted ? '#718096' : '#2d3748',
                                                    textDecoration: isCompleted ? 'line-through' : 'none',
                                                    wordBreak: 'break-word',
                                                    lineHeight: '1.4'
                                                }}>
                                                    {task.content}
                                                </div>
                                            )}
                                        </div>

                                        {/* Right side: Author + Action Buttons */}
                                        {!isEditing && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                flexShrink: 0,
                                                marginLeft: 'auto'
                                            }}>
                                                {/* Author Info */}
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    color: isCompleted ? '#a0aec0' : style.text,
                                                    opacity: 0.8,
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {task.type === 'suggestion' ? `요청:${task.authorName}` : `작성:${task.authorName}`}
                                                    {task.completerName && ` /완료:${task.completerName}`}
                                                </span>

                                                {/* Action Buttons */}
                                                {canModify && (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); startEdit(task); }}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: isCompleted ? '#a0aec0' : '#3182ce',
                                                                cursor: 'pointer',
                                                                padding: '2px',
                                                                opacity: 0.6
                                                            }}
                                                            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                                                            onMouseOut={(e) => e.currentTarget.style.opacity = 0.6}
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(task); }}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: isCompleted ? '#a0aec0' : '#e53e3e',
                                                                cursor: 'pointer',
                                                                padding: '2px',
                                                                opacity: 0.6
                                                            }}
                                                            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                                                            onMouseOut={(e) => e.currentTarget.style.opacity = 0.6}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            ) : (
                <StaffWorkSchedule
                    branch={selectedBranch}
                    isAdmin={user.role === 'admin' || user.role === 'manager'}
                />
            )}
        </div>
    );
};

// --- Sub-Components ---

const StaffWorkSchedule = ({ branch, isAdmin }) => {
    const [schedules, setSchedules] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const fetchData = async () => {
        if (branch === '전체') return;
        setLoading(true);
        try {
            // 1. Fetch Staff List for this branch
            const { data: staffData, error: staffError } = await supabase
                .from('branch_staff_names')
                .select('staff_name')
                .eq('branch', branch)
                .order('staff_name', { ascending: true });

            if (staffError) throw staffError;
            setStaffList(staffData?.map(s => s.staff_name) || []);

            // 2. Fetch Weekly Schedule
            const { data: scheduleData, error: scheduleError } = await supabase
                .from('staff_schedules')
                .select('*')
                .eq('branch', branch);

            if (scheduleError) throw scheduleError;
            setSchedules(scheduleData || []);
        } catch (err) {
            console.error('Error fetching schedule:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [branch]);

    const handleUpdateAssignment = async (day, shift, role, name) => {
        if (!isAdmin) return;
        try {
            const { error } = await supabase
                .from('staff_schedules')
                .upsert({
                    branch,
                    day_of_week: day,
                    shift,
                    role,
                    staff_name: name,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'branch,day_of_week,shift,role' });

            if (error) throw error;
            fetchData();
        } catch (err) {
            alert('배정 저장 실패');
            console.error(err);
        }
    };

    const days = ['월', '화', '수', '목', '금', '토', '일'];
    const shifts = [
        { key: 'morning', label: '오전', roles: [{ key: 'dish', label: '설거지' }, { key: 'sub', label: '서브' }] },
        { key: 'afternoon', label: '오후', roles: [{ key: 'dish', label: '설거지' }, { key: 'sub', label: '서브' }] }
    ];

    if (branch === '전체') {
        return <div style={{ textAlign: 'center', marginTop: '50px', color: '#718096' }}>지점을 선택하면 근무표를 볼 수 있습니다.</div>;
    }

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: '#edf2f7',
                        border: 'none',
                        color: '#4a5568',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                    }}
                >
                    <Settings size={16} />
                    근무표 설정
                </button>
            </div>

            <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '10px', borderBottom: '2px solid #edf2f7', borderRight: '1px solid #edf2f7' }}>시작</th>
                            <th style={{ padding: '10px', borderBottom: '2px solid #edf2f7', borderRight: '1px solid #edf2f7' }}>업무</th>
                            {days.map(d => (
                                <th key={d} style={{ padding: '10px', borderBottom: '2px solid #edf2f7', minWidth: '100px', backgroundColor: '#f8fafc' }}>{d}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {shifts.map((s, sIdx) => (
                            <React.Fragment key={s.key}>
                                {s.roles.map((r, rIdx) => (
                                    <tr key={`${s.key}-${r.key}`}>
                                        {rIdx === 0 && (
                                            <td rowSpan={2} style={{
                                                textAlign: 'center',
                                                fontWeight: 'bold',
                                                borderRight: '1px solid #edf2f7',
                                                borderBottom: sIdx === 0 ? '2px solid #edf2f7' : 'none',
                                                backgroundColor: '#f8fafc'
                                            }}>
                                                {s.label}
                                            </td>
                                        )}
                                        <td style={{
                                            textAlign: 'center',
                                            padding: '8px',
                                            borderRight: '1px solid #edf2f7',
                                            color: '#718096',
                                            borderBottom: rIdx === 0 ? '1px solid #f7fafc' : (sIdx === 0 ? '2px solid #edf2f7' : 'none')
                                        }}>
                                            {r.label}
                                        </td>
                                        {days.map((_, dIdx) => {
                                            const assignment = schedules.find(as => as.day_of_week === dIdx && as.shift === s.key && as.role === r.key);
                                            return (
                                                <td key={dIdx} style={{
                                                    padding: '5px',
                                                    borderBottom: rIdx === 0 ? '1px solid #f7fafc' : (sIdx === 0 ? '2px solid #edf2f7' : 'none')
                                                }}>
                                                    <select
                                                        disabled={!isAdmin}
                                                        value={assignment?.staff_name || '미지정'}
                                                        onChange={(e) => handleUpdateAssignment(dIdx, s.key, r.key, e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '6px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #e2e8f0',
                                                            fontSize: '0.85rem',
                                                            backgroundColor: assignment?.staff_name && assignment.staff_name !== '미지정' ? '#ebf8ff' : '#f8fafc',
                                                            color: assignment?.staff_name && assignment.staff_name !== '미지정' ? '#2b6cb0' : '#a0aec0',
                                                            cursor: isAdmin ? 'pointer' : 'default',
                                                            outline: 'none'
                                                        }}
                                                    >
                                                        <option value="미지정">미지정</option>
                                                        {staffList.map(name => (
                                                            <option key={name} value={name}>{name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {isSettingsOpen && (
                <ScheduleSettings
                    branch={branch}
                    onClose={() => { setIsSettingsOpen(false); fetchData(); }}
                />
            )}
        </div>
    );
};

const ScheduleSettings = ({ branch, onClose }) => {
    const [staffList, setStaffList] = useState([]);
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('branch_staff_names')
                .select('*')
                .eq('branch', branch)
                .order('staff_name', { ascending: true });
            if (error) throw error;
            setStaffList(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, [branch]);

    const handleAdd = async () => {
        if (!newName.trim()) return;
        try {
            const { error } = await supabase
                .from('branch_staff_names')
                .insert({ branch, staff_name: newName.trim() });
            if (error) {
                if (error.code === '23505') alert('이미 등록된 이름입니다.');
                else throw error;
            }
            setNewName('');
            fetchStaff();
        } catch (err) {
            console.error(err);
            alert('등록 실패');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('해당 스탭을 명단에서 삭제하시겠습니까? (기존 근무표 데이터는 유지됩니다)')) return;
        try {
            const { error } = await supabase
                .from('branch_staff_names')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchStaff();
        } catch (err) {
            console.error(err);
            alert('삭제 실패');
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px',
                display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>근무표 스탭 설정</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0' }}>✕</button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="스탭 이름"
                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <button
                        onClick={handleAdd}
                        style={{ padding: '10px 16px', borderRadius: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', fontWeight: 'bold' }}
                    >추가</button>
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#a0aec0' }}>로딩중...</div>
                    ) : staffList.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#a0aec0', padding: '20px' }}>등록된 스탭이 없습니다.</div>
                    ) : (
                        staffList.map(s => (
                            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                <span style={{ fontWeight: '500' }}>{s.staff_name}</span>
                                <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e' }}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <button
                    onClick={onClose}
                    style={{ padding: '12px', borderRadius: '12px', background: '#f7fafc', color: '#4a5568', border: '1px solid #e2e8f0', fontWeight: 'bold', cursor: 'pointer' }}
                >닫기</button>
            </div>
        </div>
    );
};

export default StaffTaskBoard;
