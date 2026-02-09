import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Plus, Calendar as CalendarIcon, Search, UserPlus, CheckSquare, Square, Trash, Save, CornerDownLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { format, startOfMonth, endOfMonth, addDays, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';

// Special attendance statuses
const SPECIAL_STATUSES = ['지각', '병원', '외출', '쉼', '운동', '알바', '스터디', '집공', '개인', '아픔', '모의', '시험', '그만둠', '늦잠', '교회'];

// Status Selection Popup
const StatusPopup = ({ onSelect, onClose }) => {
    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '20px',
                    width: '280px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}
            >
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '15px', textAlign: 'center' }}>
                    출석 상태 선택
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {SPECIAL_STATUSES.map(status => (
                        <button
                            key={status}
                            onClick={() => onSelect(status)}
                            style={{
                                padding: '12px 8px', borderRadius: '10px',
                                border: '1px solid #e2e8f0', background: '#c6f6d5',
                                color: '#c53030', fontWeight: 'bold', fontSize: '0.9rem',
                                cursor: 'pointer', transition: 'transform 0.1s'
                            }}
                        >
                            {status}
                        </button>
                    ))}
                </div>
                <div style={{ margin: '15px 0', borderTop: '1px solid #e2e8f0' }}></div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => onSelect('vacation_full')}
                        style={{
                            flex: 1, padding: '10px 0', borderRadius: '10px',
                            border: '1px solid #feb2b2', background: '#fff5f5',
                            color: '#c53030', fontWeight: 'bold', fontSize: '0.9rem',
                            cursor: 'pointer'
                        }}
                    >
                        월차
                    </button>
                    <button
                        onClick={() => onSelect('vacation_half_am')}
                        style={{
                            flex: 1, padding: '10px 0', borderRadius: '10px',
                            border: '1px solid #feb2b2', background: '#fff5f5',
                            color: '#c53030', fontWeight: 'bold', fontSize: '0.9rem',
                            cursor: 'pointer'
                        }}
                    >
                        오전반차
                    </button>
                    <button
                        onClick={() => onSelect('vacation_half_pm')}
                        style={{
                            flex: 1, padding: '10px 0', borderRadius: '10px',
                            border: '1px solid #90cdf4', background: '#ebf8ff',
                            color: '#2c5282', fontWeight: 'bold', fontSize: '0.9rem',
                            cursor: 'pointer'
                        }}
                    >
                        오후반차
                    </button>
                </div>



                <button
                    onClick={() => onSelect('vacation_cancel')}
                    style={{
                        width: '100%', marginTop: '8px', padding: '10px', borderRadius: '10px',
                        border: '1px solid #cbd5e0', background: '#edf2f7',
                        color: '#4a5568', fontWeight: 'bold', fontSize: '0.9rem',
                        cursor: 'pointer'
                    }}
                >
                    휴가취소
                </button>

                <button
                    onClick={onClose}
                    style={{
                        width: '100%', marginTop: '8px', padding: '12px', borderRadius: '10px',
                        border: 'none', background: '#e2e8f0', color: '#718096',
                        fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer'
                    }}
                >
                    닫기
                </button>
            </div>
        </div >,
        document.body
    );
};

// Memoized Cell with Long Press Support
const AttendanceCell = React.memo(({ user, dateStr, period, isRowHighlighted, isSelected, onSelect, attendanceData, statusData, vacationData, onLongPress, width, scale }) => {
    const key = `${user.id}_${dateStr}_${period}`;
    const isAttended = attendanceData.has(key);
    const status = statusData[key] || null;
    const vac = vacationData[`${user.id}_${dateStr}`];
    const isDeactivated = user.isEmpty || user.isUnassigned;

    const longPressTimer = useRef(null);
    const isLongPress = useRef(false);

    let bg = 'white';
    let content = null;
    let color = '#2d3748';

    if (isDeactivated) {
        bg = '#f7fafc';
        color = '#cbd5e0';
    } else if (isRowHighlighted) {
        bg = '#ebf8ff';
    }

    if (vac) {
        if (vac.type === 'full') {
            bg = '#c6f6d5';
            color = '#22543d';
            content = vac.reason ? `월차` : '월차';
        } else if (vac.type === 'half') {
            const isAm = (vac.periods || []).includes(1);
            if (isAm && period <= 4) {
                bg = '#c6f6d5';
                color = '#22543d';
                content = '오전';
            } else if (!isAm && period >= 4) {
                bg = '#c6f6d5';
                color = '#22543d';
                content = '오후';
            }
        }
    }

    // Special status styling (green bg, red text)
    if (isAttended && status) {
        bg = '#c6f6d5';
        color = '#c53030';
        content = status;
    } else if (isAttended) {
        bg = '#c6f6d5';
        color = '#22543d';
        content = 'O';
    } else {
        if (!content && (bg === 'white' || bg === '#ebf8ff' || bg === '#f7fafc')) {
            if (!isDeactivated) {
                bg = '#fed7d7';
                color = '#c53030';
            }
            content = 'X';
        }
    }

    const handleStart = (e) => {
        if (isDeactivated) return;
        isLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            onLongPress(user, dateStr, period);
        }, 500);
    };

    const handleEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleClick = () => {
        if (isDeactivated) return;
        if (!isLongPress.current) {
            onSelect(user, dateStr, period);
        }
        isLongPress.current = false;
    };

    return (
        <div
            onMouseDown={handleStart}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchEnd={handleEnd}
            onClick={handleClick}
            onContextMenu={(e) => e.preventDefault()}
            style={{
                width: width, flexShrink: 0, height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: bg, color, fontSize: `${0.8 * scale}rem`, fontWeight: 'bold',
                borderRight: '1px solid #e2e8f0',
                whiteSpace: 'pre-line', textAlign: 'center', lineHeight: 1.1,
                cursor: isDeactivated ? 'default' : 'pointer',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                boxShadow: isSelected ? 'inset 0 0 0 3px #3182ce' : 'none', // Blue highlight for selected
                zIndex: isSelected ? 10 : 'auto'
            }}
        >
            {content}
        </div>
    );
}, (prev, next) => {
    return (
        prev.scale === next.scale &&
        prev.width === next.width &&
        prev.isRowHighlighted === next.isRowHighlighted &&
        prev.isSelected === next.isSelected && // Check isSelected
        prev.attendanceData === next.attendanceData &&
        prev.statusData === next.statusData &&
        prev.vacationData === next.vacationData
    );
});

