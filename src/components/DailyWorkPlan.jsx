import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, CheckCircle, Circle, Trash2, Users, Lock, Unlock, Eye } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import SharedTodoModal from './SharedTodoModal';

const DailyWorkPlan = () => {
    const { user } = useAuth();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [todos, setTodos] = useState([]);
    const [monthStats, setMonthStats] = useState({}); // { '2024-01-01': { total: 5, completed: 3 } }
    const [newTask, setNewTask] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [showSharedModal, setShowSharedModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // Initial Fetch
    useEffect(() => {
        if (user) {
            fetchVisibility();
            fetchMonthStats(currentMonth);
            fetchTodos(selectedDate);
        }
    }, [user]);

    // Fetch stats when month changes
    useEffect(() => {
        if (user) {
            fetchMonthStats(currentMonth);
        }
    }, [currentMonth, user]);

    // Fetch todos when date changes
    useEffect(() => {
        if (user) {
            fetchTodos(selectedDate);
        }
    }, [selectedDate, user]);

    const fetchVisibility = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('is_public_todo')
                .eq('id', user.id)
                .single();
            if (data) setIsPublic(data.is_public_todo);
        } catch (error) {
            console.error('Error fetching visibility:', error);
        }
    };

    const toggleVisibility = async () => {
        try {
            const newValue = !isPublic;
            // Optimistic update
            setIsPublic(newValue);

            // Use RPC if RLS blocks direct update, or try direct update first
            const { error } = await supabase
                .from('profiles')
                .update({ is_public_todo: newValue })
                .eq('id', user.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error toggling visibility:', error);
            setIsPublic(!isPublic); // Revert
            alert('설정 변경에 실패했습니다.');
        }
    };

    const fetchMonthStats = async (monthDate) => {
        const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
        const end = format(endOfMonth(monthDate), 'yyyy-MM-dd');

        try {
            const { data, error } = await supabase
                .from('daily_todos')
                .select('date, is_completed')
                .eq('user_id', user.id)
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
                .eq('user_id', user.id)
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
        if (!newTask.trim()) return;
        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        try {
            const { data, error } = await supabase
                .from('daily_todos')
                .insert([{
                    user_id: user.id,
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
                            height: '70px',
                            borderTop: '1px solid #f7fafc',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            background: isSelected ? '#ebf8ff' : 'transparent',
                            color: !isCurrentMonth ? '#cbd5e0' : (isSelected ? '#3182ce' : '#2d3748'),
                            position: 'relative',
                            paddingTop: '5px',
                            borderRadius: '8px'
                        }}
                    >
                        <span style={{ fontSize: '0.9rem', fontWeight: isSelected ? 'bold' : 'normal' }}>
                            {formattedDate}
                        </span>

                        {/* Stats */}
                        {stat && stat.total > 0 && (
                            <div style={{ marginTop: 'auto', marginBottom: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                <span style={{ fontSize: '0.7rem', color: '#48bb78', fontWeight: 'bold' }}>{stat.completed}</span>
                                <span style={{ fontSize: '0.7rem', color: '#a0aec0' }}>/ {stat.total}</span>
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
            minHeight: '600px', // Ensure height
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Top Bar handles */}
            {/* Top Bar handles */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
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
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: isPublic ? '#e6fffa' : '#edf2f7',
                        border: '1px solid', borderColor: isPublic ? '#38b2ac' : 'transparent',
                        padding: '8px 12px', borderRadius: '20px',
                        color: isPublic ? '#319795' : '#718096', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer'
                    }}>
                    {isPublic ? <Unlock size={16} /> : <Lock size={16} />}
                    <span>{isPublic ? '내 투두 공개중' : '비공개'}</span>
                </button>
            </div>

            {/* To-Do List (Now on Top) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2d3748', margin: 0 }}>
                        {format(selectedDate, 'M월 d일')} 계획
                    </h3>
                    <div style={{ fontSize: '0.9rem', color: '#718096' }}>
                        <span style={{ color: '#48bb78', fontWeight: 'bold' }}>{todayStats.completed}</span>
                        <span style={{ margin: '0 4px' }}>/</span>
                        <span>{todayStats.total}</span>
                        <span style={{ marginLeft: '8px', fontSize: '0.8rem', background: '#f7fafc', padding: '2px 6px', borderRadius: '4px' }}>
                            {completionRate}%
                        </span>
                    </div>
                </div>

                {/* Input */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <input
                        type="text"
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                        placeholder="할 일을 입력하세요..."
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '1rem',
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
                            width: '45px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: newTask.trim() ? 'pointer' : 'default',
                            opacity: newTask.trim() ? 1 : 0.5
                        }}
                    >
                        <Plus size={24} />
                    </button>
                </div>

                {/* List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#a0aec0', padding: '20px' }}>로딩 중...</div>
                    ) : todos.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#cbd5e0', padding: '20px', fontSize: '0.9rem' }}>
                            등록된 할 일이 없습니다.
                        </div>
                    ) : (
                        todos.map(todo => (
                            <div key={todo.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                background: '#f8fafc',
                                borderRadius: '10px',
                                transition: 'all 0.2s',
                                borderLeft: todo.is_completed ? '4px solid #48bb78' : '4px solid #cbd5e0'
                            }}>
                                <button
                                    onClick={() => toggleTodo(todo)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}
                                >
                                    {todo.is_completed ?
                                        <CheckCircle size={22} color="#48bb78" fill="#e6fffa" /> :
                                        <Circle size={22} color="#cbd5e0" />
                                    }
                                </button>
                                <span style={{
                                    flex: 1,
                                    fontSize: '1rem',
                                    color: todo.is_completed ? '#a0aec0' : '#2d3748',
                                    textDecoration: todo.is_completed ? 'line-through' : 'none',
                                    wordBreak: 'break-all'
                                }}>
                                    {todo.content}
                                </span>
                                <button
                                    onClick={() => deleteTodo(todo.id, todo.date, todo.is_completed)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#fc8181', display: 'flex' }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Calendar (Now on Bottom) */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                {renderHeader()}
                {renderDays()}
                {renderCells()}
            </div>

            {/* Modal */}
            {showSharedModal && (
                <SharedTodoModal onClose={() => setShowSharedModal(false)} />
            )}
        </div>
    );
};

export default DailyWorkPlan;
