import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import CustomDatePicker from './CustomDatePicker';

const InlineVacationRequest = () => {
    const { user } = useAuth();
    const [date, setDate] = useState('');
    const [type, setType] = useState('full'); // 'full' | 'half_am' | 'half_pm'
    const [loading, setLoading] = useState(false);
    const [myRequests, setMyRequests] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    // Fetch requests
    useEffect(() => {
        if (user) {
            fetchRequests();
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

    const handlePrevMonth = () => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(newDate.getMonth() - 1);
        setSelectedMonth(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(newDate.getMonth() + 1);
        setSelectedMonth(newDate);
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
        } catch (err) {
            console.error('Error submitting vacation request:', err);
            alert('신청에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // Filter requests by selected month
    const todayStr = new Date().toISOString().split('T')[0];
    const yearMonthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;

    // List for the selected month
    const filteredRequests = myRequests.filter(req => req.date.startsWith(yearMonthStr));
    // Sort by date (oldest to newest for list view? or newest? Usually calendar order is nice, let's do Date Ascending)
    const sortedRequests = [...filteredRequests].sort((a, b) => a.date.localeCompare(b.date));

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

    // Filter Current Month for Calendar
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const renderCalendar = () => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        const daysInMonth = getDaysInMonth(selectedMonth);
        const firstDay = getFirstDayOfMonth(selectedMonth);

        const days = [];
        // Empty cells
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty - ${i} `} style={{ height: '35px' }}></div>);
        }

        // Days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const req = myRequests.find(r => r.date === dateStr);
            let bgColor = 'transparent';
            let textColor = '#2d3748';
            let borderStyle = 'none';

            if (req) {
                if (req.type === 'full') { // 월차
                    bgColor = '#fff5f5'; // Red-50
                    textColor = '#c53030'; // Red-700
                    borderStyle = '1px solid #feb2b2';
                } else if (req.type === 'half') { // 반차
                    bgColor = '#ebf8ff'; // Blue-50
                    textColor = '#2c5282'; // Blue-800
                    borderStyle = '1px solid #bee3f8';
                }
            }

            days.push(
                <div key={d} style={{
                    height: '35px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: bgColor,
                    color: textColor,
                    border: borderStyle,
                    borderRadius: '6px', // Rounded Square
                    fontWeight: req ? 'bold' : 'normal',
                    fontSize: '0.9rem',
                    margin: '2px',
                    cursor: 'default'
                }}>
                    {d}
                </div>
            );
        }

        return days;
    };

    // Date constraints
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 14);
    const maxDateStr = maxDate.toISOString().split('T')[0];

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
            {/* Month Navigation */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#f7fafc', padding: '8px 15px', borderRadius: '20px' }}>
                    <button onClick={handlePrevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                        <ChevronLeft size={20} color="#4a5568" />
                    </button>
                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2d3748' }}>
                        {selectedMonth.getFullYear()}.{selectedMonth.getMonth() + 1}
                    </span>
                    <button onClick={handleNextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                        <ChevronRight size={20} color="#4a5568" />
                    </button>
                </div>
            </div>

            {/* Button Group */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
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
                        cursor: 'pointer'
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
                        cursor: 'pointer'
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
                        cursor: 'pointer'
                    }}
                >
                    오후반차
                </button>
            </div>

            {/* Date Picker */}
            <div style={{ marginBottom: '15px' }}>
                <CustomDatePicker
                    value={date}
                    onChange={(val) => {
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
                    min={todayStr}
                    max={maxDateStr}
                />
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
                    marginBottom: '25px'
                }}
            >
                {loading ? '신청 중...' : '신청하기'}
            </button>

            {/* Request List (Filtered by Month) */}
            <div style={{ marginBottom: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <CalendarIcon size={18} color="#2d3748" />
                    <h4 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2d3748', margin: 0 }}>
                        {selectedMonth.getMonth() + 1}월 휴무 신청 내역
                    </h4>
                </div>
                {sortedRequests.length === 0 ? (
                    <div style={{ color: '#a0aec0', fontSize: '0.9rem', paddingLeft: '24px' }}>해당 월의 내역이 없습니다.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {sortedRequests.map(req => {
                            const isPast = req.date < todayStr;
                            let bgColor, borderColor, textColor;

                            if (isPast) {
                                bgColor = '#f7fafc'; // Gray
                                borderColor = '#cbd5e0';
                                textColor = '#a0aec0';
                            } else {
                                // Future
                                if (req.type === 'full') {
                                    bgColor = '#fff5f5';
                                    borderColor = '#e53e3e';
                                    textColor = '#c53030';
                                } else {
                                    bgColor = '#ebf8ff';
                                    borderColor = '#3182ce';
                                    textColor = '#2c5282';
                                }
                            }

                            return (
                                <div key={req.id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '12px',
                                    background: bgColor,
                                    borderRadius: '8px',
                                    borderLeft: `4px solid ${borderColor} `
                                }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold', color: isPast ? '#a0aec0' : '#2d3748' }}>
                                            {req.date}({['일', '월', '화', '수', '목', '금', '토'][new Date(req.date).getDay()]})
                                        </span>
                                        <span style={{
                                            fontSize: '0.9rem',
                                            fontWeight: 'bold',
                                            color: textColor
                                        }}>
                                            {req.type === 'full' ? '월차' : (req.periods?.includes(1) ? '오전반차' : (req.periods?.includes(5) ? '오후반차' : '반차'))}
                                        </span>
                                    </div>
                                    {!isPast && (
                                        <button
                                            onClick={() => handleCancel(req.id, req.date)}
                                            style={{
                                                background: '#fee2e2',
                                                color: '#e53e3e',
                                                border: 'none',
                                                padding: '5px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            취소
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Monthly Calendar */}
            <div>


                {/* Calendar Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    color: '#718096',
                    marginBottom: '5px'
                }}>
                    <div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: '5px' }}>
                    {renderCalendar()}
                </div>
            </div>
        </div>
    );
};

export default InlineVacationRequest;