// Memo Block for Popup (Single Text Area)
const UserMemoPopup = ({ user, memberMemos, onSave, onClose }) => {
    const userMemos = memberMemos.filter(m => m.user_id === user.id);
    // Join existing memos with newlines if there are multiple (migration/fallback)
    const initialText = userMemos.map(m => m.content).join('\n');
    const [text, setText] = useState(initialText);

    const handleSave = () => {
        onSave(user.id, text.trim());
    };

    return (
        <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            backgroundColor: 'white', borderTop: '2px solid #e2e8f0',
            boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{
                padding: '12px 20px', borderBottom: '1px solid #edf2f7',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: '#f7fafc'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748' }}>
                        {user.name} <span style={{ fontSize: '0.9rem', color: '#718096', fontWeight: 'normal' }}>(좌석 {user.seat_number || '-'})</span>
                    </span>
                    <span style={{ fontSize: '0.9rem', color: '#4a5568', background: '#edf2f7', padding: '2px 8px', borderRadius: '4px' }}>
                        참고사항
                    </span>
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onClose();
                    }}
                    style={{
                        padding: '8px', borderRadius: '50%', border: 'none', background: 'white',
                        cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <X size={20} color="#4a5568" />
                </button>
            </div>

            <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="참고사항을 입력하세요..."
                    style={{
                        flex: 1,
                        width: '100%',
                        resize: 'none',
                        border: '1px solid #cbd5e0',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '1rem',
                        lineHeight: '1.5',
                        outline: 'none',
                        fontFamily: 'inherit'
                    }}
                />
            </div>

            <div style={{ padding: '15px 20px', borderTop: '1px solid #edf2f7', backgroundColor: 'white', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleSave}
                    style={{
                        background: '#3182ce', color: 'white', border: 'none', borderRadius: '8px',
                        padding: '10px 24px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    <Save size={18} /> 저장
                </button>
            </div>
        </div>
    );
};

// Redesigned Incoming Employee Modal - Fetches from pending_registrations and syncs todos
const IncomingEmployeeModal = ({ onClose }) => {
    const [pendingEmployees, setPendingEmployees] = useState([]);
    const [todos, setTodos] = useState({});
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        fetchPendingEmployees();

        // Subscribe to real-time updates for staff_todos
        const todosSubscription = supabase
            .channel('staff_todos_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'staff_todos',
                filter: 'pending_registration_id=not.is.null'
            }, () => {
                fetchPendingEmployees();
            })
            .subscribe();

        return () => {
            todosSubscription.unsubscribe();
        };
    }, []);

    const fetchPendingEmployees = async () => {
        setLoading(true);
        try {
            // Fetch pending_registrations
            const { data: pending, error: pendingError } = await supabase
                .from('pending_registrations')
                .select('*')
                .order('expected_start_date', { ascending: true });

            if (pendingError) throw pendingError;

            // Fetch all related todos
            const { data: allTodos, error: todosError } = await supabase
                .from('staff_todos')
                .select('*')
                .not('pending_registration_id', 'is', null);

            if (todosError) throw todosError;

            // Group todos by pending_registration_id
            const todosByPending = {};
            (allTodos || []).forEach(todo => {
                if (!todosByPending[todo.pending_registration_id]) {
                    todosByPending[todo.pending_registration_id] = [];
                }
                todosByPending[todo.pending_registration_id].push(todo);
            });

            setPendingEmployees(pending || []);
            setTodos(todosByPending);
        } catch (error) {
            console.error('Error fetching pending employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTodo = async (todoId, currentStatus) => {
        try {
            const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('staff_todos')
                .update({
                    status: newStatus,
                    completed_by: newStatus === 'completed' ? user?.id : null,
                    completed_at: newStatus === 'completed' ? new Date().toISOString() : null
                })
                .eq('id', todoId);

            if (error) throw error;
            await fetchPendingEmployees();
        } catch (error) {
            console.error('Error toggling todo:', error);
            alert('투두 업데이트 실패');
        }
    };

    const startEdit = (employee) => {
        setEditingId(employee.id);
        setEditForm({
            name: employee.name,
            seat_number: employee.seat_number || '',
            expected_start_date: employee.expected_start_date || '',
            target_certificate: employee.target_certificate || ''
        });
    };

    const saveEdit = async (id) => {
        try {
            const { error } = await supabase
                .from('pending_registrations')
                .update({
                    name: editForm.name,
                    seat_number: editForm.seat_number || null,
                    expected_start_date: editForm.expected_start_date || null,
                    target_certificate: editForm.target_certificate || null
                })
                .eq('id', id);

            if (error) throw error;

            // Update todos
            const employeeTodos = todos[id] || [];
            const dateObj = editForm.expected_start_date ? new Date(editForm.expected_start_date) : new Date();
            const month = dateObj.getMonth() + 1;
            const date = dateObj.getDate();
            const shortDate = `${month}/${date}`;
            const todoPrefix = `${shortDate} ${editForm.seat_number ? `${editForm.seat_number}번` : ''} ${editForm.name}${editForm.target_certificate ? ` ${editForm.target_certificate}` : ''}`;

            const tasks = ['명패 준비', '책상 정비', '좌석 및 음료 정보 입력 확인'];
            for (let i = 0; i < employeeTodos.length; i++) {
                await supabase
                    .from('staff_todos')
                    .update({ content: `${todoPrefix} ${tasks[i] || ''}` })
                    .eq('id', employeeTodos[i].id);
            }

            setEditingId(null);
            setEditForm({});
            await fetchPendingEmployees();
        } catch (error) {
            console.error('Error saving edit:', error);
            alert('수정 실패');
        }
    };

    const deletePending = async (id) => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
            const { error } = await supabase
                .from('pending_registrations')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchPendingEmployees();
        } catch (error) {
            console.error('Error deleting:', error);
            alert('삭제 실패');
        }
    };

    return createPortal(
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: 'white', borderRadius: '16px', width: '90%', maxWidth: '600px',
                height: '85vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#267E82', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserPlus size={24} /> 입사예정자 관리
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#a0aec0" /></button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '40px' }}>로딩중...</div>
                    ) : pendingEmployees.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '40px' }}>
                            입사예정자가 없습니다.<br />
                            <span style={{ fontSize: '0.85rem' }}>관리자 페이지에서 사원 등록 시 자동으로 추가됩니다.</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {pendingEmployees.map(emp => {
                                const employeeTodos = todos[emp.id] || [];
                                const allComplete = employeeTodos.length === 3 && employeeTodos.every(t => t.status === 'completed');
                                const isEditing = editingId === emp.id;

                                return (
                                    <div key={emp.id} style={{
                                        background: allComplete ? '#f0fff4' : 'white',
                                        border: `2px solid ${allComplete ? '#38a169' : '#e2e8f0'}`,
                                        borderRadius: '12px',
                                        padding: '15px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                    }}>
                                        {isEditing ? (
                                            // Edit Mode
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>수정</span>
                                                    <div style={{ display: 'flex', gap: '5px' }}>
                                                        <button onClick={() => saveEdit(emp.id)} style={{ padding: '6px 10px', background: '#38a169', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>저장</button>
                                                        <button onClick={() => { setEditingId(null); setEditForm({}); }} style={{ padding: '6px 10px', background: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>취소</button>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', color: '#718096', display: 'block', marginBottom: '3px' }}>이름</label>
                                                        <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.9rem' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', color: '#718096', display: 'block', marginBottom: '3px' }}>좌석</label>
                                                        <input type="number" value={editForm.seat_number} onChange={(e) => setEditForm({ ...editForm, seat_number: e.target.value })} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.9rem' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', color: '#718096', display: 'block', marginBottom: '3px' }}>입사예정일</label>
                                                        <input type="date" value={editForm.expected_start_date} onChange={(e) => setEditForm({ ...editForm, expected_start_date: e.target.value })} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.9rem' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', color: '#718096', display: 'block', marginBottom: '3px' }}>자격증</label>
                                                        <input value={editForm.target_certificate} onChange={(e) => setEditForm({ ...editForm, target_certificate: e.target.value })} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.9rem' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            // View Mode
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                                    <div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748' }}>
                                                            {emp.seat_number ? `${emp.seat_number}번` : ''} {emp.name} {emp.target_certificate && <span style={{ fontSize: '0.9rem', color: '#2b6cb0' }}>{emp.target_certificate}</span>}
                                                        </div>
                                                        {emp.expected_start_date && (
                                                            <div style={{ fontSize: '0.85rem', color: '#718096', marginTop: '2px' }}>
                                                                입사예정: {format(new Date(emp.expected_start_date), 'M월 d일 (EEE)', { locale: ko })}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '5px' }}>
                                                        <button onClick={() => startEdit(emp)} style={{ padding: '6px', background: '#ebf8ff', color: '#3182ce', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                                            <Save size={16} />
                                                        </button>
                                                        <button onClick={() => deletePending(emp.id)} style={{ padding: '6px', background: '#fff5f5', color: '#e53e3e', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                                            <Trash size={16} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Todos */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                                                    {employeeTodos.length === 0 ? (
                                                        <div style={{ fontSize: '0.85rem', color: '#a0aec0', textAlign: 'center', padding: '10px' }}>투두가 생성되지 않았습니다</div>
                                                    ) : (
                                                        employeeTodos.map((todo, idx) => {
                                                            const tasks = ['명패 준비', '책상 정비', '좌석 및 음료 정보 입력 확인'];
                                                            const taskName = tasks[idx] || '작업';
                                                            const isComplete = todo.status === 'completed';

                                                            return (
                                                                <div key={todo.id} style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '10px',
                                                                    padding: '8px',
                                                                    background: isComplete ? '#f0fff4' : '#f7fafc',
                                                                    borderRadius: '8px',
                                                                    border: `1px solid ${isComplete ? '#9ae6b4' : '#e2e8f0'}`
                                                                }}>
                                                                    <div
                                                                        onClick={() => toggleTodo(todo.id, todo.status)}
                                                                        style={{ cursor: 'pointer', color: isComplete ? '#38a169' : '#cbd5e0' }}
                                                                    >
                                                                        {isComplete ? <CheckSquare size={20} /> : <Square size={20} />}
                                                                    </div>
                                                                    <div style={{
                                                                        flex: 1,
                                                                        fontSize: '0.9rem',
                                                                        color: isComplete ? '#718096' : '#2d3748',
                                                                        textDecoration: isComplete ? 'line-through' : 'none'
                                                                    }}>
                                                                        {taskName}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};


const StaffDailyAttendance = ({ onBack }) => {
    const [today] = useState(new Date());
    // Fixed: Initialize navigation with today, allow changes
    const [currentViewDate, setCurrentViewDate] = useState(new Date());
    const [scale, setScale] = useState(1.0);
    const [branch, setBranch] = useState('망미점');

    const [displayRows, setDisplayRows] = useState([]);
    const [attendanceData, setAttendanceData] = useState(new Set());
    const [statusData, setStatusData] = useState({}); // {key: status}
    const [vacationData, setVacationData] = useState({});
    const [dailyMemos, setDailyMemos] = useState([]);
    const [memberMemos, setMemberMemos] = useState([]);
    const [incomingEmployees, setIncomingEmployees] = useState([]);
    const [pendingTodos, setPendingTodos] = useState({}); // {pending_registration_id: [todos]}

    const [loading, setLoading] = useState(false);
    const [highlightedUserId, setHighlightedUserId] = useState(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [showMemoModal, setShowMemoModal] = useState(false);
    const [showIncomingModal, setShowIncomingModal] = useState(false);
    const [newMemo, setNewMemo] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Status popup state
    const [statusPopup, setStatusPopup] = useState({ open: false, user: null, dateStr: '', period: null });
    const [selectedCell, setSelectedCell] = useState(null); // { userId, dateStr, period }

    const scrollContainerRef = useRef(null);
    const contentRef = useRef(null);
    const rowRefs = useRef({}); // Refs for scrolling to rows
    const [touchStartDist, setTouchStartDist] = useState(null);
    const [startScale, setStartScale] = useState(1.0);

    // Dynamic Constants
    const BASE_SEAT_WIDTH = 50;
    const BASE_NAME_WIDTH = 80;
    const BASE_PERIOD_WIDTH = 45;
    const BASE_ROW_HEIGHT = 40;
    const BASE_HEADER_DATE_HEIGHT = 40;
    const BASE_HEADER_PERIOD_HEIGHT = 35;

    const SEAT_WIDTH = BASE_SEAT_WIDTH * scale;
    const NAME_WIDTH = BASE_NAME_WIDTH * scale;
    const PERIOD_WIDTH = BASE_PERIOD_WIDTH * scale;
    const ROW_HEIGHT = BASE_ROW_HEIGHT * scale;
    const HEADER_DATE_HEIGHT = BASE_HEADER_DATE_HEIGHT * scale;
    const HEADER_PERIOD_HEIGHT = BASE_HEADER_PERIOD_HEIGHT * scale;
    const HEADER_TOTAL_HEIGHT = HEADER_DATE_HEIGHT + HEADER_PERIOD_HEIGHT;

    const DAY_WIDTH = PERIOD_WIDTH * 7;

    const daysInView = useMemo(() => [currentViewDate], [currentViewDate]);

    // Row Reordering REMOVED - just use displayRows
    const sortedRows = displayRows;

    // Auto Scroll to Highlighted Row
    useEffect(() => {
        if (highlightedUserId && rowRefs.current[highlightedUserId]) {
            const rowEl = rowRefs.current[highlightedUserId];
            if (rowEl && scrollContainerRef.current) {
                // Scroll to top (under header)
                const container = scrollContainerRef.current;
                const targetScrollTop = rowEl.offsetTop - HEADER_TOTAL_HEIGHT;

                container.scrollTo({
                    top: targetScrollTop,
                    behavior: 'smooth'
                });
            }
        }
    }, [highlightedUserId, HEADER_TOTAL_HEIGHT]);

    const selectedUser = useMemo(() => {
        return displayRows.find(r => r.id === highlightedUserId);
    }, [displayRows, highlightedUserId]);

    // Fetch on Date Change
    useEffect(() => {
        fetchData();
    }, [currentViewDate, branch]);

    // Auto-fit Logic: Always Active
    const fitScale = () => {
        if (scrollContainerRef.current) {
            const containerWidth = scrollContainerRef.current.clientWidth;
            // Width of fixed headers + width of day data
            const contentRequiredWidth = BASE_SEAT_WIDTH + BASE_NAME_WIDTH + (BASE_PERIOD_WIDTH * 7);
            const newScale = containerWidth / contentRequiredWidth;
            // Allow scale to exactly fit, bounded reasonably
            setScale(Math.max(newScale, 0.5));
        }
    };

    // Initial Fit & Resize Listener
    useEffect(() => {
        fitScale();
        window.addEventListener('resize', fitScale);
        return () => window.removeEventListener('resize', fitScale);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch ONLY current view date
            const dateStr = format(currentViewDate, 'yyyy-MM-dd');
            // Use same date for start/end to fetch only one day
            const startDate = dateStr;
            const endDate = dateStr;

            const [userRes, logRes, vacRes, dailyMemoRes, memberMemoRes, pendingRes, todosRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('branch', branch).order('seat_number', { ascending: true, nullsLast: true }),
                supabase.from('attendance_logs').select('user_id, date, period, status').gte('date', startDate).lte('date', endDate),
                supabase.from('vacation_requests').select('*').gte('date', startDate).lte('date', endDate),
                supabase.from('attendance_memos').select('*').eq('date', dateStr).order('created_at', { ascending: true }),
                supabase.from('member_memos').select('*').order('created_at', { ascending: true }),
                supabase.from('pending_registrations').select('*').eq('branch', branch).order('expected_start_date', { ascending: true }),
                supabase.from('staff_todos').select('*').not('pending_registration_id', 'is', null)
            ]);

            if (userRes.error) throw userRes.error;
            if (logRes.error) throw logRes.error;  // etc...

            const MAX_SEATS = 102;
            const fullRows = [];
            const userMap = {};
            const unassignedUsers = [];
            (userRes.data || []).forEach(u => {
                if (u.seat_number) userMap[u.seat_number] = u;
                else unassignedUsers.push(u);
            });
            for (let i = 1; i <= MAX_SEATS; i++) {
                if (userMap[i]) fullRows.push(userMap[i]);
                else fullRows.push({ id: `empty_${i}`, seat_number: i, name: '공석', isEmpty: true });
            }
            unassignedUsers.forEach(u => fullRows.push({ ...u, isUnassigned: true, seat_number: null }));
            setDisplayRows(fullRows);

            const attSet = new Set();
            const statusMap = {};
            (logRes.data || []).forEach(l => {
                const key = `${l.user_id}_${l.date}_${l.period}`;
                attSet.add(key);
                if (l.status) statusMap[key] = l.status;
            });
            setAttendanceData(attSet);
            setStatusData(statusMap);

            const vacMap = {};
            (vacRes.data || []).forEach(v => vacMap[`${v.user_id}_${v.date}`] = v);
            setVacationData(vacMap);

            setDailyMemos(dailyMemoRes.data || []);
            setMemberMemos(memberMemoRes.data || []);

            // Filter pending employees: only show if start date hasn't passed OR todos not all complete
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const todosByPending = {};
            (todosRes.data || []).forEach(todo => {
                if (!todosByPending[todo.pending_registration_id]) {
                    todosByPending[todo.pending_registration_id] = [];
                }
                todosByPending[todo.pending_registration_id].push(todo);
            });
            setPendingTodos(todosByPending);

            const filteredPending = (pendingRes.data || []).filter(emp => {
                const todos = todosByPending[emp.id] || [];
                const allComplete = todos.length === 3 && todos.every(t => t.status === 'completed');
                const startDatePassed = emp.expected_start_date && emp.expected_start_date <= todayStr;
                // Show if: start date hasn't passed OR todos not all complete
                return !startDatePassed || !allComplete;
            });
            setIncomingEmployees(filteredPending);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleAttendance = async (user, dateStr, period) => {
        if (user.isEmpty) return;
        const key = `${user.id}_${dateStr}_${period}`;
        const isAttended = attendanceData.has(key);
        setAttendanceData(prev => {
            const next = new Set(prev);
            if (isAttended) next.delete(key);
            else next.add(key);
            return next;
        });
        // Clear status when toggling
        setStatusData(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        try {
            if (isAttended) await supabase.from('attendance_logs').delete().eq('user_id', user.id).eq('date', dateStr).eq('period', period);
            else await supabase.from('attendance_logs').insert({ user_id: user.id, date: dateStr, period: period });
        } catch (e) { fetchData(); }
    };

    // Long press handler - opens status popup
    const handleLongPress = (user, dateStr, period) => {
        setStatusPopup({ open: true, user, dateStr, period });
    };

    // Status selection handler
    const handleStatusSelect = async (status) => {
        const { user, dateStr, period } = statusPopup;
        if (!user) return;

        // Handle Vacation Requests
        if (['vacation_full', 'vacation_half_am', 'vacation_half_pm', 'vacation_cancel'].includes(status)) {
            try {
                if (status === 'vacation_cancel') {
                    // Delete vacation request
                    const { count, error } = await supabase.from('vacation_requests')
                        .delete({ count: 'exact' })
                        .eq('user_id', user.id)
                        .eq('date', dateStr);

                    if (error) throw error;
                    if (count === 0) {
                        alert('삭제된 휴가가 없습니다. 이미 삭제되었거나 권한이 없을 수 있습니다.');
                    } else {
                        // Optimistic Update: Remove from local state
                        setVacationData(prev => {
                            const next = { ...prev };
                            const key = `${user.id}_${dateStr}`;
                            delete next[key];
                            return next;
                        });
                        alert('휴가가 취소되었습니다.');
                        fetchData(); // Background refresh
                    }
                } else {
                    let type = 'full';
                    let periods = null;

                    if (status === 'vacation_half_am') {
                        type = 'half';
                        periods = [1, 2, 3, 4];
                    } else if (status === 'vacation_half_pm') {
                        type = 'half';
                        periods = [5, 6, 7];
                    }

                    // Check if a request already exists
                    const { data: existingVacation } = await supabase.from('vacation_requests')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('date', dateStr)
                        .single();

                    if (existingVacation) {
                        // Update existing
                        const { error } = await supabase.from('vacation_requests')
                            .update({
                                type: type,
                                periods: periods,
                                reason: null,
                                status: 'approved'
                            })
                            .eq('id', existingVacation.id);
                        if (error) throw error;
                    } else {
                        // Insert new
                        const { error } = await supabase.from('vacation_requests').insert({
                            user_id: user.id,
                            date: dateStr,
                            type: type,
                            periods: periods,
                            reason: null,
                            status: 'approved'
                        });
                        if (error) throw error;
                    }

                    // Optimistic Update: Add/Update local state
                    setVacationData(prev => {
                        const next = { ...prev };
                        const key = `${user.id}_${dateStr}`;
                        next[key] = { type, periods, reason: null, status: 'approved' };
                        return next;
                    });

                    fetchData(); // Background refresh
                }
            } catch (e) {
                console.error("Error creating vacation:", e);
                alert(`휴가 등록에 실패했습니다: ${e.message}`);
            }
            setStatusPopup({ open: false, user: null, dateStr: '', period: null });
            return;
        }

        const key = `${user.id}_${dateStr}_${period}`;

        if (status === 'absent') {
            // Delete attendance (make it X)
            setAttendanceData(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
            setStatusData(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
            try {
                await supabase.from('attendance_logs').delete().eq('user_id', user.id).eq('date', dateStr).eq('period', period);
            } catch (e) { fetchData(); }
        } else {
            // Set attendance with status
            setAttendanceData(prev => {
                const next = new Set(prev);
                next.add(key);
                return next;
            });
            if (status) {
                setStatusData(prev => ({ ...prev, [key]: status }));
            } else {
                setStatusData(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
            }
            try {
                // Check if record exists
                const { data: existing } = await supabase.from('attendance_logs')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('date', dateStr)
                    .eq('period', period)
                    .single();

                if (existing) {
                    await supabase.from('attendance_logs')
                        .update({ status: status || null })
                        .eq('user_id', user.id)
                        .eq('date', dateStr)
                        .eq('period', period);
                } else {
                    await supabase.from('attendance_logs').insert({
                        user_id: user.id,
                        date: dateStr,
                        period: period,
                        status: status || null
                    });
                }
            } catch (e) {
                console.error(e);
                fetchData();
            }
        }



        setStatusPopup({ open: false, user: null, dateStr: '', period: null });
        // Auto-advance after status selection (except specifically handled cases if any, but general rule apply)
        autoAdvanceSelection(user.id);
    };

    const addDailyMemo = async (content) => {
        if (!content) return;
        try {
            const { data, error } = await supabase.from('attendance_memos').insert({ date: format(currentViewDate, 'yyyy-MM-dd'), branch, content }).select().single();
            if (error) throw error;
            setDailyMemos(prev => [...prev, data]);
        } catch (e) { alert('메모 등록 실패'); }
    };
    const deleteDailyMemo = async (id) => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
            await supabase.from('attendance_memos').delete().eq('id', id);
            setDailyMemos(prev => prev.filter(m => m.id !== id));
        } catch (e) { alert('삭제 실패'); }
    };

    const handleSaveMemo = async (userId, content) => {
        try {
            // 1. Delete existing memos for this user
            const { error: deleteError } = await supabase
                .from('member_memos')
                .delete()
                .eq('user_id', userId);

            if (deleteError) throw deleteError;

            // 2. Insert new memo if content exists
            if (content) {
                const { error: insertError } = await supabase
                    .from('member_memos')
                    .insert({ user_id: userId, content: content });

                if (insertError) throw insertError;
            }

            // 3. Refresh memos locally
            // We could just refetch but let's try to update state optimistically or re-fetch all
            // Simple: Re-fetch all memos to be safe and consistent
            const { data, error } = await supabase.from('member_memos').select('*').order('created_at', { ascending: true });
            if (!error) {
                setMemberMemos(data || []);
                alert('저장되었습니다.');
                setIsPopupOpen(false);
                setHighlightedUserId(null); // Deselect
            }
        } catch (e) {
            console.error('Error saving memo:', e);
            alert('저장에 실패했습니다.');
        }
    };

    // Incoming Employee Functions
    const addIncomingEmployee = async (employee) => {
        try {
            const { data, error } = await supabase.from('incoming_employees').insert(employee).select().single();
            if (error) throw error;
            setIncomingEmployees(prev => [...prev, data].sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date)));
        } catch (e) {
            console.error(e);
            alert('입사예정자 등록 실패');
        }
    };

    const updateIncomingEmployee = async (id, updates) => {
        try {
            const { error } = await supabase.from('incoming_employees').update(updates).eq('id', id);
            if (error) throw error;
            setIncomingEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
        } catch (e) {
            console.error(e);
            alert('수정 실패');
        }
    };

    const deleteIncomingEmployee = async (id) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await supabase.from('incoming_employees').delete().eq('id', id);
            setIncomingEmployees(prev => prev.filter(e => e.id !== id));
        } catch (e) {
            console.error(e);
            alert('삭제 실패');
        }
    };

    const changeDate = (days) => {
        setCurrentViewDate(prev => addDays(prev, days));
    };

    const handleNameClick = (userId) => {
        if (!userId) return;
        if (highlightedUserId === userId) {
            // Toggle OFF
            setHighlightedUserId(null);
            setIsPopupOpen(false);
        } else {
            // Select New
            setHighlightedUserId(userId);
            setIsPopupOpen(true);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        const found = displayRows.find(r => r.name && r.name.includes(searchTerm.trim()) && !r.isEmpty);
        if (found) {
            setHighlightedUserId(found.id);
            setIsPopupOpen(true); // Open popup when found
            setSearchTerm('');
            setIsSearchOpen(false);
        } else {
            alert('사용자를 찾을 수 없습니다.');
        }
        // Ensure scroll happens after state update and render
        setTimeout(() => {
            if (found && rowRefs.current[found.id]) {
                const rowEl = rowRefs.current[found.id];
                if (scrollContainerRef.current) {
                    const container = scrollContainerRef.current;
                    const targetScrollTop = rowEl.offsetTop - HEADER_TOTAL_HEIGHT;
                    container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
                }
            }
        }, 100);
    };

    // Separator row configuration
    const TEAL_SEPARATOR_SEATS = [54, 102]; // 청록색 두꺼운 구분선 (열람실 구분)
    const THICK_SEPARATOR_SEATS = [7, 17, 22, 27, 32, 37, 42, 47, 52, 58, 62, 66, 70, 74, 78, 82, 83, 87, 90, 93, 96, 99];
    const THIN_SEPARATOR_SEATS = [9, 11, 13, 15, 50];

    const getSeparatorStyle = (seatNum) => {
        const numericSeat = Number(seatNum);
        if (TEAL_SEPARATOR_SEATS.includes(numericSeat)) {
            return { height: 6, color: '#267E82' }; // 청록색
        } else if (THICK_SEPARATOR_SEATS.includes(numericSeat)) {
            return { height: 4, color: '#718096' }; // 두꺼운 회색
        } else if (THIN_SEPARATOR_SEATS.includes(numericSeat)) {
            return { height: 2, color: '#a0aec0' }; // 얇은 회색
        }
        return null;
    };

    const getSeatStyle = (seatNum) => {
        let bgColor = 'white';
        const numericSeat = Number(seatNum);

        if (numericSeat >= 8 && numericSeat <= 17) bgColor = '#edf2f7';
        else if (numericSeat === 53 || numericSeat === 54) bgColor = '#cbd5e0';
        else if (numericSeat === 83) bgColor = '#fed7d7';
        return { bgColor };
    };

    const handleCellSelect = (user, dateStr, period) => {
        setSelectedCell({ userId: user.id, dateStr, period });
    };

    const autoAdvanceSelection = (currentUserId) => {
        const currentIndex = sortedRows.findIndex(u => u.id === currentUserId);
        if (currentIndex !== -1 && currentIndex < sortedRows.length - 1) {
            let nextIndex = currentIndex + 1;
            const nextUser = sortedRows[nextIndex];
            setSelectedCell(prev => ({ ...prev, userId: nextUser.id }));

            // Scroll if needed
            if (rowRefs.current[nextUser.id]) {
                const rowEl = rowRefs.current[nextUser.id];
                if (scrollContainerRef.current) {
                    const container = scrollContainerRef.current;
                    const rowTop = rowEl.offsetTop;
                    const rowBottom = rowTop + rowEl.offsetHeight;
                    const containerTop = container.scrollTop + HEADER_TOTAL_HEIGHT;
                    const containerBottom = container.scrollTop + container.clientHeight;

                    if (rowBottom > containerBottom) {
                        container.scrollTo({ top: container.scrollTop + rowEl.offsetHeight, behavior: 'smooth' });
                    } else if (rowTop < containerTop) {
                        container.scrollTo({ top: rowTop - HEADER_TOTAL_HEIGHT, behavior: 'smooth' });
                    }
                }
            }
        }
    };

    const handleActionInput = async (type) => {
        if (!selectedCell) return;
        const { userId, dateStr, period } = selectedCell;
        const user = displayRows.find(u => u.id === userId);
        if (!user) return;

        // 1. Perform UI Logic (Auto-Advance) IMMEDIATELY
        if (type === 'O' || type === 'X') {
            autoAdvanceSelection(userId);
        } else if (type === 'OTHER') {
            setStatusPopup({ open: true, user, dateStr, period });
            return; // Don't auto advance for OTHER (yet)
        }

        // 2. Perform Business Logic (State/DB Update) in Background
        (async () => {
            if (type === 'O') {
                const key = `${userId}_${dateStr}_${period}`;
                const isAttended = attendanceData.has(key);
                const status = statusData[key];

                if (!isAttended || status) {
                    if (isAttended) {
                        if (status) {
                            setAttendanceData(prev => prev.add(key));
                            setStatusData(prev => { const n = { ...prev }; delete n[key]; return n; });
                            try {
                                await supabase.from('attendance_logs').update({ status: null }).eq('user_id', user.id).eq('date', dateStr).eq('period', period);
                            } catch (e) { fetchData(); }
                        }
                    } else {
                        await toggleAttendance(user, dateStr, period);
                    }
                }
            } else if (type === 'X') {
                const key = `${userId}_${dateStr}_${period}`;
                const isAttended = attendanceData.has(key);
                if (isAttended) {
                    await toggleAttendance(user, dateStr, period);
                }
            }
        })();
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
            {/* Header: Row 1 Date (Top), Row 2 Memo (Bottom) */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                {/* Row 1: Centered Date Navigator (Top) - Adjusted Padding */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', padding: '15px 10px 0 10px', position: 'relative' }}>
                    <button onClick={() => changeDate(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '5px' }}>
                        <ChevronLeft size={24} color="#4a5568" />
                    </button>
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2d3748', minWidth: '150px', textAlign: 'center' }}>
                        {format(currentViewDate, 'yyyy.MM.dd (EEE)', { locale: ko })}
                    </span>
                    <button onClick={() => changeDate(1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '5px' }}>
                        <ChevronRight size={24} color="#4a5568" />
                    </button>
                </div>

                {/* Row 2: Search (Left) & Memo (Right) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px 10px 10px', gap: '8px', flexWrap: 'nowrap' }}>
                    {/* Search Button/Input */}
                    <div style={{ flexShrink: 0 }}>
                        {isSearchOpen ? (
                            <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', height: '32px', boxSizing: 'border-box',
                                    background: 'white', border: '1px solid #cbd5e0', borderRadius: '20px',
                                    padding: '0 10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    <Search size={16} color="#a0aec0" style={{ marginRight: '5px' }} />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="이름 검색"
                                        style={{
                                            border: 'none', outline: 'none', fontSize: '0.85rem', width: '80px', color: '#4a5568'
                                        }}
                                        autoFocus
                                        onBlur={() => {
                                            if (!searchTerm) setIsSearchOpen(false);
                                        }}
                                    />
                                </div>
                                <button type="submit" style={{ display: 'none' }}></button>
                            </form>
                        ) : (
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                style={{
                                    background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px',
                                    padding: '6px 10px', fontSize: 'clamp(0.65rem, 2.5vw, 0.85rem)', color: '#718096', fontWeight: 'bold',
                                    display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)', height: '32px', whiteSpace: 'nowrap'
                                }}
                            >
                                <Search size={14} />
                                <span>이름 검색</span>
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 1, minWidth: 0 }}>
                        <button
                            onClick={() => setShowIncomingModal(true)}
                            style={{
                                background: '#e6fffa', border: '1px solid #b2f5ea', borderRadius: '16px',
                                padding: '6px 10px', fontSize: 'clamp(0.6rem, 2.5vw, 0.85rem)', color: '#267E82', fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer',
                                height: '32px', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0
                            }}
                        >
                            <UserPlus size={14} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>입사예정자 관리</span>
                            {incomingEmployees.length > 0 && (
                                <span style={{
                                    color: '#267E82', background: 'white', width: '18px', height: '18px',
                                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.7rem', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', flexShrink: 0
                                }}>
                                    {incomingEmployees.length}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setShowMemoModal(true)}
                            style={{
                                background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '16px',
                                padding: '6px 10px', fontSize: 'clamp(0.6rem, 2.5vw, 0.85rem)', color: '#2b6cb0', fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer',
                                height: '32px', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0
                            }}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>오늘 출석 참고사항</span>
                            {dailyMemos.length > 0 && (
                                <span style={{
                                    color: '#38a169', background: 'white', width: '18px', height: '18px',
                                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.7rem', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', flexShrink: 0
                                }}>
                                    {dailyMemos.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                style={{
                    flex: 1, overflow: 'auto', position: 'relative', touchAction: 'pan-x pan-y',
                    display: 'flex', justifyContent: 'center'
                }}
            >
                <div ref={contentRef} style={{ width: 'max-content', transformOrigin: '0 0', alignSelf: 'flex-start' }}>
                    {/* Fixed Header */}
                    <div style={{ position: 'sticky', top: 0, zIndex: 30, display: 'flex', width: 'max-content', backgroundColor: '#f7fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        {/* Sticky Columns Left Header */}
                        <div style={{ position: 'sticky', left: 0, zIndex: 40, display: 'flex', height: HEADER_TOTAL_HEIGHT, backgroundColor: '#f7fafc', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>
                            <div style={{ width: SEAT_WIDTH, borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: `${0.85 * scale}rem`, color: '#4a5568' }}>좌석</div>
                            <div style={{ width: NAME_WIDTH, borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: `${0.85 * scale}rem`, color: '#4a5568' }}>이름</div>
                        </div>
                        {/* Day Header - Dynamic Day */}
                        <div style={{ display: 'flex' }}>
                            {daysInView.map(date => (
                                <div key={format(date, 'yyyy-MM-dd')} style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ height: HEADER_DATE_HEIGHT, width: DAY_WIDTH, borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ebf8ff', color: '#2b6cb0', fontWeight: 'bold', fontSize: `${0.9 * scale}rem` }}>
                                        {format(date, 'M.d(EEE)', { locale: ko })}
                                    </div>
                                    <div style={{ display: 'flex', height: HEADER_PERIOD_HEIGHT }}>
                                        {[1, 2, 3, 4, 5, 6, 7].map(p => (
                                            <div key={p} style={{ width: PERIOD_WIDTH, borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${0.8 * scale}rem`, color: '#718096' }}>{p}</div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rows */}
                    <div style={{ width: 'max-content', paddingBottom: '100px' }}>
                        {sortedRows.map(user => {
                            const isDeactivated = user.isEmpty;
                            // Allow highlighting for unassigned users too (user.isUnassigned)
                            const isRowHighlighted = highlightedUserId === user.id && !user.isEmpty;
                            const isAnyHighlighted = highlightedUserId !== null;
                            const { bgColor } = getSeatStyle(user.seat_number);
                            let rowOpacity = isAnyHighlighted ? (isRowHighlighted ? 1 : 0.4) : 1;
                            // Use distinct background for unassigned users if not highlighted
                            let stickyBg = isRowHighlighted ? '#ebf8ff' : (user.isEmpty ? '#f7fafc' : (user.isUnassigned ? 'white' : bgColor));
                            const separatorStyle = getSeparatorStyle(user.seat_number);

                            return (
                                <React.Fragment key={user.id}>
                                    <div
                                        ref={el => rowRefs.current[user.id] = el}
                                        style={{ display: 'flex', height: ROW_HEIGHT, borderBottom: '1px solid #edf2f7', opacity: rowOpacity, transition: 'opacity 0.2s, transform 0.3s' }}
                                    >
                                        {/* Sticky Name/Seat */}
                                        <div style={{ position: 'sticky', left: 0, zIndex: 10, display: 'flex', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)', alignItems: 'flex-start', backgroundColor: stickyBg, height: '100%' }}>
                                            {isRowHighlighted && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ROW_HEIGHT, borderTop: '2px solid #3182ce', borderBottom: '2px solid #3182ce', borderLeft: '2px solid #3182ce', pointerEvents: 'none', zIndex: 20 }} />}
                                            <div style={{ width: SEAT_WIDTH, height: ROW_HEIGHT, borderRight: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', background: stickyBg, color: user.isEmpty ? '#cbd5e0' : '#a0aec0', fontSize: `${0.8 * scale}rem` }}>{user.seat_number || '-'}</div>
                                            <div onClick={() => handleNameClick(user.id)} style={{ width: NAME_WIDTH, height: ROW_HEIGHT, borderRight: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', background: stickyBg, color: '#2d3748', fontSize: `${0.9 * scale}rem`, fontWeight: user.isEmpty ? 'normal' : 'bold', cursor: user.isEmpty ? 'default' : 'pointer' }}>{user.name}</div>
                                        </div>
                                        {/* Scrollable Day Data */}
                                        <div style={{ display: 'flex', position: 'relative' }}>
                                            {isRowHighlighted && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ROW_HEIGHT, borderTop: '2px solid #3182ce', borderBottom: '2px solid #3182ce', pointerEvents: 'none', zIndex: 5 }} />}
                                            {daysInView.map(date => {
                                                const incoming = incomingEmployees.find(i => i.seat_number === user.seat_number);
                                                let showIncoming = false;
                                                let incomingColor = '#fefcbf'; // Yellow by default (todos incomplete)
                                                let incomingTextColor = '#b7791f';

                                                if (incoming) {
                                                    const todos = pendingTodos[incoming.id] || [];
                                                    const allComplete = todos.length === 3 && todos.every(t => t.status === 'completed');

                                                    if (allComplete) {
                                                        // All todos complete - show green
                                                        incomingColor = '#c6f6d5';
                                                        incomingTextColor = '#2f855a';
                                                    }
                                                    // Always show until start date passes
                                                    showIncoming = true;
                                                }

                                                if (showIncoming) {
                                                    const dateStr = incoming.expected_start_date ? format(new Date(incoming.expected_start_date), 'M.d(EEE)', { locale: ko }) : '';
                                                    const seatStr = incoming.seat_number ? `${incoming.seat_number}번` : '';
                                                    const certStr = incoming.target_certificate || '';
                                                    const incomingText = `${dateStr} ${seatStr} ${incoming.name} ${certStr}`.trim();

                                                    // Calculate font size based on text length to fit in one line
                                                    const baseFontSize = 0.9 * scale;
                                                    const textLen = incomingText.length;
                                                    // Reduce font size for longer text
                                                    const adjustedFontSize = textLen > 25 ? Math.max(baseFontSize * (25 / textLen), baseFontSize * 0.5) : baseFontSize;

                                                    return (
                                                        <div key={format(date, 'yyyy-MM-dd')} style={{
                                                            display: 'flex', height: ROW_HEIGHT, width: DAY_WIDTH,
                                                            background: incomingColor, color: incomingTextColor,
                                                            alignItems: 'center', justifyContent: 'center',
                                                            fontWeight: 'bold', fontSize: `${adjustedFontSize}rem`,
                                                            borderBottom: '1px solid #e2e8f0',
                                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                            padding: '0 5px', boxSizing: 'border-box'
                                                        }}>
                                                            {incomingText}
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={format(date, 'yyyy-MM-dd')} style={{ display: 'flex', height: ROW_HEIGHT }}>
                                                        {[1, 2, 3, 4, 5, 6, 7].map(p => (
                                                            <AttendanceCell
                                                                key={p}
                                                                user={user}
                                                                dateStr={format(date, 'yyyy-MM-dd')}
                                                                period={p}
                                                                isRowHighlighted={isRowHighlighted}
                                                                isSelected={selectedCell?.userId === user.id && selectedCell?.dateStr === format(date, 'yyyy-MM-dd') && selectedCell?.period === p}
                                                                onSelect={handleCellSelect}
                                                                attendanceData={attendanceData}
                                                                statusData={statusData}
                                                                vacationData={vacationData}
                                                                onLongPress={handleLongPress}
                                                                width={PERIOD_WIDTH}
                                                                scale={scale}
                                                            />
                                                        ))}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    {/* Separator Row */}
                                    {separatorStyle && (
                                        <div style={{ height: separatorStyle.height, backgroundColor: separatorStyle.color, width: '100%' }} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom Popup Section */}
            {isPopupOpen && selectedUser && (
                <div style={{ height: '50%', flexShrink: 0, zIndex: 50 }}>
                    <UserMemoPopup
                        user={selectedUser}
                        memberMemos={memberMemos}
                        onSave={handleSaveMemo}
                        onClose={() => {
                            setIsPopupOpen(false);
                            setHighlightedUserId(null);
                        }}
                    />
                </div>
            )}

            {/* Daily Memos Modal */}
            {showMemoModal && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748' }}>{format(currentViewDate, 'yyyy.MM.dd')} 참고사항</h3>
                            <button onClick={() => setShowMemoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={24} color="#a0aec0" /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f7fafc' }}>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {dailyMemos.length === 0 && <li style={{ color: '#a0aec0', textAlign: 'center' }}>등록된 참고사항이 없습니다.</li>}
                                {dailyMemos.map((memo, idx) => (
                                    <li key={memo.id} style={{ background: 'white', padding: '12px', borderRadius: '12px', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}><span style={{ fontWeight: 'bold', color: '#3182ce', minWidth: '20px' }}>{idx + 1}.</span><span style={{ color: '#4a5568', wordBreak: 'break-all', lineHeight: 1.4 }}>{memo.content}</span></div>
                                        <button onClick={() => deleteDailyMemo(memo.id)} style={{ background: '#fff5f5', color: '#e53e3e', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '0.8rem', cursor: 'pointer', marginLeft: '10px', fontWeight: 'bold' }}>삭제</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', background: 'white', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                            <input type="text" value={newMemo} onChange={(e) => setNewMemo(e.target.value)} placeholder="참고사항을 입력하세요" style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem', outline: 'none' }} onKeyPress={(e) => e.key === 'Enter' && addDailyMemo(newMemo.trim())} />
                            <button onClick={() => { addDailyMemo(newMemo.trim()); setNewMemo(''); }} style={{ background: '#3182ce', color: 'white', border: 'none', borderRadius: '10px', padding: '0 20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><Plus size={18} />등록</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Status Selection Popup */}
            {/* Status Selection Popup */}
            {statusPopup.open && (
                <StatusPopup
                    onSelect={handleStatusSelect}
                    onClose={() => setStatusPopup({ open: false, user: null, dateStr: '', period: null })}
                />
            )}

            {/* Incoming Employees Modal */}
            {showIncomingModal && (
                <IncomingEmployeeModal
                    onClose={() => setShowIncomingModal(false)}
                />
            )}


            {/* Bottom Control Bar - Restored and Optimized */}
            <div style={{
                flexShrink: 0,
                height: '60px',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 15px',
                zIndex: 100,
                boxShadow: '0 -2px 10px rgba(0,0,0,0.08)',
                borderTop: '1px solid #e2e8f0',
                gap: '10px'
            }}>
                {/* Left Side: Selected User Info */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {selectedCell && (() => {
                        const activeUser = displayRows.find(u => u.id === selectedCell.userId);
                        if (!activeUser) return null;
                        return (
                            <>
                                <span style={{ fontSize: '0.75rem', color: '#718096' }}>{activeUser.seat_number ? `좌석 ${activeUser.seat_number}` : '-'}</span>
                                <span style={{
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    color: '#2d3748',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {activeUser.name}
                                </span>
                            </>
                        );
                    })()}
                </div>

                {/* Right Side: Action Buttons */}
                <div style={{ display: 'flex', gap: '6px', height: '44px' }}>
                    <button
                        onClick={() => handleActionInput('O')}
                        style={{
                            width: '55px', height: '100%',
                            borderRadius: '10px', border: 'none',
                            background: '#c6f6d5', color: '#22543d',
                            fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    >
                        O
                    </button>
                    <button
                        onClick={() => handleActionInput('X')}
                        style={{
                            width: '55px', height: '100%',
                            borderRadius: '10px', border: 'none',
                            background: '#fed7d7', color: '#c53030',
                            fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    >
                        X
                    </button>
                    <button
                        onClick={() => handleActionInput('OTHER')}
                        style={{
                            width: '55px', height: '100%',
                            borderRadius: '10px', border: '1px solid #cbd5e0',
                            background: 'white', color: '#4a5568',
                            fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    >
                        기타
                    </button>
                    <button
                        onClick={() => {
                            if (selectedCell) autoAdvanceSelection(selectedCell.userId);
                        }}
                        style={{
                            width: '55px', height: '100%',
                            borderRadius: '10px', border: 'none',
                            background: '#edf2f7', color: '#4a5568',
                            fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    >
                        <CornerDownLeft size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StaffDailyAttendance;
