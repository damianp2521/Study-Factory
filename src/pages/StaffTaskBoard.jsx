import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Plus, Check, Trash2, AlertCircle, MessageCircle } from 'lucide-react';

const StaffTaskBoard = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTodo, setNewTodo] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Staff Todos
            const { data: todos, error: todoError } = await supabase
                .from('staff_todos')
                .select(`
                    *,
                    author:created_by ( name ),
                    completer:completed_by ( name )
                `);

            if (todoError) throw todoError;

            // 2. Fetch Member Suggestions
            const { data: suggestions, error: suggestionError } = await supabase
                .from('suggestions')
                .select(`
                    *,
                    author:user_id ( name ),
                    completer:completed_by ( name )
                `);

            if (suggestionError) throw suggestionError;

            // 3. Merge & Format
            const formattedTodos = (todos || []).map(t => ({
                ...t,
                type: 'staff',
                authorName: t.author?.name || '알수없음',
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
        if (!newTodo.trim()) return;
        try {
            const { error } = await supabase
                .from('staff_todos')
                .insert([{
                    content: newTodo,
                    is_urgent: isUrgent,
                    created_by: user.id
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

    // Sorting
    const sortedTasks = [...tasks].sort((a, b) => {
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

    // Check Delete Permission Helper
    const canUserDelete = (task) => {
        const isAdmin = user.role === 'admin' || user.role === 'manager';
        if (isAdmin) return true;

        // Staff can only delete their own pending tasks
        if (task.type === 'staff' && task.status === 'pending' && task.created_by === user.id) {
            return true;
        }
        return false;
    };

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Add Todo Input */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <input
                        type="text"
                        value={newTodo}
                        onChange={(e) => setNewTodo(e.target.value)}
                        placeholder="할 일을 입력하세요..."
                        style={{
                            width: '100%',
                            padding: '12px 15px',
                            paddingRight: '80px',
                            borderRadius: '12px',
                            border: `2px solid ${isUrgent ? '#feb2b2' : '#e2e8f0'}`,
                            outline: 'none',
                            transition: 'all 0.2s',
                            fontSize: '1rem'
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
                    style={{
                        padding: '0 16px',
                        borderRadius: '12px',
                        background: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
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
                    <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '20px' }}>등록된 업무가 없습니다.</div>
                ) : (
                    sortedTasks.map(task => {
                        const style = getTaskStyle(task);
                        const isCompleted = task.status === 'completed';
                        const showDelete = canUserDelete(task);

                        return (
                            <div
                                key={`${task.type}-${task.id}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    padding: '15px',
                                    borderRadius: '12px',
                                    border: `1px solid ${style.borderColor}`,
                                    backgroundColor: style.bg,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {/* Checkbox */}
                                <div
                                    onClick={() => handleToggleComplete(task)}
                                    style={{
                                        minWidth: '24px',
                                        height: '24px',
                                        borderRadius: '6px',
                                        border: `2px solid ${isCompleted ? '#cbd5e0' : style.text}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        marginRight: '12px',
                                        marginTop: '2px', // Align with text top
                                        backgroundColor: isCompleted ? '#cbd5e0' : 'white'
                                    }}
                                >
                                    {isCompleted && <Check size={16} color="white" />}
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: '1rem',
                                        color: isCompleted ? '#718096' : '#2d3748', // Darker gray for completed text
                                        textDecoration: isCompleted ? 'line-through' : 'none',
                                        wordBreak: 'break-all',
                                        lineHeight: '1.5',
                                        marginBottom: '6px'
                                    }}>
                                        {task.content}
                                    </div>

                                    {/* Footer Info */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '0.75rem',
                                        color: isCompleted ? '#718096' : style.text, // Darker gray for completed footer
                                        opacity: isCompleted ? 0.8 : 0.8
                                    }}>
                                        {task.type === 'suggestion' ? (
                                            <span>요청 : {task.authorName} {task.completerName && `/ 완료 : ${task.completerName}`}</span>
                                        ) : (
                                            <span>작성 : {task.authorName} {task.completerName && `/ 완료 : ${task.completerName}`}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Delete Button - Conditionally Rendered */}
                                {showDelete && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(task); }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: isCompleted ? '#cbd5e0' : '#e53e3e',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            marginLeft: '8px',
                                            opacity: 0.5
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                                        onMouseOut={(e) => e.currentTarget.style.opacity = 0.5}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default StaffTaskBoard;
