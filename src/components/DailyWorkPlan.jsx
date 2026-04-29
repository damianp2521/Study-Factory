import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    addDays,
    addMonths,
    endOfMonth,
    endOfWeek,
    format,
    startOfMonth,
    startOfWeek,
    subMonths
} from 'date-fns';
import { ko } from 'date-fns/locale';
import {
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Circle,
    Pencil,
    Plus,
    Save,
    Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const getWeekStart = (date) => startOfWeek(date, { weekStartsOn: 1 });

const DailyWorkPlan = () => {
    const { user } = useAuth();

    const [selectedWeekStart, setSelectedWeekStart] = useState(getWeekStart(new Date()));
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const [currentPlan, setCurrentPlan] = useState(null);
    const [todos, setTodos] = useState([]);
    const [newTask, setNewTask] = useState('');
    const [editingTodoId, setEditingTodoId] = useState(null);
    const [editingText, setEditingText] = useState('');

    const [weekCards, setWeekCards] = useState([]);
    const [loadingWeek, setLoadingWeek] = useState(false);
    const [loadingMonth, setLoadingMonth] = useState(false);
    const [submittingReport, setSubmittingReport] = useState(false);

    const selectedWeekEnd = useMemo(() => addDays(selectedWeekStart, 6), [selectedWeekStart]);

    const activeStats = useMemo(() => {
        const activeTodos = todos.filter((todo) => !todo.deleted_at);
        const total = activeTodos.length;
        const completed = activeTodos.filter((todo) => todo.is_completed).length;
        return {
            total,
            completed,
            percent: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }, [todos]);

    const recordActivity = async ({
        planId,
        targetUserId,
        todoId = null,
        actionType,
        detail,
        beforeData = {},
        afterData = {}
    }) => {
        if (!planId || !targetUserId || !user?.id) return;

        try {
            await supabase
                .from('weekly_work_plan_activity_logs')
                .insert([{
                    plan_id: planId,
                    todo_id: todoId,
                    user_id: targetUserId,
                    actor_id: user.id,
                    action_type: actionType,
                    action_detail: detail,
                    before_data: beforeData,
                    after_data: afterData
                }]);
        } catch (error) {
            console.error('활동 이력 저장 실패:', error);
        }
    };

    const loadSelectedWeek = useCallback(async (createIfMissing = true) => {
        if (!user?.id) return null;

        setLoadingWeek(true);
        const weekStartStr = format(selectedWeekStart, 'yyyy-MM-dd');

        try {
            let { data: plan, error } = await supabase
                .from('weekly_work_plans')
                .select('*')
                .eq('user_id', user.id)
                .eq('week_start_date', weekStartStr)
                .maybeSingle();

            if (error) throw error;

            if (!plan && createIfMissing) {
                const { data: createdPlan, error: createError } = await supabase
                    .from('weekly_work_plans')
                    .insert([{
                        user_id: user.id,
                        week_start_date: weekStartStr,
                        report_status: 'draft'
                    }])
                    .select()
                    .single();

                if (createError) throw createError;
                plan = createdPlan;
            }

            if (!plan) {
                setCurrentPlan(null);
                setTodos([]);
                return null;
            }

            setCurrentPlan(plan);

            const { data: weekTodos, error: todosError } = await supabase
                .from('weekly_work_plan_todos')
                .select('*')
                .eq('plan_id', plan.id)
                .is('deleted_at', null)
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: true });

            if (todosError) throw todosError;
            setTodos(weekTodos || []);

            return plan;
        } catch (error) {
            console.error('주간 계획 불러오기 실패:', error);
            return null;
        } finally {
            setLoadingWeek(false);
        }
    }, [selectedWeekStart, user?.id]);

    const loadMonthSummaries = useCallback(async (monthDate) => {
        if (!user?.id) return;

        setLoadingMonth(true);

        const monthStartWeek = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
        const monthEndWeek = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });

        const startStr = format(monthStartWeek, 'yyyy-MM-dd');
        const endStr = format(monthEndWeek, 'yyyy-MM-dd');

        try {
            const { data: plans, error: plansError } = await supabase
                .from('weekly_work_plans')
                .select('id, week_start_date, report_status, reported_at, last_re_reported_at, admin_evaluation')
                .eq('user_id', user.id)
                .gte('week_start_date', startStr)
                .lte('week_start_date', endStr)
                .order('week_start_date', { ascending: true });

            if (plansError) throw plansError;

            const planList = plans || [];
            const planIds = planList.map((plan) => plan.id);

            const statsByPlanId = {};

            if (planIds.length > 0) {
                const { data: todosData, error: todosError } = await supabase
                    .from('weekly_work_plan_todos')
                    .select('plan_id, is_completed, deleted_at')
                    .in('plan_id', planIds)
                    .is('deleted_at', null);

                if (todosError) throw todosError;

                (todosData || []).forEach((todo) => {
                    if (!statsByPlanId[todo.plan_id]) {
                        statsByPlanId[todo.plan_id] = { total: 0, completed: 0 };
                    }
                    statsByPlanId[todo.plan_id].total += 1;
                    if (todo.is_completed) {
                        statsByPlanId[todo.plan_id].completed += 1;
                    }
                });
            }

            const planByWeek = {};
            planList.forEach((plan) => {
                planByWeek[plan.week_start_date] = plan;
            });

            const cards = [];
            let cursor = monthStartWeek;

            while (cursor <= monthEndWeek) {
                const weekKey = format(cursor, 'yyyy-MM-dd');
                const matchingPlan = planByWeek[weekKey];
                const planStats = matchingPlan ? (statsByPlanId[matchingPlan.id] || { total: 0, completed: 0 }) : { total: 0, completed: 0 };
                const completionRate = planStats.total > 0 ? Math.round((planStats.completed / planStats.total) * 100) : 0;

                cards.push({
                    weekKey,
                    weekStart: cursor,
                    weekEnd: addDays(cursor, 6),
                    reportStatus: matchingPlan?.report_status || 'draft',
                    evaluation: matchingPlan?.admin_evaluation || '',
                    total: planStats.total,
                    completed: planStats.completed,
                    completionRate
                });

                cursor = addDays(cursor, 7);
            }

            setWeekCards(cards);
        } catch (error) {
            console.error('월간 요약 불러오기 실패:', error);
            setWeekCards([]);
        } finally {
            setLoadingMonth(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;
        loadSelectedWeek(false);
    }, [loadSelectedWeek, user?.id]);

    useEffect(() => {
        if (!user?.id) return;
        loadMonthSummaries(currentMonth);
    }, [currentMonth, loadMonthSummaries, user?.id]);

    const handleAddTask = async () => {
        const content = newTask.trim();
        if (!content || !user?.id) return;

        try {
            let plan = currentPlan;
            if (!plan) {
                plan = await loadSelectedWeek(true);
            }
            if (!plan) {
                alert('주간 계획을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.');
                return;
            }

            const nextOrder = todos.length > 0
                ? Math.max(...todos.map((todo) => todo.display_order || 0)) + 1
                : 1;

            const { data, error } = await supabase
                .from('weekly_work_plan_todos')
                .insert([{
                    plan_id: plan.id,
                    content,
                    is_completed: false,
                    display_order: nextOrder
                }])
                .select()
                .single();

            if (error) throw error;

            setTodos((prev) => [...prev, data]);
            setNewTask('');

            recordActivity({
                planId: plan.id,
                targetUserId: plan.user_id,
                todoId: data.id,
                actionType: 'CREATE_TODO',
                detail: '투두를 생성했습니다.',
                afterData: { content: data.content }
            });

            loadMonthSummaries(currentMonth);
        } catch (error) {
            console.error('투두 추가 실패:', error);
            alert('투두 추가에 실패했습니다.');
        }
    };

    const handleToggleTodo = async (todo) => {
        if (!currentPlan) return;

        const nextCompleted = !todo.is_completed;
        const nextCompletedAt = nextCompleted ? new Date().toISOString() : null;

        try {
            const { error } = await supabase
                .from('weekly_work_plan_todos')
                .update({
                    is_completed: nextCompleted,
                    completed_at: nextCompletedAt
                })
                .eq('id', todo.id);

            if (error) throw error;

            setTodos((prev) => prev.map((item) => (
                item.id === todo.id
                    ? { ...item, is_completed: nextCompleted, completed_at: nextCompletedAt }
                    : item
            )));

            recordActivity({
                planId: currentPlan.id,
                targetUserId: currentPlan.user_id,
                todoId: todo.id,
                actionType: 'TOGGLE_TODO',
                detail: nextCompleted ? '투두를 완료 처리했습니다.' : '투두 완료를 해제했습니다.',
                beforeData: { is_completed: todo.is_completed },
                afterData: { is_completed: nextCompleted }
            });

            loadMonthSummaries(currentMonth);
        } catch (error) {
            console.error('투두 완료 상태 변경 실패:', error);
            alert('완료 상태 변경에 실패했습니다.');
        }
    };

    const handleDeleteTodo = async (todo) => {
        if (!currentPlan) return;
        if (!confirm('이 투두를 삭제할까요?')) return;

        try {
            const deletedAt = new Date().toISOString();

            const { error } = await supabase
                .from('weekly_work_plan_todos')
                .update({ deleted_at: deletedAt })
                .eq('id', todo.id);

            if (error) throw error;

            setTodos((prev) => prev.filter((item) => item.id !== todo.id));

            recordActivity({
                planId: currentPlan.id,
                targetUserId: currentPlan.user_id,
                todoId: todo.id,
                actionType: 'DELETE_TODO',
                detail: '투두를 삭제했습니다.',
                beforeData: { content: todo.content, is_completed: todo.is_completed }
            });

            loadMonthSummaries(currentMonth);
        } catch (error) {
            console.error('투두 삭제 실패:', error);
            alert('삭제에 실패했습니다.');
        }
    };

    const handleSaveTodoEdit = async (todo) => {
        if (!currentPlan) return;
        const nextContent = editingText.trim();

        if (!nextContent) {
            alert('투두 내용을 입력해 주세요.');
            return;
        }

        if (nextContent === todo.content) {
            setEditingTodoId(null);
            setEditingText('');
            return;
        }

        try {
            const { error } = await supabase
                .from('weekly_work_plan_todos')
                .update({ content: nextContent })
                .eq('id', todo.id);

            if (error) throw error;

            setTodos((prev) => prev.map((item) => (
                item.id === todo.id
                    ? { ...item, content: nextContent }
                    : item
            )));

            recordActivity({
                planId: currentPlan.id,
                targetUserId: currentPlan.user_id,
                todoId: todo.id,
                actionType: 'UPDATE_TODO',
                detail: '투두 내용을 수정했습니다.',
                beforeData: { content: todo.content },
                afterData: { content: nextContent }
            });

            setEditingTodoId(null);
            setEditingText('');
        } catch (error) {
            console.error('투두 수정 실패:', error);
            alert('수정에 실패했습니다.');
        }
    };

    const handleSubmitPlan = async (isRereport) => {
        if (!currentPlan) return;

        if (todos.length === 0) {
            alert('먼저 이번 주 작업예정을 작성해 주세요.');
            return;
        }

        if (isRereport && currentPlan.report_status === 'draft') {
            alert('먼저 [보고하기]로 최초 보고를 진행해 주세요.');
            return;
        }

        const confirmText = isRereport
            ? '현재 내용을 다시 보고할까요?'
            : '현재 내용을 이번 주 작업계획으로 보고할까요?';

        if (!confirm(confirmText)) return;

        setSubmittingReport(true);

        const nowIso = new Date().toISOString();
        const nextStatus = isRereport ? 're_reported' : 'reported';

        try {
            const updatePayload = isRereport
                ? {
                    report_status: nextStatus,
                    last_re_reported_at: nowIso
                }
                : {
                    report_status: nextStatus,
                    reported_at: nowIso
                };

            const { data, error } = await supabase
                .from('weekly_work_plans')
                .update(updatePayload)
                .eq('id', currentPlan.id)
                .select()
                .single();

            if (error) throw error;

            setCurrentPlan(data);

            recordActivity({
                planId: currentPlan.id,
                targetUserId: currentPlan.user_id,
                actionType: isRereport ? 'REREPORT' : 'REPORT',
                detail: isRereport ? '주간 계획을 다시 보고했습니다.' : '주간 계획을 보고했습니다.',
                afterData: { report_status: nextStatus }
            });

            alert(isRereport ? '다시보고가 완료되었습니다.' : '보고가 완료되었습니다.');
            await loadMonthSummaries(currentMonth);
        } catch (error) {
            console.error('보고 처리 실패:', error);
            alert('보고 처리에 실패했습니다.');
        } finally {
            setSubmittingReport(false);
        }
    };

    const renderWeekday = (date) => {
        const weekdayText = format(date, 'eee', { locale: ko });
        return (
            <span style={{ color: 'inherit' }}>
                ({weekdayText})
            </span>
        );
    };

    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            <div style={{
                flex: 1,
                overflowY: 'auto',
                paddingRight: '2px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}>
                <style>{`div::-webkit-scrollbar { display: none; }`}</style>

                {/* 1) Week Selector (Top) */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '8px 10px',
                    marginBottom: '14px'
                }}>
                    <button
                        onClick={() => setSelectedWeekStart((prev) => addDays(prev, -7))}
                        style={iconButtonStyle}
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div style={{
                        fontSize: '0.96rem',
                        fontWeight: '700',
                        color: '#2d3748',
                        textAlign: 'center'
                    }}>
                        <span>{format(selectedWeekStart, 'M월 d일')}</span>{renderWeekday(selectedWeekStart)} ~{' '}
                        <span>{format(selectedWeekEnd, 'd일')}</span>{renderWeekday(selectedWeekEnd)}
                    </div>

                    <button
                        onClick={() => setSelectedWeekStart((prev) => addDays(prev, 7))}
                        style={iconButtonStyle}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* 2) Weekly Todo Input + List */}
                <div style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '14px',
                    marginBottom: '14px'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                        gap: '10px'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#2d3748' }}>
                            이번 주 작업예정
                        </h3>
                        <div style={{
                            fontSize: '0.8rem',
                            color: '#4a5568',
                            background: '#f7fafc',
                            borderRadius: '999px',
                            padding: '4px 10px',
                            border: '1px solid #e2e8f0',
                            whiteSpace: 'nowrap'
                        }}>
                            {activeStats.completed}/{activeStats.total} ({activeStats.percent}%)
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        <input
                            type="text"
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddTask();
                                }
                            }}
                            placeholder="작업계획을 입력하세요"
                            style={todoInputStyle}
                        />
                        <button
                            onClick={handleAddTask}
                            disabled={!newTask.trim()}
                            style={{
                                ...primarySquareButton,
                                opacity: newTask.trim() ? 1 : 0.5,
                                cursor: newTask.trim() ? 'pointer' : 'default'
                            }}
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {loadingWeek ? (
                            <div style={emptyMessageStyle}>불러오는 중...</div>
                        ) : todos.length === 0 ? (
                            <div style={emptyMessageStyle}>이번 주 작업예정을 작성해 주세요.</div>
                        ) : (
                            todos.map((todo) => (
                                <div
                                    key={todo.id}
                                    style={{
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '10px',
                                        background: '#f8fafc',
                                        padding: '8px 10px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            onClick={() => handleToggleTodo(todo)}
                                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
                                        >
                                            {todo.is_completed
                                                ? <CheckCircle size={18} color="#38a169" fill="#e6fffa" />
                                                : <Circle size={18} color="#a0aec0" />
                                            }
                                        </button>

                                        {editingTodoId === todo.id ? (
                                            <input
                                                type="text"
                                                value={editingText}
                                                onChange={(e) => setEditingText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleSaveTodoEdit(todo);
                                                    }
                                                }}
                                                style={{
                                                    ...todoInputStyle,
                                                    padding: '7px 9px',
                                                    fontSize: '0.88rem'
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                flex: 1,
                                                fontSize: '0.92rem',
                                                color: todo.is_completed ? '#90a0b5' : '#2d3748',
                                                textDecoration: todo.is_completed ? 'line-through' : 'none',
                                                wordBreak: 'break-word'
                                            }}>
                                                {todo.content}
                                            </div>
                                        )}

                                        {editingTodoId === todo.id ? (
                                            <button
                                                onClick={() => handleSaveTodoEdit(todo)}
                                                style={smallIconButtonStyle}
                                                title="저장"
                                            >
                                                <Save size={16} color="#2f855a" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setEditingTodoId(todo.id);
                                                    setEditingText(todo.content);
                                                }}
                                                style={smallIconButtonStyle}
                                                title="수정"
                                            >
                                                <Pencil size={16} color="#2b6cb0" />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleDeleteTodo(todo)}
                                            style={smallIconButtonStyle}
                                            title="삭제"
                                        >
                                            <Trash2 size={16} color="#e53e3e" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 3) Notice + Report Buttons */}
                <div style={{
                    borderRadius: '12px',
                    border: '1px solid #cbd5e0',
                    background: '#f7fafc',
                    padding: '12px',
                    marginBottom: '10px',
                    color: '#2d3748',
                    fontSize: '0.78rem',
                    fontWeight: '500',
                    textAlign: 'left',
                    lineHeight: 1.5
                }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: '700', marginBottom: '4px' }}>
                        작성요령
                    </div>
                    <div>한주에 할 목록을 대충 계획해주세요</div>
                    <div style={{ marginTop: '4px', color: '#e53e3e' }}>ex) 재무회계 기본서 28p-928p (×)</div>
                    <div style={{ marginTop: '2px', color: '#2b6cb0' }}>ex) 재무회계 기본서 5강이상 듣고 80%는 이해하기 (0)</div>
                    <div style={{ marginTop: '8px' }}>
                        한 주가 지나면 자동으로 완료%가 계산되며, 주중 수정하거나 추가 할 수 있습니다.
                    </div>
                    <div style={{ marginTop: '8px' }}>제출하신 작업 예정,결과는</div>
                    <div>해당 지점 공장장에게 보고되며</div>
                    <div>회원님의 관리에 참고됩니다.(필수아님)</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    <button
                        onClick={() => handleSubmitPlan(false)}
                        disabled={submittingReport || !currentPlan}
                        style={{
                            ...reportButtonStyle,
                            background: '#2b6cb0'
                        }}
                    >
                        보고하기
                    </button>
                    <button
                        onClick={() => handleSubmitPlan(true)}
                        disabled={submittingReport || !currentPlan}
                        style={{
                            ...reportButtonStyle,
                            background: '#2c7a7b'
                        }}
                    >
                        수정보고
                    </button>
                </div>

                <div style={{ height: '1px', background: '#edf2f7', marginBottom: '16px' }} />

                {/* 4) Monthly Weekly Calendar (Bottom) */}
                <div style={{ marginBottom: '6px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '10px'
                    }}>
                        <button
                            onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                            style={iconButtonStyle}
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#2d3748' }}>
                            {format(currentMonth, 'yyyy년 M월')}
                        </div>

                        <button
                            onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                            style={iconButtonStyle}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {loadingMonth ? (
                        <div style={emptyMessageStyle}>월별 주차 현황을 불러오는 중...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {weekCards.map((weekCard) => {
                                const selected = format(selectedWeekStart, 'yyyy-MM-dd') === weekCard.weekKey;
                                const reportLabel = weekCard.reportStatus === 're_reported'
                                    ? '다시보고'
                                    : weekCard.reportStatus === 'reported'
                                        ? '보고완료'
                                        : '미보고';

                                return (
                                    <button
                                        key={weekCard.weekKey}
                                        onClick={() => setSelectedWeekStart(weekCard.weekStart)}
                                        style={{
                                            border: selected ? '2px solid #2b6cb0' : '1px solid #d2dbe5',
                                            borderRadius: '12px',
                                            background: selected ? '#f0f7ff' : 'white',
                                            padding: '10px',
                                            textAlign: 'left',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '8px'
                                        }}>
                                            <div style={{ fontSize: '0.86rem', fontWeight: '700', color: '#2d3748' }}>
                                                <span>{format(weekCard.weekStart, 'M월 d일')}</span>{renderWeekday(weekCard.weekStart)} ~{' '}
                                                <span>{format(weekCard.weekEnd, 'd일')}</span>{renderWeekday(weekCard.weekEnd)}
                                            </div>
                                            <span style={{
                                                fontSize: '0.72rem',
                                                fontWeight: '700',
                                                color: weekCard.reportStatus === 'draft' ? '#718096' : '#2c5282',
                                                background: weekCard.reportStatus === 'draft' ? '#edf2f7' : '#bee3f8',
                                                borderRadius: '999px',
                                                padding: '3px 8px'
                                            }}>
                                                {reportLabel}
                                            </span>
                                        </div>

                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '54px minmax(90px, 140px) 1fr',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <div style={{
                                                fontWeight: '700',
                                                color: '#2b6cb0',
                                                fontSize: '0.9rem',
                                                textAlign: 'right'
                                            }}>
                                                {weekCard.completionRate}%
                                            </div>

                                            <div style={{
                                                position: 'relative',
                                                height: '12px',
                                                borderRadius: '999px',
                                                background: '#e2e8f0',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    width: `${weekCard.completionRate}%`,
                                                    height: '100%',
                                                    borderRadius: '999px',
                                                    background: weekCard.completionRate >= 80
                                                        ? '#38a169'
                                                        : weekCard.completionRate >= 40
                                                            ? '#3182ce'
                                                            : '#d69e2e'
                                                }} />
                                            </div>

                                            <div style={{
                                                fontSize: '0.82rem',
                                                color: weekCard.evaluation ? '#2d3748' : '#9aa9bc',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {weekCard.evaluation || '평가 대기중'}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const iconButtonStyle = {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    background: 'white',
    color: '#4a5568',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
};

const primarySquareButton = {
    width: '40px',
    borderRadius: '10px',
    border: 'none',
    background: 'var(--color-primary)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

const reportButtonStyle = {
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontWeight: '700',
    padding: '11px 10px',
    cursor: 'pointer'
};

const smallIconButtonStyle = {
    background: 'none',
    border: 'none',
    padding: '3px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

const todoInputStyle = {
    flex: 1,
    border: '1px solid #d2dbe5',
    borderRadius: '10px',
    padding: '9px 10px',
    outline: 'none',
    fontSize: '0.9rem'
};

const emptyMessageStyle = {
    textAlign: 'center',
    color: '#9aa9bc',
    padding: '15px 8px',
    fontSize: '0.85rem',
    border: '1px dashed #dbe5ee',
    borderRadius: '10px',
    background: '#fbfdff'
};

export default DailyWorkPlan;
