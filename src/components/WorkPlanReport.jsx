import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, CheckCircle, Circle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const WorkPlanReport = () => {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState('');
    const [loading, setLoading] = useState(false);

    // Helper to get the Monday of the current week
    const getMonday = (d) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        return new Date(date.setDate(diff));
    };

    const weekStart = getMonday(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    useEffect(() => {
        if (user) {
            fetchTasks();
        }
    }, [weekStartStr, user]);

    const fetchTasks = async () => {
        try {
            const { data, error } = await supabase
                .from('work_plans')
                .select('*')
                .eq('user_id', user.id)
                .eq('week_start_date', weekStartStr)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setTasks(data || []);
        } catch (err) {
            console.error('Error fetching tasks:', err);
        }
    };

    const handleAddTask = async () => {
        if (!newTask.trim()) return;
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('work_plans')
                .insert([
                    {
                        user_id: user.id,
                        content: newTask,
                        week_start_date: weekStartStr,
                        is_completed: false
                    }
                ])
                .select();

            if (error) throw error;

            setTasks([...tasks, data[0]]);
            setNewTask('');
        } catch (err) {
            console.error('Error adding task:', err);
            alert('할 일 추가에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTask = async (id) => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
            const { error } = await supabase
                .from('work_plans')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setTasks(tasks.filter(t => t.id !== id));
        } catch (err) {
            console.error('Error deleting task:', err);
        }
    };

    const toggleCompletion = async (task) => {
        try {
            const { error } = await supabase
                .from('work_plans')
                .update({ is_completed: !task.is_completed })
                .eq('id', task.id);

            if (error) throw error;

            setTasks(tasks.map(t =>
                t.id === task.id ? { ...t, is_completed: !t.is_completed } : t
            ));
        } catch (err) {
            console.error('Error updating task:', err);
        }
    };

    const handlePrevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            marginBottom: '20px'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-text-main)', margin: 0 }}>
                    📝 작업 계획 보고
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f7fafc', padding: '5px 10px', borderRadius: '8px' }}>
                    <button onClick={handlePrevWeek} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                        <ChevronLeft size={20} color="#4a5568" />
                    </button>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>
                        {weekStart.getMonth() + 1}.{weekStart.getDate()} ~ {weekEnd.getMonth() + 1}.{weekEnd.getDate()}
                    </span>
                    <button onClick={handleNextWeek} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                        <ChevronRight size={20} color="#4a5568" />
                    </button>
                </div>
            </div>

            {/* Task List */}
            <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tasks.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#a0aec0', padding: '20px', fontSize: '0.9rem' }}>
                        등록된 작업 계획이 없습니다.
                    </div>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            transition: 'all 0.2s'
                        }}>
                            <button
                                onClick={() => toggleCompletion(task)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                            >
                                {task.is_completed ?
                                    <CheckCircle size={20} color="#48bb78" /> :
                                    <Circle size={20} color="#cbd5e0" />
                                }
                            </button>
                            <span style={{
                                flex: 1,
                                fontSize: '1rem',
                                color: task.is_completed ? '#a0aec0' : '#2d3748',
                                textDecoration: task.is_completed ? 'line-through' : 'none'
                            }}>
                                {task.content}
                            </span>
                            <button
                                onClick={() => handleDeleteTask(task.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#fc8181' }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Add Task Input */}
            <div style={{ display: 'flex', gap: '10px' }}>
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
                    disabled={loading || !newTask.trim()}
                    style={{
                        background: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        width: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    <Plus size={24} />
                </button>
            </div>
        </div>
    );
};

export default WorkPlanReport;
