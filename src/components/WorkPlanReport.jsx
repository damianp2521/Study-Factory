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
            {/* Header / Date Navigation */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#f7fafc', padding: '8px 15px', borderRadius: '20px' }}>
                    <button onClick={handlePrevWeek} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                        <ChevronLeft size={20} color="#4a5568" />
                    </button>
                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2d3748' }}>
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

            {/* Scale/Report Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                    onClick={async () => {
                        if (!confirm('현재 작성된 내용을 [작업 계획]으로 보고하시겠습니까?\n보고 후 내용을 수정해도 [계획 보고] 내용은 변하지 않습니다.')) return;

                        setLoading(true);
                        try {
                            const { error } = await supabase
                                .from('weekly_reports')
                                .upsert({
                                    user_id: user.id,
                                    week_start_date: weekStartStr,
                                    plan_snapshot: tasks, // Snapshot current tasks
                                    plan_reported_at: new Date().toISOString()
                                }, { onConflict: 'user_id, week_start_date' });

                            if (error) throw error;
                            alert('작업 계획 보고가 완료되었습니다!');
                        } catch (err) {
                            console.error('Plan report failed:', err);
                            alert('보고에 실패했습니다.');
                        } finally {
                            setLoading(false);
                        }
                    }}
                    style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: '#edf2f7',
                        color: '#2d3748',
                        border: 'none',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                >
                    계획 보고
                </button>
                <button
                    onClick={async () => {
                        if (!confirm('현재 작성된 내용을 [작업 결과]로 보고하시겠습니까?\n완료 여부와 최종 수정 내용이 저장됩니다.')) return;

                        setLoading(true);
                        try {
                            const { error } = await supabase
                                .from('weekly_reports')
                                .upsert({
                                    user_id: user.id,
                                    week_start_date: weekStartStr,
                                    result_snapshot: tasks, // Snapshot current tasks
                                    result_reported_at: new Date().toISOString()
                                }, { onConflict: 'user_id, week_start_date' });

                            if (error) throw error;
                            alert('작업 결과 보고가 완료되었습니다!');
                        } catch (err) {
                            console.error('Result report failed:', err);
                            alert('보고에 실패했습니다.');
                        } finally {
                            setLoading(false);
                        }
                    }}
                    style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: '#edf2f7',
                        color: '#2d3748',
                        border: 'none',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                >
                    결과 보고
                </button>
            </div>
        </div>
    );
};

export default WorkPlanReport;
