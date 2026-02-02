import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import EmbeddedCalendar from './EmbeddedCalendar';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { getTodayString } from '../utils/dateUtils';
import { ko } from 'date-fns/locale';

const InlineVacationRequest = () => {
    const { user } = useAuth();

    // View Mode removed - always show both

    const [date, setDate] = useState('');
    const [type, setType] = useState('full'); // 'full' | 'half_am' | 'half_pm'
    const [loading, setLoading] = useState(false);

    const [myRequests, setMyRequests] = useState([]);
    const [specialAttendance, setSpecialAttendance] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [dbError, setDbError] = useState(false);

    // Fetch all data
    useEffect(() => {
        if (user) {
            fetchRequests();
            fetchSpecialAttendance();
        }
    }, [user]);

    const fetchRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('vacation_requests')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: true });

            if (error) throw error;
            setMyRequests(data || []);
        } catch (err) {
            console.error('Error fetching requests:', err);
        }
    };

    const fetchSpecialAttendance = async () => {
        try {
            setDbError(false);
            const { data, error } = await supabase
                .from('attendance_logs')
                .select('date, period, status')
                .eq('user_id', user.id)
                .not('status', 'is', null)
                .order('date', { ascending: false })
                .limit(200);

            if (error) throw error;
            setSpecialAttendance(data || []);
        } catch (err) {
            console.error('Error fetching special attendance:', err);
            if (err.message && err.message.includes('column "status" does not exist')) {
                setDbError(true);
            }
        }
    };

    const handleSubmit = async () => {
        if (!date) {
            alert('날짜를 선택해주세요.');
            return;
        }

        let dbType = 'full';
        let periods = null;

        if (type === 'half_am') {
            dbType = 'half';
            periods = [1, 2, 3, 4];
        } else if (type === 'half_pm') {
            dbType = 'half';
            periods = [5, 6, 7];
        }

        let typeName = type === 'full' ? '월차' : type === 'half_am' ? '오전반차' : '오후반차';

        if (!confirm(`${date}에 ${typeName}를 신청하시겠습니까?`)) return;

        setLoading(true);
        try {
            const payload = {
                user_id: user.id,
                type: dbType,
                date,
                periods,
                reason: null
            };

            const { error } = await supabase
                .from('vacation_requests')
                .insert([payload]);

            if (error) throw error;

            alert('휴가 신청이 완료되었습니다.');
            setDate(''); // Reset
            fetchRequests(); // Refresh list
            fetchRequests(); // Refresh list
            // setViewMode('history'); - Removed
        } catch (err) {
            console.error('Error submitting vacation request:', err);
            alert('신청에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id, date) => {
        if (!confirm(`${date} 휴가 신청을 취소하시겠습니까?`)) return;

        try {
            const { error } = await supabase
                .from('vacation_requests')
                .delete()
                .eq('id', id);

            if (error) throw error;
            alert('취소되었습니다.');
            fetchRequests();
        } catch (err) {
            console.error('Error cancelling request:', err);
            alert('취소에 실패했습니다.');
        }
    };

    // Merge and Filter List logic (same as VacationRequest.jsx)
    const mergedList = useMemo(() => {
        // 1. Tag vacation items
        const requests = myRequests.map(r => ({ ...r, category: 'vacation' }));

        // 2. Group attendance records by date + status
        const attendanceGroups = {};
        specialAttendance.forEach(a => {
            const key = `${a.date}_${a.status}`;
            if (!attendanceGroups[key]) {
                attendanceGroups[key] = {
                    date: a.date,
                    status: a.status,
                    periods: [],
                    category: 'attendance',
                    id: `att_${a.date}_${a.status}`
                };
            }
            attendanceGroups[key].periods.push(a.period);
        });
        // Sort periods within each group
        Object.values(attendanceGroups).forEach(group => {
            group.periods.sort((a, b) => a - b);
        });
        const groupedAttendances = Object.values(attendanceGroups);

        // 3. Merge
        const all = [...requests, ...groupedAttendances];

        // 4. Filter by month (String comparison)
        const targetMonth = format(selectedMonth, 'yyyy-MM');
        const filtered = all.filter(item => item.date.startsWith(targetMonth));

        // 5. Sort by date desc
        return filtered.sort((a, b) => {
            if (a.date !== b.date) return new Date(b.date) - new Date(a.date);
            return 0;
        });
    }, [myRequests, specialAttendance, selectedMonth]);


    // Date constraints
    const todayStr = getTodayString();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 14);
    const maxDateStr = format(maxDate, 'yyyy-MM-dd');

    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            marginBottom: '20px',
            height: '100%',
            overflowY: 'auto'
        }}>
            {/* Embedded Calendar - Controlled Month */}
            <div style={{ marginBottom: '20px' }}>
                <EmbeddedCalendar
                    selectedDate={date}
                    onSelectDate={(val) => {
                        if (val < todayStr) {
                            alert('지난 날짜는 신청할 수 없습니다.');
                            return;
                        }
                        if (val > maxDateStr) {
                            alert('최대 2주 뒤까지만 신청 가능합니다.');
                            return;
                        }
                        setDate(val);
                    }}
                    events={useMemo(() => [
                        ...myRequests,
                        ...specialAttendance.map(a => ({
                            ...a,
                            type: 'special',
                            reason: a.status
                        }))
                    ], [myRequests, specialAttendance])}
                    minDate={todayStr}
                    maxDate={maxDateStr}
                    // Sync Month State
                    currentMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                />
            </div>

            {/* Button Group */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <button
                    onClick={() => setType('full')}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: type === 'full' ? '2px solid #e53e3e' : '1px solid #e2e8f0', // Red for Full
                        background: type === 'full' ? '#fff5f5' : 'white',
                        color: type === 'full' ? '#c53030' : '#4a5568',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    월차
                </button>
                <button
                    onClick={() => setType('half_am')}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: type === 'half_am' ? '2px solid #3182ce' : '1px solid #e2e8f0', // Blue for Half
                        background: type === 'half_am' ? '#ebf8ff' : 'white',
                        color: type === 'half_am' ? '#2c5282' : '#4a5568',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    오전반차
                </button>
                <button
                    onClick={() => setType('half_pm')}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: type === 'half_pm' ? '2px solid #3182ce' : '1px solid #e2e8f0', // Blue for Half
                        background: type === 'half_pm' ? '#ebf8ff' : 'white',
                        color: type === 'half_pm' ? '#2c5282' : '#4a5568',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    오후반차
                </button>
            </div>

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                    width: '100%',
                    padding: '15px',
                    borderRadius: '12px',
                    background: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: loading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '25px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
            >
                <CheckCircle size={20} />
                {loading ? '신청 중...' : '신청하기'}
            </button>

            {/* History Section (Merged List) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>

                {/* NOTE: Month Selector removed. Synced with Calendar above. */}


                {dbError && (
                    <div style={{ background: '#fff5f5', color: '#c53030', padding: '12px', borderRadius: '8px', border: '1px solid #fc8181', fontSize: '0.85rem' }}>
                        ⚠️ DB 업데이트 필요: 관리자 문의 요망
                    </div>
                )}

                {mergedList.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#a0aec0', padding: '30px 0', background: '#f7fafc', borderRadius: '8px' }}>
                        내역이 없습니다.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {mergedList.map((item) => {
                            // Attendance Item
                            if (item.category === 'attendance') {
                                return (
                                    <div
                                        key={item.id}
                                        style={{
                                            background: 'white',
                                            borderRadius: '8px',
                                            padding: '12px 16px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            borderLeft: '4px solid #38a169',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#2d3748' }}>
                                                {format(parseISO(item.date), 'MM.dd(EEE)', { locale: ko })}
                                            </span>
                                            <span style={{
                                                fontSize: '0.85rem', fontWeight: 'bold',
                                                color: '#c53030',
                                                background: '#c6f6d5',
                                                padding: '2px 6px',
                                                borderRadius: '4px'
                                            }}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <div style={{ color: '#718096', fontSize: '0.85rem' }}>
                                            {item.periods.join(', ')}교시
                                        </div>
                                    </div>
                                );
                            }

                            // Vacation Request Item
                            const req = item;
                            const isPast = req.date < todayStr;

                            // Determine Label and Style
                            let labelText = '';
                            let mainColor = '#3182ce'; // Default Blue
                            let subColor = '#ebf8ff';
                            let textColor = '#2c5282';

                            if (req.type === 'full') {
                                labelText = '월차';
                                mainColor = '#e53e3e'; // Red
                                subColor = '#fff5f5';
                                textColor = '#c53030';
                            } else if (req.type === 'special') {
                                labelText = '특별휴가';
                                mainColor = '#e53e3e'; // Red for special too usually? Or maybe separate. Keeping Red as it's critical.
                                subColor = '#fff5f5';
                                textColor = '#c53030';
                            } else {
                                // Half
                                if (req.periods && req.periods.length > 0) {
                                    // Heuristic for AM/PM
                                    const isAm = req.periods.includes(1);
                                    const isPm = req.periods.includes(5); // Assuming 5,6,7 is PM
                                    if (isAm && !isPm) labelText = '오전반차';
                                    else if (!isAm && isPm) labelText = '오후반차';
                                    else labelText = '반차';
                                } else {
                                    labelText = '반차';
                                }
                                // Half is Blue
                                mainColor = '#3182ce';
                                subColor = '#ebf8ff';
                                textColor = '#2c5282';
                            }

                            // Override for 'Other Leave' (Gray)
                            if (req.reason) {
                                const allowedReasons = ['알바', '스터디', '병원'];
                                if (allowedReasons.includes(req.reason)) {
                                    labelText = req.reason;
                                    // Gray Style
                                    mainColor = '#cbd5e0';
                                    subColor = '#f7fafc';
                                    textColor = '#4a5568';
                                }
                            }

                            return (
                                <div
                                    key={req.id}
                                    style={{
                                        background: 'white',
                                        borderRadius: '8px',
                                        padding: '12px 16px',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        borderLeft: `4px solid ${mainColor}`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#2d3748' }}>
                                            {format(parseISO(req.date), 'MM.dd(EEE)', { locale: ko })}
                                        </span>
                                        <span style={{
                                            background: subColor,
                                            color: textColor,
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {labelText}
                                        </span>
                                    </div>


                                    {req.type === 'special' && req.reason && (
                                        <div style={{ color: '#e53e3e', fontSize: '0.85rem' }}>
                                            사유: {req.reason}
                                        </div>
                                    )}

                                    {!isPast && (
                                        <button
                                            onClick={() => handleCancel(req.id, req.date)}
                                            style={{
                                                alignSelf: 'flex-end',
                                                background: '#fff5f5',
                                                color: '#e53e3e',
                                                border: '1px solid #fc8181',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                marginTop: '4px'
                                            }}
                                        >
                                            <Trash2 size={12} />
                                            취소
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InlineVacationRequest;
