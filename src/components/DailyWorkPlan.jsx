import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO, isBefore, startOfToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, CheckCircle, Circle, Trash2, Users, Lock, Unlock, Eye } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import SharedTodoModal from './SharedTodoModal';

const DailyWorkPlan = ({ targetUserId = null, isReadOnly = false, targetUserName = null }) => {
    const { user } = useAuth();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [todos, setTodos] = useState([]);
    const [monthStats, setMonthStats] = useState({}); // { '2024-01-01': { total: 5, completed: 3 } }
    const [newTask, setNewTask] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [showSharedModal, setShowSharedModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // If targetUserId is provided (viewing others), use it. Otherwise use logged-in user.
    const effectiveUserId = targetUserId || user?.id;

    // Initial Fetch
    useEffect(() => {
        if (effectiveUserId) {
            // Only fetch visibility if it's my own plan
            if (!isReadOnly) {
                fetchVisibility();
                checkDailyRollover();
            }
            fetchMonthStats(currentMonth);
            fetchTodos(selectedDate);
        }
    }, [effectiveUserId]);

    // Fetch stats when month changes
    useEffect(() => {
        if (effectiveUserId) {
            fetchMonthStats(currentMonth);
        }
    }, [currentMonth, effectiveUserId]);

    // Fetch todos when date changes
    useEffect(() => {
        if (effectiveUserId) {
            fetchTodos(selectedDate);
        }
    }, [selectedDate, effectiveUserId]);

    const fetchVisibility = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('is_public_todo')
                .eq('id', effectiveUserId)
                .single();
            if (data) setIsPublic(data.is_public_todo);
        } catch (error) {
            console.error('Error fetching visibility:', error);
        }
    };

    const toggleVisibility = async () => {
        if (isReadOnly) return; // Guard
        try {
            const newValue = !isPublic;
            // Optimistic update
            setIsPublic(newValue);

            // Use RPC if RLS blocks direct update, or try direct update first
            const { error } = await supabase
                .from('profiles')
                .update({ is_public_todo: newValue })
                .eq('id', effectiveUserId);

            if (error) throw error;
        } catch (error) {
            console.error('Error toggling visibility:', error);
            setIsPublic(!isPublic); // Revert
            alert('설정 변경에 실패했습니다.');
        }
    };

    const checkDailyRollover = async () => {
        try {
            const { data, error } = await supabase.rpc('perform_daily_rollover', {
                target_user_id: effectiveUserId
            });
            if (error) console.error('Rollover check failed:', error);
            else if (data?.count > 0) {
                console.log('Rollover performed:', data);
                // Refresh stats and todos if needed (though useEffect handles fetchTodos on selectedDate change, 
                // and fetchMonthStats on mount. We might want to re-fetch if today was affected)
                fetchMonthStats(currentMonth);
                if (isSameDay(selectedDate, new Date())) {
                    fetchTodos(selectedDate);
                }
            }
        } catch (e) {
            console.error('Rollover exception:', e);
        }
    };

    const fetchMonthStats = async (monthDate) => {
        const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
        const end = format(endOfMonth(monthDate), 'yyyy-MM-dd');

        try {
            const { data, error } = await supabase
                .from('daily_todos')
                .select('date, is_completed')
                .eq('user_id', effectiveUserId)
                .gte('date', start)
                .lte('date', end);

            if (error) throw error;

            const stats = {};
            data.forEach(item => {
                const dateKey = item.date;
                if (!stats[dateKey]) stats[dateKey] = { total: 0, completed: 0 };
                stats[dateKey].total += 1;
                if (item.is_completed) stats[dateKey].completed += 1;
            });
            setMonthStats(stats);
        } catch (error) {
            console.error('Error fetching month stats:', error);
        }
    };

    const fetchTodos = async (date) => {
        setLoading(true);
        const dateStr = format(date, 'yyyy-MM-dd');
        try {
            const { data, error } = await supabase
                .from('daily_todos')
                .select('*')
                .eq('user_id', effectiveUserId)
                .eq('date', dateStr)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setTodos(data || []);
        } catch (error) {
            console.error('Error fetching todos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTask = async () => {
        // Prevent editing past dates (Strictly Date comparison)
        if (isBefore(selectedDate, startOfToday())) {
            alert('지난 날짜의 계획은 수정할 수 없습니다.');
            return;
        }
        if (isReadOnly || !newTask.trim()) return;
        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        try {
            const { data, error } = await supabase
                .from('daily_todos')
                .insert([{
                    user_id: effectiveUserId,
                    content: newTask,
                    date: dateStr,
                    is_completed: false
                }])
                .select()
                .single();

            if (error) throw error;

            setTodos([...todos, data]);
            setNewTask('');

            // Update stats locally
            setMonthStats(prev => ({
                ...prev,
                [dateStr]: {
                    total: (prev[dateStr]?.total || 0) + 1,
                    completed: (prev[dateStr]?.completed || 0)
                }
            }));
        } catch (error) {
            console.error('Error adding task:', error);
            alert('추가 실패');
        }
    };

    const toggleTodo = async (todo) => {
        // Prevent editing past dates
        if (isBefore(parseISO(todo.date), startOfToday())) return;
        if (isReadOnly) return; // Prevent toggling in read-only mode

        try {
            const newCompleted = !todo.is_completed;
            const completedAt = newCompleted ? new Date().toISOString() : null;
            const dateStr = todo.date;

            // Optimistic update
            setTodos(todos.map(t => t.id === todo.id ? { ...t, is_completed: newCompleted, completed_at: completedAt } : t));
            setMonthStats(prev => ({
                ...prev,
                [dateStr]: {
                    total: prev[dateStr]?.total || 0,
                    completed: (prev[dateStr]?.completed || 0) + (newCompleted ? 1 : -1)
                }
            }));

            const { error } = await supabase
                .from('daily_todos')
                .update({ is_completed: newCompleted, completed_at: completedAt })
                .eq('id', todo.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error toggling todo:', error);
            fetchTodos(selectedDate); // Revert on error
            fetchMonthStats(currentMonth);
        }
    };

    const deleteTodo = async (id, dateStr, isCompleted) => {
        // Allow deleting copied/failed tasks? User said "completed ones... failed ones copied... delete copied".
        // Use general rule: If it's today or future, allow. If past, disallow.
        const targetDate = parseISO(dateStr);
        if (isBefore(targetDate, startOfToday())) {
            alert('지난 날짜의 기록은 삭제할 수 없습니다.');
            return;
        }

        if (isReadOnly) return;
        if (!confirm('삭제하시겠습니까?')) return;
        try {
            const { error } = await supabase
                .from('daily_todos')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setTodos(todos.filter(t => t.id !== id));

            // Update stats locally
            setMonthStats(prev => {
                const current = prev[dateStr];
                if (!current) return prev;
                return {
                    ...prev,
                    [dateStr]: {
                        total: Math.max(0, current.total - 1),
                        completed: Math.max(0, current.completed - (isCompleted ? 1 : 0))
                    }
                };
            });
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
    };

    // Calendar Render Helpers
    const renderHeader = () => {
        return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <ChevronLeft size={24} color="#4a5568" />
                </button>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2d3748' }}>
                    {format(currentMonth, 'yyyy년 M월')}
                </span>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <ChevronRight size={24} color="#4a5568" />
                </button>
            </div>
        );
    };

    const renderDays = () => {
        const dateFormat = "E";
        const days = [];
        let startDate = startOfWeek(currentMonth, { weekStartsOn: 0 }); // Sunday start

        for (let i = 0; i < 7; i++) {
            days.push(
                <div key={i} style={{ textAlign: 'center', fontWeight: 'bold', color: '#a0aec0', fontSize: '0.8rem', paddingBottom: '10px' }}>
                    {format(addDays(startDate, i), dateFormat, { locale: ko })}
                </div>
            );
        }
        return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '5px' }}>{days}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

        const dateFormat = "d";
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, dateFormat);
                const cloneDay = day;
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const dateKey = format(day, 'yyyy-MM-dd');
                const stat = monthStats[dateKey];

                days.push(
                    <div
                        key={day}
                        onClick={() => setSelectedDate(cloneDay)}
                        style={{
                            minHeight: '60px', // Narrower height (was 70px fixed)
                            height: 'auto',
                            borderTop: '1px solid transparent', // Remove top border or make transparent
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            background: isSelected ? 'var(--color-primary)' : 'transparent', // Selected fills cell
                            color: !isCurrentMonth ? '#cbd5e0' : (isSelected ? 'white' : '#2d3748'),
                            position: 'relative',
                            padding: '6px 4px',
                            gap: '4px',
                            borderRadius: '12px', // Rounded
                            transition: 'all 0.2s',
                            border: isSelected ? 'none' : '1px solid transparent' // Placeholder for alignment
                        }}
                    >
                        <span style={{ fontSize: '0.9rem', fontWeight: isSelected ? 'bold' : 'normal', lineHeight: 1 }}>
                            {formattedDate}
                        </span>

                        {/* Stats Pill */}
                        {stat && stat.total > 0 && (
                            <div style={{
                                marginTop: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                background: isSelected ? 'rgba(255,255,255,0.2)' : 'white',
                                borderRadius: '12px',
                                padding: '3px 8px',
                                width: '100%',
                                border: isSelected ? '1px solid rgba(255,255,255,0.3)' : '1px solid #e2e8f0',
                                boxShadow: isSelected ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
                                fontSize: '0.7rem'
                            }}>
                                {isBefore(cloneDay, startOfToday()) ? (
                                    // Past: Show Percentage
                                    <span style={{
                                        color: isSelected ? 'white' : '#a0aec0',
                                        fontWeight: 'bold'
                                    }}>
                                        {Math.round((stat.completed / stat.total) * 100)}%
                                    </span>
                                ) : (
                                    // Future/Today: Show Count
                                    <>
                                        <span style={{ color: isSelected ? 'white' : '#48bb78', fontWeight: 'bold' }}>{stat.completed}</span>
                                        <span style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : '#a0aec0', fontWeight: 'normal' }}> / {stat.total}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div key={day} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div>{rows}</div>;
    };

    // Calculate Completion Raito
    const todayStats = monthStats[format(selectedDate, 'yyyy-MM-dd')] || { total: 0, completed: 0 };
    const completionRate = todayStats.total > 0 ? Math.round((todayStats.completed / todayStats.total) * 100) : 0;

    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            height: '100%', // Fixed height matching parent
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden' // Main container no scroll
        }}>
            {/* Top Bar handles - Fixed */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexShrink: 0 }}>
                {isReadOnly ? (
                    // Read Only Header: Just the name
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2d3748' }}>
                        {targetUserName ? `${targetUserName}님의 작업계획` : '회원님의 작업계획'}
                    </div>
                ) : (
                    // My Work Plan Header: View Others + Toggle
                    <>
                        <button
                            onClick={() => setShowSharedModal(true)}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: '#edf2f7', border: 'none', padding: '10px', borderRadius: '50%', // Circle/Icon only
                                color: '#4a5568', cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}
                            title="다른 회원 보기"
                        >
                            <Users size={20} />
                        </button>

                        <button
                            onClick={toggleVisibility}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                background: isPublic ? '#e6fffa' : '#edf2f7',
                                border: '1px solid', borderColor: isPublic ? '#38b2ac' : 'transparent',
                                padding: '4px 10px', borderRadius: '15px',
                                color: isPublic ? '#319795' : '#718096', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer',
                                height: 'fit-content'
                            }}>
                            {isPublic ? <Unlock size={14} /> : <Lock size={14} />}
                            <span>{isPublic ? '공개중' : '비공개'}</span>
                        </button>
                    </>
                )}
            </div>

            <div style={{
                flex: 1,
                overflowY: 'auto',
                paddingRight: '2px',
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none',  // IE/Edge
            }}>
                <style>{`
                    div::-webkit-scrollbar { display: none; }
                `}</style>

                {/* Calendar (Moved to Top) */}
                <div style={{ marginBottom: '20px' }}>
                    {renderHeader()}
                    {renderDays()}
                    {renderCells()}
                </div>

                <div style={{ height: '1px', background: '#edf2f7', marginBottom: '20px' }}></div>

                {/* To-Do List Section */}
                <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748', margin: 0 }}>
                            {format(selectedDate, 'M월 d일')} 계획
                        </h3>
                        <div style={{ fontSize: '0.85rem', color: '#718096' }}>
                            <span style={{ color: '#48bb78', fontWeight: 'bold' }}>{todayStats.completed}</span>
                            <span style={{ margin: '0 4px' }}>/</span>
                            <span>{todayStats.total}</span>
                            <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: '#f7fafc', padding: '2px 6px', borderRadius: '4px' }}>
                                {completionRate}%
                            </span>
                        </div>
                    </div>

                    {/* Input - Hide if Read Only OR Past Date */}
                    {!isReadOnly && !isBefore(selectedDate, startOfToday()) && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                            <input
                                type="text"
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                                placeholder="할 일을 입력하세요..."
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '0.9rem',
                                    outline: 'none'
                                }}
                            />
                            <button
                                onClick={handleAddTask}
                                disabled={!newTask.trim()}
                                style={{
                                    background: 'var(--color-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    width: '40px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: newTask.trim() ? 'pointer' : 'default',
                                    opacity: newTask.trim() ? 1 : 0.5
                                }}
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    )}

                    {/* List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', color: '#a0aec0', padding: '15px' }}>로딩 중...</div>
                        ) : todos.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#cbd5e0', padding: '15px', fontSize: '0.85rem' }}>
                                등록된 할 일이 없습니다.
                            </div>
                        ) : (
                            todos.map(todo => (
                                <div key={todo.id} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: '10px',
                                    background: '#f8fafc',
                                    borderRadius: '8px',
                                    transition: 'all 0.2s',
                                    borderLeft: todo.is_completed ? '3px solid #48bb78' : '3px solid #cbd5e0',
                                    opacity: isBefore(parseISO(todo.date), startOfToday()) ? 0.8 : 1 // Slight fade for past items
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <button
                                            onClick={() => toggleTodo(todo)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: (isReadOnly || isBefore(parseISO(todo.date), startOfToday())) ? 'default' : 'pointer',
                                                padding: 0,
                                                display: 'flex',
                                                flexShrink: 0
                                            }}
                                            disabled={isReadOnly || isBefore(parseISO(todo.date), startOfToday())}
                                        >
                                            {todo.is_completed ?
                                                <CheckCircle size={18} color="#48bb78" fill="#e6fffa" /> :
                                                <Circle size={18} color="#cbd5e0" />
                                            }
                                        </button>
                                        <span style={{
                                            flex: 1,
                                            fontSize: '0.9rem',
                                            color: todo.is_completed ? '#a0aec0' : '#2d3748',
                                            textDecoration: todo.is_completed ? 'line-through' : 'none',
                                            wordBreak: 'break-all'
                                        }}>
                                            {todo.content}
                                        </span>
                                        {!isReadOnly && !isBefore(parseISO(todo.date), startOfToday()) && (
                                            <button
                                                onClick={() => deleteTodo(todo.id, todo.date, todo.is_completed)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#fc8181', display: 'flex' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px', fontSize: '0.65rem', color: '#cbd5e0', marginTop: '2px', paddingRight: '2px' }}>
                                        <span>생성: {todo.created_at ? format(new Date(todo.created_at), 'yy.MM.dd(eee) HH:mm', { locale: ko }) : ''}</span>
                                        {todo.completed_at && <span>완료: {format(new Date(todo.completed_at), 'yy.MM.dd(eee) HH:mm', { locale: ko })}</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modal - Only render if not in read only mode (prevent recursion) */}
            {!isReadOnly && showSharedModal && (
                <SharedTodoModal onClose={() => setShowSharedModal(false)} />
            )}
        </div>
    );
};

export default DailyWorkPlan;
