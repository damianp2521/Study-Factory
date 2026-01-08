import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const MonthlyLeaveStatus = () => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('전체 지점');
    const [branchOptions, setBranchOptions] = useState(['전체 지점', '망미점', '센텀점', '미지정']);
    const [selectedUserId, setSelectedUserId] = useState(null);

    // Grid State
    const [calendarDays, setCalendarDays] = useState([]);

    useEffect(() => {
        fetchMonthlyLeaves();
        generateCalendar();
        fetchBranches();
    }, [currentDate]);

    // Fetch unique branches from profiles
    const fetchBranches = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('branch');

            if (error) throw error;

            if (data) {
                // Extract unique branches
                const uniqueBranches = [...new Set(data.map(item => item.branch || '미지정'))];
                // Sort and add '전체 지점' at start
                const sortedBranches = ['전체 지점', ...uniqueBranches.filter(b => b !== '전체 지점').sort()];
                setBranchOptions(sortedBranches);
            }
        } catch (err) {
            console.error('Error fetching branches:', err);
        }
    };

    // 1. Generate Calendar Grid
    const generateCalendar = () => {
        // ... (existing code, unchanged)
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth(); // 0-11
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();
        const days = [];
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        setCalendarDays(days);
    };

    // 2. Fetch Leaves
    const fetchMonthlyLeaves = async () => {
        setLoading(true);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const endStr = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

        try {
            const { data, error } = await supabase
                .from('vacation_requests')
                .select(`
                    id, type, date, periods, reason, user_id,
                    profiles (name, branch)
                `)
                .gte('date', startStr)
                .lte('date', endStr);

            if (error) throw error;
            setLeaves(data || []);
        } catch (err) {
            console.error('Error fetching monthly leaves:', err);
        } finally {
            setLoading(false);
        }
    };

    // 3. Filter Leaves
    const getFilteredLeaves = () => {
        return leaves.filter(leaf => {
            const memberName = leaf.profiles?.name || '';
            const memberBranch = leaf.profiles?.branch || '미지정'; // Handle null/undefined as '미지정' if needed

            // Filter by Branch
            if (selectedBranch !== '전체 지점' && memberBranch !== selectedBranch) {
                return false;
            }

            // Filter by Name (Search)
            if (searchTerm.trim() && !memberName.includes(searchTerm.trim())) {
                return false;
            }

            return true;
        });
    };

    // Helper to get leaves for a specific day using FILTERED data
    const getLeavesForDay = (dayDate) => {
        if (!dayDate) return [];
        const dateStr = dayDate.toISOString().split('T')[0];
        const filtered = getFilteredLeaves(); // Use filtered list
        return filtered.filter(l => l.date === dateStr);
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    return (
        <div style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            {/* Header with Search and Filter */}
            <div className="flex-col" style={{ gap: '15px', marginBottom: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/admin-menu')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        <ArrowLeft size={24} color="var(--color-text-main)" />
                    </button>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        월별 휴가 현황
                    </h2>
                </div>

                {/* Search and Filters */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Branch Filter */}
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            minWidth: '120px'
                        }}
                    >
                        {branchOptions.map((branch, index) => (
                            <option key={index} value={branch}>{branch}</option>
                        ))}
                    </select>

                    {/* Name Search */}
                    <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                        <User size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="이름 검색"
                            style={{
                                width: '100%',
                                padding: '10px 10px 10px 36px',
                                borderRadius: '8px',
                                border: '1px solid #ddd',
                                fontSize: '1rem'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Month Navigation */}
            <div className="flex-center" style={{ gap: '20px', marginBottom: '20px' }}>
                <button onClick={handlePrevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <ChevronLeft size={32} color="var(--color-text-main)" />
                </button>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', minWidth: '180px', textAlign: 'center' }}>
                    {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                </div>
                <button onClick={handleNextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <ChevronRight size={32} color="var(--color-text-main)" />
                </button>
            </div>

            {/* Calendar Grid */}
            <div
                className="calendar-grid"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '1px',
                    background: '#e2e8f0', // Border color
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    overflow: 'hidden'
                }}
            >
                {/* Weekday Headers */}
                {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                    <div
                        key={day}
                        style={{
                            background: '#f7fafc',
                            padding: '10px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: idx === 0 ? '#e53e3e' : idx === 6 ? '#3182ce' : '#4a5568'
                        }}
                    >
                        {day}
                    </div>
                ))}

                {/* Days */}
                {calendarDays.map((dayDate, idx) => {
                    const dayLeaves = getLeavesForDay(dayDate);

                    return (
                        <div
                            key={idx}
                            style={{
                                background: 'white',
                                minHeight: '120px',
                                padding: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                            }}
                        >
                            {dayDate && (
                                <>
                                    <div style={{
                                        fontWeight: 'bold',
                                        color: dayDate.getDay() === 0 ? '#e53e3e' : dayDate.getDay() === 6 ? '#3182ce' : '#2d3748',
                                        marginBottom: '4px'
                                    }}>
                                        {dayDate.getDate()}
                                    </div>

                                    {/* Leaves List */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {dayLeaves.map(leaf => {
                                            const isSelected = selectedUserId === leaf.user_id;
                                            return (
                                                <div
                                                    key={leaf.id}
                                                    onClick={() => setSelectedUserId(isSelected ? null : leaf.user_id)}
                                                    style={{
                                                        fontSize: '0.8rem',
                                                        padding: '4px 6px',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        background: isSelected
                                                            ? '#fff'
                                                            : leaf.type === 'full' ? '#e9d8fd' : leaf.type === 'special' ? '#fed7d7' : '#ebf8ff',
                                                        color: isSelected
                                                            ? '#000'
                                                            : leaf.type === 'full' ? '#553c9a' : leaf.type === 'special' ? '#c53030' : '#2c5282',
                                                        border: isSelected ? '2px solid #d69e2e' : '1px solid transparent',
                                                        boxShadow: isSelected ? '0 0 8px rgba(214, 158, 46, 0.6)' : 'none',
                                                        fontWeight: isSelected ? 'bold' : 'normal',
                                                        transition: 'all 0.2s',
                                                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                                        zIndex: isSelected ? 10 : 1
                                                    }}
                                                >
                                                    <span style={{ fontWeight: 'bold' }}>
                                                        {leaf.profiles?.name || '??'}
                                                    </span>
                                                    {' '}
                                                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                                        {leaf.type === 'full' ? '(월)' : leaf.type === 'special' ? '(특)' : '(반)'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend / Info */}
            <div style={{ marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center', fontSize: '0.9rem', color: '#718096' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#e9d8fd', borderRadius: '50%' }}></div> 월차
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#ebf8ff', borderRadius: '50%' }}></div> 반차
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#fed7d7', borderRadius: '50%' }}></div> 특별휴가
                </div>
            </div>
        </div>
    );
};

export default MonthlyLeaveStatus;
