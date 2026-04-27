import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Calendar,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Circle,
    Search,
    Trash2
} from 'lucide-react';
import { addDays, format, startOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { supabase } from '../lib/supabaseClient';
import { BRANCH_OPTIONS } from '../constants/branches';
import { useAuth } from '../context/AuthContext';

const getWeekStart = (date) => startOfWeek(date, { weekStartsOn: 1 });

const toDateTime = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return format(d, 'yyyy.MM.dd(eee) HH:mm', { locale: ko });
};

const stringifyLogPayload = (payload = {}) => {
    const entries = Object.entries(payload || {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
    if (entries.length === 0) return '';
    return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' / ');
};

const AdminWorkPlanReport = ({ onBack }) => {
    const { user } = useAuth();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedBranch, setSelectedBranch] = useState('전체');
    const [searchName, setSearchName] = useState('');

    const [plans, setPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(false);

    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [selectedTodos, setSelectedTodos] = useState([]);
    const [selectedLogs, setSelectedLogs] = useState([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const [evaluationText, setEvaluationText] = useState('');
    const [savingEvaluation, setSavingEvaluation] = useState(false);

    const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
    const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
    const weekStartStr = useMemo(() => format(weekStart, 'yyyy-MM-dd'), [weekStart]);

    const fetchSubmittedPlans = useCallback(async () => {
        setLoadingPlans(true);
        try {
            const { data, error } = await supabase
                .from('weekly_work_plans')
                .select(`
                    id,
                    user_id,
                    week_start_date,
                    report_status,
                    reported_at,
                    last_re_reported_at,
                    admin_evaluation,
                    evaluated_at,
                    updated_at,
                    profiles:user_id (name, branch)
                `)
                .eq('week_start_date', weekStartStr)
                .or('report_status.eq.reported,report_status.eq.re_reported')
                .order('updated_at', { ascending: false });

            if (error) throw error;

            setPlans(data || []);

            if (selectedPlanId) {
                const exists = (data || []).some((item) => item.id === selectedPlanId);
                if (!exists) {
                    setSelectedPlanId(null);
                    setSelectedPlan(null);
                    setSelectedTodos([]);
                    setSelectedLogs([]);
                    setEvaluationText('');
                }
            }
        } catch (error) {
            console.error('제출 목록 조회 실패:', error);
            setPlans([]);
        } finally {
            setLoadingPlans(false);
        }
    }, [selectedPlanId, weekStartStr]);

    const fetchPlanDetail = useCallback(async (planId) => {
        setLoadingDetail(true);
        try {
            const [planRes, todosRes, logsRes] = await Promise.all([
                supabase
                    .from('weekly_work_plans')
                    .select(`
                        id,
                        user_id,
                        week_start_date,
                        report_status,
                        reported_at,
                        last_re_reported_at,
                        admin_evaluation,
                        evaluated_at,
                        evaluated_by,
                        profiles:user_id (name, branch)
                    `)
                    .eq('id', planId)
                    .single(),
                supabase
                    .from('weekly_work_plan_todos')
                    .select('*')
                    .eq('plan_id', planId)
                    .order('display_order', { ascending: true })
                    .order('created_at', { ascending: true }),
                supabase
                    .from('weekly_work_plan_activity_logs')
                    .select('*')
                    .eq('plan_id', planId)
                    .order('created_at', { ascending: false })
            ]);

            if (planRes.error) throw planRes.error;
            if (todosRes.error) throw todosRes.error;
            if (logsRes.error) throw logsRes.error;

            setSelectedPlan(planRes.data || null);
            setSelectedTodos(todosRes.data || []);
            setSelectedLogs(logsRes.data || []);
            setEvaluationText(planRes.data?.admin_evaluation || '');
        } catch (error) {
            console.error('제출 상세 조회 실패:', error);
            setSelectedPlan(null);
            setSelectedTodos([]);
            setSelectedLogs([]);
            setEvaluationText('');
        } finally {
            setLoadingDetail(false);
        }
    }, []);

    useEffect(() => {
        fetchSubmittedPlans();
    }, [fetchSubmittedPlans]);

    useEffect(() => {
        if (!selectedPlanId) return;
        fetchPlanDetail(selectedPlanId);
    }, [fetchPlanDetail, selectedPlanId]);

    const saveEvaluation = async () => {
        if (!selectedPlan || !user?.id) return;

        setSavingEvaluation(true);

        const nowIso = new Date().toISOString();

        try {
            const { error: updateError } = await supabase
                .from('weekly_work_plans')
                .update({
                    admin_evaluation: evaluationText.trim(),
                    evaluated_at: nowIso,
                    evaluated_by: user.id
                })
                .eq('id', selectedPlan.id);

            if (updateError) throw updateError;

            await supabase
                .from('weekly_work_plan_activity_logs')
                .insert([{
                    plan_id: selectedPlan.id,
                    user_id: selectedPlan.user_id,
                    actor_id: user.id,
                    action_type: 'EVALUATE',
                    action_detail: '관리자 평가를 저장했습니다.',
                    after_data: { evaluation: evaluationText.trim() }
                }]);

            await Promise.all([
                fetchPlanDetail(selectedPlan.id),
                fetchSubmittedPlans()
            ]);

            alert('평가가 저장되었습니다.');
        } catch (error) {
            console.error('평가 저장 실패:', error);
            alert('평가 저장에 실패했습니다.');
        } finally {
            setSavingEvaluation(false);
        }
    };

    const filteredPlans = plans.filter((plan) => {
        const branch = plan.profiles?.branch || '';
        const name = (plan.profiles?.name || '').toLowerCase();

        const branchMatch = selectedBranch === '전체' || selectedBranch === branch;
        const nameMatch = name.includes(searchName.toLowerCase());

        return branchMatch && nameMatch;
    });

    const logsByType = useMemo(() => {
        const safeLogs = selectedLogs || [];

        return {
            created: safeLogs.filter((log) => log.action_type === 'CREATE_TODO'),
            completed: safeLogs.filter((log) => log.action_type === 'TOGGLE_TODO'),
            updated: safeLogs.filter((log) => log.action_type === 'UPDATE_TODO'),
            deleted: safeLogs.filter((log) => log.action_type === 'DELETE_TODO'),
            reported: safeLogs.filter((log) => log.action_type === 'REPORT' || log.action_type === 'REREPORT'),
            evaluated: safeLogs.filter((log) => log.action_type === 'EVALUATE')
        };
    }, [selectedLogs]);

    if (selectedPlanId) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'white', margin: '-20px' }}>
                <div style={{
                    padding: '15px 20px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0
                }}>
                    <button
                        onClick={() => {
                            setSelectedPlanId(null);
                            setSelectedPlan(null);
                            setSelectedTodos([]);
                            setSelectedLogs([]);
                            setEvaluationText('');
                        }}
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
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0 4px', lineHeight: 1 }}>
                        작업계획보고 상세
                    </h2>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {loadingDetail || !selectedPlan ? (
                        <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '40px' }}>상세 정보를 불러오는 중...</div>
                    ) : (
                        <>
                            <div style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '16px',
                                padding: '16px',
                                background: '#f8fafc',
                                marginBottom: '14px'
                            }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#2d3748', marginBottom: '6px' }}>
                                    {selectedPlan.profiles?.name || '이름 없음'}
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#4a5568', marginBottom: '3px' }}>
                                    지점: {selectedPlan.profiles?.branch || '-'}
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#4a5568', marginBottom: '3px' }}>
                                    주차: {format(weekStart, 'M월 d일(eee)', { locale: ko })} ~ {format(weekEnd, 'd일(eee)', { locale: ko })}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                    보고: {selectedPlan.report_status === 're_reported' ? '다시보고' : '보고완료'}
                                    {' · '}
                                    최초 보고일: {toDateTime(selectedPlan.reported_at)}
                                    {selectedPlan.last_re_reported_at ? ` · 다시보고일: ${toDateTime(selectedPlan.last_re_reported_at)}` : ''}
                                </div>
                            </div>

                            <div style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '16px',
                                background: 'white',
                                marginBottom: '14px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    padding: '12px 14px',
                                    borderBottom: '1px solid #edf2f7',
                                    fontWeight: '700',
                                    color: '#2d3748'
                                }}>
                                    이번 주 작업계획 투두
                                </div>

                                <div style={{ padding: '12px' }}>
                                    {selectedTodos.length === 0 ? (
                                        <div style={{ color: '#a0aec0', textAlign: 'center', padding: '20px 10px' }}>
                                            등록된 투두가 없습니다.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {selectedTodos.map((todo) => {
                                                const deleted = !!todo.deleted_at;
                                                return (
                                                    <div
                                                        key={todo.id}
                                                        style={{
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '10px',
                                                            padding: '10px',
                                                            background: deleted ? '#fff5f5' : '#f8fafc',
                                                            opacity: deleted ? 0.85 : 1
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {deleted ? (
                                                                <Trash2 size={16} color="#e53e3e" />
                                                            ) : todo.is_completed ? (
                                                                <CheckCircle size={16} color="#38a169" />
                                                            ) : (
                                                                <Circle size={16} color="#a0aec0" />
                                                            )}
                                                            <span style={{
                                                                fontSize: '0.92rem',
                                                                color: deleted ? '#9b2c2c' : '#2d3748',
                                                                textDecoration: deleted ? 'line-through' : (todo.is_completed ? 'line-through' : 'none')
                                                            }}>
                                                                {todo.content}
                                                            </span>
                                                        </div>
                                                        <div style={{
                                                            marginTop: '6px',
                                                            fontSize: '0.75rem',
                                                            color: '#94a3b8',
                                                            display: 'flex',
                                                            flexWrap: 'wrap',
                                                            gap: '8px'
                                                        }}>
                                                            <span>생성: {toDateTime(todo.created_at)}</span>
                                                            {todo.completed_at && <span>완료: {toDateTime(todo.completed_at)}</span>}
                                                            {todo.updated_at && <span>수정: {toDateTime(todo.updated_at)}</span>}
                                                            {todo.deleted_at && <span>삭제: {toDateTime(todo.deleted_at)}</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr',
                                gap: '10px',
                                marginBottom: '14px'
                            }}>
                                <HistorySection title="생성 내역" logs={logsByType.created} emptyText="생성 내역이 없습니다." />
                                <HistorySection title="완료 사항" logs={logsByType.completed} emptyText="완료/해제 내역이 없습니다." />
                                <HistorySection title="수정 사항" logs={logsByType.updated} emptyText="수정 내역이 없습니다." />
                                <HistorySection title="삭제 내역" logs={logsByType.deleted} emptyText="삭제 내역이 없습니다." />
                                <HistorySection title="보고 내역" logs={logsByType.reported} emptyText="보고 내역이 없습니다." />
                                <HistorySection title="평가 내역" logs={logsByType.evaluated} emptyText="평가 내역이 없습니다." />
                            </div>

                            <div style={{
                                border: '1px solid #dbe5ee',
                                borderRadius: '16px',
                                padding: '14px',
                                background: '#f8fafc'
                            }}>
                                <div style={{
                                    fontWeight: '700',
                                    color: '#2d3748',
                                    marginBottom: '8px'
                                }}>
                                    이번 주 평가
                                </div>
                                <textarea
                                    value={evaluationText}
                                    onChange={(e) => setEvaluationText(e.target.value)}
                                    placeholder="이번 주 작업계획 평가를 입력해 주세요"
                                    style={{
                                        width: '100%',
                                        minHeight: '90px',
                                        resize: 'vertical',
                                        borderRadius: '10px',
                                        border: '1px solid #cbd5e0',
                                        padding: '10px',
                                        fontSize: '0.9rem',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                        marginBottom: '10px'
                                    }}
                                />
                                <button
                                    onClick={saveEvaluation}
                                    disabled={savingEvaluation}
                                    style={{
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px 14px',
                                        fontWeight: '700',
                                        color: 'white',
                                        background: '#2b6cb0',
                                        cursor: 'pointer',
                                        opacity: savingEvaluation ? 0.7 : 1
                                    }}
                                >
                                    평가 저장
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'white', margin: '-20px' }}>
            <div style={{
                padding: '15px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0
            }}>
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
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0 4px', lineHeight: 1 }}>
                    작업계획보고
                </h2>
            </div>

            <div style={{ padding: '16px 20px', borderBottom: '1px solid #edf2f7', background: '#f8fafc' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginBottom: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    background: 'white',
                    padding: '8px 10px'
                }}>
                    <button onClick={() => setCurrentDate((prev) => addDays(prev, -7))} style={weekArrowStyle}>
                        <ChevronLeft size={18} />
                    </button>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#2d3748',
                        fontWeight: '700',
                        fontSize: '0.92rem',
                        textAlign: 'center'
                    }}>
                        <Calendar size={16} color="#64748b" />
                        <span>{format(weekStart, 'M월 d일(eee)', { locale: ko })} ~ {format(weekEnd, 'd일(eee)', { locale: ko })}</span>
                    </div>
                    <button onClick={() => setCurrentDate((prev) => addDays(prev, 7))} style={weekArrowStyle}>
                        <ChevronRight size={18} />
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        style={{
                            flex: 1,
                            border: '1px solid #cbd5e0',
                            borderRadius: '10px',
                            padding: '10px',
                            fontSize: '0.9rem',
                            background: 'white',
                            outline: 'none'
                        }}
                    >
                        {BRANCH_OPTIONS.map((branch) => (
                            <option key={branch} value={branch}>{branch}</option>
                        ))}
                    </select>
                </div>

                <div style={{ position: 'relative' }}>
                    <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="제출자 이름 검색"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        style={{
                            width: '100%',
                            border: '1px solid #cbd5e0',
                            borderRadius: '10px',
                            padding: '10px 10px 10px 38px',
                            fontSize: '0.9rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                {loadingPlans ? (
                    <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '40px' }}>제출 목록을 불러오는 중...</div>
                ) : filteredPlans.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '40px' }}>
                        해당 주차 제출자가 없습니다.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {filteredPlans.map((plan) => {
                            const isRereport = plan.report_status === 're_reported';
                            const reviewed = !!plan.admin_evaluation;
                            return (
                                <button
                                    key={plan.id}
                                    onClick={() => setSelectedPlanId(plan.id)}
                                    style={{
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '14px',
                                        background: 'white',
                                        padding: '12px',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <div style={{ fontWeight: '700', color: '#2d3748' }}>
                                            {plan.profiles?.name || '이름 없음'}
                                        </div>
                                        <div style={{
                                            fontSize: '0.72rem',
                                            fontWeight: '700',
                                            color: isRereport ? '#285e61' : '#2c5282',
                                            background: isRereport ? '#b2f5ea' : '#bee3f8',
                                            borderRadius: '999px',
                                            padding: '3px 8px'
                                        }}>
                                            {isRereport ? '다시보고' : '보고완료'}
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '3px' }}>
                                        {plan.profiles?.branch || '-'}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                                        제출일: {toDateTime(plan.last_re_reported_at || plan.reported_at)}
                                    </div>

                                    <div style={{
                                        fontSize: '0.8rem',
                                        color: reviewed ? '#2d3748' : '#9aa9bc',
                                        background: reviewed ? '#f0fff4' : '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        padding: '6px 8px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {reviewed ? `평가: ${plan.admin_evaluation}` : '평가 대기중'}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const weekArrowStyle = {
    width: '30px',
    height: '30px',
    borderRadius: '9px',
    border: '1px solid #e2e8f0',
    background: 'white',
    color: '#4a5568',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
};

const sectionContainerStyle = {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    background: 'white',
    overflow: 'hidden'
};

const sectionHeaderStyle = {
    padding: '10px 12px',
    borderBottom: '1px solid #edf2f7',
    fontWeight: '700',
    color: '#2d3748'
};

const sectionBodyStyle = {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
};

const HistorySection = ({ title, logs, emptyText }) => {
    return (
        <div style={sectionContainerStyle}>
            <div style={sectionHeaderStyle}>{title}</div>
            <div style={sectionBodyStyle}>
                {logs.length === 0 ? (
                    <div style={{ color: '#a0aec0', fontSize: '0.85rem' }}>{emptyText}</div>
                ) : logs.map((log) => (
                    <div
                        key={log.id}
                        style={{
                            border: '1px solid #edf2f7',
                            borderRadius: '8px',
                            padding: '8px',
                            background: '#f8fafc'
                        }}
                    >
                        <div style={{ fontSize: '0.82rem', color: '#2d3748', fontWeight: '600', marginBottom: '3px' }}>
                            {log.action_detail || log.action_type}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '3px' }}>
                            {toDateTime(log.created_at)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {stringifyLogPayload(log.before_data)}
                            {log.before_data && Object.keys(log.before_data).length > 0 && log.after_data && Object.keys(log.after_data).length > 0 ? ' -> ' : ''}
                            {stringifyLogPayload(log.after_data)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminWorkPlanReport;
