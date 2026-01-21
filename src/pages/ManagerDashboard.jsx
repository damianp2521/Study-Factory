import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronLeft, ChevronRight, Calendar, Filter, RotateCw, ClipboardList, UserPlus } from 'lucide-react';
import logo from '../assets/logo_new.png';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import EmbeddedCalendar from '../components/EmbeddedCalendar';
import AdminMemberStatus from './AdminMemberStatus';
import AdminMemberRegister from './AdminMemberRegister';
import AdminEmployeeVacationHistory from './AdminEmployeeVacationHistory';
import AdminWorkReport from './AdminWorkReport';
import StaffTaskBoard from './StaffTaskBoard';
import AdminOtherLeaveRequest from './AdminOtherLeaveRequest';
import InlineVacationRequest from '../components/InlineVacationRequest';
import { BRANCH_OPTIONS } from '../constants/branches';
import AdminVacationDetails from '../components/AdminVacationDetails';

// Inline Component for Employee Vacation Status
const EmployeeVacationStatus = ({ onUserClick }) => {
    const { user } = useAuth(); // Access user context
    const BASIC_BRANCHES = BRANCH_OPTIONS;

    // Sorted Branch List
    const branches = React.useMemo(() => {
        const userBranch = user?.branch || '';
        // 1. Combine and Deduplicate
        const all = new Set([...BASIC_BRANCHES]);
        if (userBranch && userBranch !== '미정') all.add(userBranch);

        // 2. Sort
        return Array.from(all).sort((a, b) => {
            // '전체' always first
            if (a === '전체') return -1;
            if (b === '전체') return 1;

            // User branch always second (right after '전체')
            if (a === userBranch) return -1;
            if (b === userBranch) return 1;

            // Others alphabetical
            return a.localeCompare(b);
        });
    }, [user?.branch]);

    // Initialize with user's branch if possible
    const [selectedBranch, setSelectedBranch] = useState(() => {
        if (user?.branch && user.branch !== '미정') return user.branch;
        return '전체';
    });

    // Update selected branch if user loads late or changes
    useEffect(() => {
        if (user?.branch) {
            const target = (user.branch === '미정' || user.branch === '전체') ? '전체' : user.branch;
            setSelectedBranch(target);
        }
    }, [user?.branch]);

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showCalendar, setShowCalendar] = useState(false);
    const [filters, setFilters] = useState({
        full: true,    // 월차 - Red
        half_am: true, // 오전반차 - Red
        half_pm: true  // 오후반차 - Blue
    });
    const [vacations, setVacations] = useState([]);
    const [loading, setLoading] = useState(false);


    useEffect(() => {
        fetchVacations();
    }, [selectedBranch, selectedDate, filters]);

    const fetchVacations = async () => {
        setLoading(true);
        try {
            // 1. Fetch requests for the date
            let query = supabase
                .from('vacation_requests')
                .select('*, profiles:user_id(name, branch), reason')
                .eq('date', selectedDate)
                .order('created_at', { ascending: false }); // Sort by newest first

            const { data, error } = await query;

            if (error) throw error;

            // 2. Client-side Filter by Branch and Type
            const filtered = data.filter(req => {
                // Branch Filter
                if (selectedBranch !== '전체' && req.profiles?.branch !== selectedBranch) return false;

                // Type Filter
                let typeKey = 'full';
                if (req.type === 'half') {
                    const p = req.periods || [];
                    if (p.includes(1)) typeKey = 'half_am';
                    else typeKey = 'half_pm';
                }

                return filters[typeKey];
            });

            setVacations(filtered);
        } catch (err) {
            console.error('Error fetching vacations:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleFilter = (key) => {
        setFilters(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Top Controls: Branch & Date */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                marginBottom: '20px',
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', overflow: 'hidden' }}>
                    {/* Branch Filter (Horizontal Scroll) */}

                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        paddingBottom: '5px',
                        whiteSpace: 'nowrap',
                        scrollbarWidth: 'none', // Firefox
                        msOverflowStyle: 'none' // IE/Edge
                    }}>
                        <style>{`
/* Hide scrollbar for Chrome/Safari/Opera */
div::-webkit-scrollbar {
    display: none;
}
`}</style>
                        {branches.map(branch => (
                            <button
                                key={branch}
                                onClick={() => setSelectedBranch(branch)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    border: selectedBranch === branch ? 'none' : '1px solid #e2e8f0',
                                    background: selectedBranch === branch ? 'var(--color-primary)' : 'white',
                                    color: selectedBranch === branch ? 'white' : '#718096',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                }}
                            >
                                {branch}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {/* Date Picker (Toggleable) */}
                    <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        style={{
                            width: '100%',
                            height: '46px',
                            padding: '0 12px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            background: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{
                            fontSize: '1rem',
                            color: '#2d3748',
                            fontWeight: 'bold',
                            fontFamily: 'var(--font-mono, monospace)',
                            letterSpacing: '1px'
                        }}>
                            {(() => {
                                if (!selectedDate) return '날짜 선택';
                                const [y, m, d] = selectedDate.split('-');
                                const dateObj = new Date(selectedDate);
                                const days = ['일', '월', '화', '수', '목', '금', '토'];
                                const dayName = days[dateObj.getDay()];
                                return `${y}. ${m}. ${d}. (${dayName})`;
                            })()}
                        </span>
                        <Calendar size={20} color="#718096" />
                    </button>

                    {showCalendar && (
                        <div style={{
                            marginTop: '5px',
                            background: 'white',
                            padding: '15px',
                            borderRadius: '16px',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                            border: '1px solid #e2e8f0',
                            zIndex: 10
                        }}>
                            <EmbeddedCalendar
                                selectedDate={selectedDate}
                                onSelectDate={(val) => {
                                    setSelectedDate(val);
                                    setShowCalendar(false);
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Filter Toggle Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button
                    onClick={() => toggleFilter('full')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: filters.full ? '2px solid #e53e3e' : '1px solid #e2e8f0',
                        background: filters.full ? '#fff5f5' : 'white',
                        color: filters.full ? '#c53030' : '#a0aec0',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.9rem'
                    }}
                >
                    월차
                </button>
                <button
                    onClick={() => toggleFilter('half_am')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: filters.half_am ? '2px solid #e53e3e' : '1px solid #e2e8f0', // Red for AM
                        background: filters.half_am ? '#fff5f5' : 'white',
                        color: filters.half_am ? '#c53030' : '#a0aec0',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.9rem'
                    }}
                >
                    오전
                </button>
                <button
                    onClick={() => toggleFilter('half_pm')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: filters.half_pm ? '2px solid #3182ce' : '1px solid #e2e8f0', // Blue for PM
                        background: filters.half_pm ? '#ebf8ff' : 'white',
                        color: filters.half_pm ? '#2c5282' : '#a0aec0',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.9rem'
                    }}
                >
                    오후
                </button>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '20px' }}>로딩 중...</div>
                ) : vacations.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '20px' }}>휴무자가 없습니다.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {vacations.map(req => {
                            // Determine type label and color
                            let typeLabel = '월차';
                            let color = '#c53030'; // Red
                            let bg = '#fff5f5';

                            const isAm = (req.periods || []).includes(1);

                            if (req.type === 'half') {
                                if (isAm) {
                                    typeLabel = '오전반차';
                                    color = '#c53030'; // Red
                                    bg = '#fff5f5';
                                } else {
                                    typeLabel = '오후반차';
                                    color = '#2c5282'; // Blue
                                    bg = '#ebf8ff';
                                }
                            }

                            // Reason override
                            let displayLabel = typeLabel;
                            if (req.reason) {
                                // "Other Leave" logic
                                if (req.type === 'full') {
                                    displayLabel = `종일 ${req.reason}`;
                                } else if (req.type === 'half') {
                                    if (isAm) displayLabel = `오전 ${req.reason}`;
                                    else displayLabel = `오후 ${req.reason}`;
                                }
                            }

                            return (
                                <div key={req.id}
                                    onClick={() => onUserClick && onUserClick({ id: req.user_id, ...req.profiles })}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px 15px', // Reduced vertical padding
                                        borderRadius: '12px',
                                        background: bg,
                                        border: '1px solid transparent',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        cursor: 'pointer'
                                    }}>
                                    <div>
                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2d3748' }}>
                                            {req.profiles?.name || '알 수 없음'}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#718096' }}>
                                            {req.profiles?.branch || '지점 미정'}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontSize: '0.9rem',
                                            fontWeight: 'bold',
                                            color: color,
                                            marginBottom: '2px'
                                        }}>
                                            {displayLabel}
                                        </div>
                                        {req.created_at && (
                                            <div style={{ fontSize: '0.7rem', color: '#a0aec0' }}>
                                                {(() => {
                                                    const d = new Date(req.created_at);
                                                    const days = ['일', '월', '화', '수', '목', '금', '토'];
                                                    const day = days[d.getDay()];
                                                    const yyyy = d.getFullYear();
                                                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                                                    const dd = String(d.getDate()).padStart(2, '0');
                                                    const hh = String(d.getHours()).padStart(2, '0');
                                                    const min = String(d.getMinutes()).padStart(2, '0');
                                                    return `${yyyy}.${mm}.${dd}(${day}) ${hh}:${min}`;
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

// Admin Quick Menu (Flex Layout)
const AdminQuickMenu = () => {
    const [currentView, setCurrentView] = useState('grid'); // 'grid', 'management_menu', 'register', 'status', 'vacation_history', 'other_leave_request'

    if (currentView === 'register') {
        return <AdminMemberRegister onBack={() => setCurrentView('management_menu')} />;
    }
    if (currentView === 'status') {
        return <AdminMemberStatus onBack={() => setCurrentView('management_menu')} />;
    }
    if (currentView === 'vacation_history') {
        return <AdminEmployeeVacationHistory onBack={() => setCurrentView('management_menu')} />;
    }
    if (currentView === 'work_report') {
        return <AdminWorkReport onBack={() => setCurrentView('management_menu')} />;
    }
    if (currentView === 'other_leave_request') {
        return <AdminOtherLeaveRequest onBack={() => setCurrentView('management_menu')} />;
    }

    if (currentView === 'management_menu') {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                    <button
                        onClick={() => setCurrentView('grid')}
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
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0 4px', lineHeight: 1 }}>사원 관리</h2>
                </div>
                {/* Flow Layout for Sub-menu Buttons - Starts Top Left */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignContent: 'flex-start' }}>
                    {/* 1. Register */}
                    <button
                        onClick={() => setCurrentView('register')}
                        style={{
                            width: 'calc(33.33% - 10px)', // Consistent with main grid size
                            aspectRatio: '1',
                            borderRadius: '16px',
                            border: 'none',
                            background: '#f7fafc',
                            color: '#2d3748',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#ebf4ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4299e1', marginBottom: '5px' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span>
                        </div>
                        <span style={{ textAlign: 'center' }}>사원 등록</span>
                    </button>
                    {/* 2. Work Report (NEW) */}
                    <button
                        onClick={() => setCurrentView('work_report')}
                        style={{
                            width: 'calc(33.33% - 10px)',
                            aspectRatio: '1',
                            borderRadius: '16px',
                            border: 'none',
                            background: '#f7fafc',
                            color: '#2d3748',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#ebf8ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2b6cb0', marginBottom: '5px' }}>
                            <ClipboardList size={20} />
                        </div>
                        <span style={{ textAlign: 'center', lineHeight: '1.2' }}>작업 계획<br />및 결과</span>
                    </button>

                    {/* 3. Status (Shifted) */}
                    <button
                        onClick={() => setCurrentView('status')}
                        style={{
                            width: 'calc(33.33% - 10px)',
                            aspectRatio: '1',
                            borderRadius: '16px',
                            border: 'none',
                            background: '#f7fafc',
                            color: '#2d3748',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#edf2f7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#718096', marginBottom: '5px' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>≡</span>
                        </div>
                        <span style={{ textAlign: 'center' }}>사원 현황</span>
                    </button>
                    {/* 4. Vacation History (Shifted) */}
                    <button
                        onClick={() => setCurrentView('vacation_history')}
                        style={{
                            width: 'calc(33.33% - 10px)',
                            aspectRatio: '1',
                            borderRadius: '16px',
                            border: 'none',
                            background: '#f7fafc',
                            color: '#2d3748',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#fff5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c53030', marginBottom: '5px' }}>
                            <Calendar size={20} />
                        </div>
                        <span style={{ textAlign: 'center', lineHeight: '1.2' }}>사원별<br />휴가 현황</span>
                    </button>
                    {/* 5. Other Leave Request (NEW) */}
                    <button
                        onClick={() => setCurrentView('other_leave_request')}
                        style={{
                            width: 'calc(33.33% - 10px)',
                            aspectRatio: '1',
                            borderRadius: '16px',
                            border: 'none',
                            background: '#f7fafc',
                            color: '#2d3748',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#e6fffa', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2c7a7b', marginBottom: '5px' }}>
                            <UserPlus size={20} />
                        </div>
                        <span style={{ textAlign: 'center', lineHeight: '1.2' }}>사원 기타<br />휴무 신청</span>
                    </button>
                </div>
            </div>
        );
    }

    const handleMenuClick = (num) => {
        if (num === 1) {
            setCurrentView('management_menu');
        } else {
            alert('준비 중인 기능입니다.');
        }
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignContent: 'flex-start', height: '100%' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                    key={num}
                    onClick={() => handleMenuClick(num)}
                    style={{
                        width: 'calc(33.33% - 10px)', // 3 per row
                        aspectRatio: '1',
                        borderRadius: '16px',
                        border: 'none',
                        background: '#f7fafc',
                        color: '#4a5568',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: '5px'
                    }}
                >
                    {num === 1 ? (
                        <span style={{ fontSize: '0.9rem', color: '#2d3748', fontWeight: 'bold', textAlign: 'center', wordBreak: 'keep-all' }}>사원 관리</span>
                    ) : (
                        <span style={{ fontSize: '1.5rem' }}>{num}</span>
                    )}
                </button>
            ))}
        </div>
    );
};

// Staff Grid Menu (Similar to Admin but for Staff)
const StaffGridMenu = () => {
    const [currentView, setCurrentView] = useState('grid'); // 'grid', 'employee_vacation', 'work_status', 'vacation_request'

    // Sub-views
    if (currentView === 'employee_vacation') {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <button onClick={() => setCurrentView('grid')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px 0 0', display: 'flex', alignItems: 'center' }}>
                        <ChevronLeft size={24} color="#2d3748" />
                    </button>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>사원 휴무 현황</h3>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <EmployeeVacationStatus />
                </div>
            </div>
        );
    }
    if (currentView === 'work_status') {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <button onClick={() => setCurrentView('grid')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px 0 0', display: 'flex', alignItems: 'center' }}>
                        <ChevronLeft size={24} color="#2d3748" />
                    </button>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>스탭 업무 현황</h3>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <StaffTaskBoard />
                </div>
            </div>
        );
    }
    if (currentView === 'vacation_request') {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <button onClick={() => setCurrentView('grid')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px 0 0', display: 'flex', alignItems: 'center' }}>
                        <ChevronLeft size={24} color="#2d3748" />
                    </button>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>휴무 신청</h3>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <InlineVacationRequest />
                </div>
            </div>
        );
    }

    // Grid View
    const handleMenuClick = (num) => {
        if (num === 1) setCurrentView('employee_vacation');
        else if (num === 2) setCurrentView('work_status');
        else if (num === 3) setCurrentView('vacation_request');
        else alert('준비 중인 기능입니다.');
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignContent: 'flex-start', height: '100%' }}>
            {/* 1. Employee Leave Status */}
            <button
                onClick={() => handleMenuClick(1)}
                style={{
                    width: 'calc(33.33% - 10px)',
                    aspectRatio: '1',
                    borderRadius: '16px',
                    border: 'none',
                    background: '#f7fafc',
                    color: '#2d3748',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
            >
                <div style={{ width: '32px', height: '32px', background: '#fff5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c53030', marginBottom: '5px' }}>
                    <Calendar size={20} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>사원<br />휴무 현황</span>
            </button>

            {/* 2. Staff Work Status */}
            <button
                onClick={() => handleMenuClick(2)}
                style={{
                    width: 'calc(33.33% - 10px)',
                    aspectRatio: '1',
                    borderRadius: '16px',
                    border: 'none',
                    background: '#f7fafc',
                    color: '#2d3748',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
            >
                <div style={{ width: '32px', height: '32px', background: '#ebf8ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2b6cb0', marginBottom: '5px' }}>
                    <ClipboardList size={20} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>스탭<br />업무 현황</span>
            </button>

            {/* 3. Leave Request */}
            <button
                onClick={() => handleMenuClick(3)}
                style={{
                    width: 'calc(33.33% - 10px)',
                    aspectRatio: '1',
                    borderRadius: '16px',
                    border: 'none',
                    background: '#f7fafc',
                    color: '#2d3748',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
            >
                <div style={{ width: '32px', height: '32px', background: '#e6fffa', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2c7a7b', marginBottom: '5px' }}>
                    <UserPlus size={20} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>스탭<br />휴무 신청</span>
            </button>

            {/* 4-9 Placeholders */}
            {[4, 5, 6, 7, 8, 9].map(num => (
                <button
                    key={num}
                    onClick={() => handleMenuClick(num)}
                    style={{
                        width: 'calc(33.33% - 10px)',
                        aspectRatio: '1',
                        borderRadius: '16px',
                        border: 'none',
                        background: '#f7fafc',
                        color: '#a0aec0',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    {num}
                </button>
            ))}
        </div>
    );
};

// Manager Dashboard (No Carousel, Tab Layout)
const ManagerDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const isAdmin = user?.role === 'admin';

    // Dashboard Mode: 'manager' or 'staff'
    // Default: 'manager' for admins, 'staff' for staff/others
    const [dashboardMode, setDashboardMode] = useState(() => {
        if (isAdmin) {
            const saved = localStorage.getItem('manager_dashboard_mode');
            return saved === 'staff' ? 'staff' : 'manager';
        }
        return 'staff';
    });

    // Sync localStorage for admin preference
    useEffect(() => {
        if (isAdmin) {
            localStorage.setItem('manager_dashboard_mode', dashboardMode);
        }
    }, [dashboardMode, isAdmin]);


    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            navigate('/login');
        }
    };

    const handleRefresh = () => {
        window.location.reload();
    };


    return (
        <div style={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: '#ffffff'
        }}>
            {/* 1. Global Header Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 20px',
                paddingTop: 'calc(env(safe-area-inset-top) + 15px)',
                backgroundColor: 'white',
                flexShrink: 0
            }}>
                <button
                    onClick={handleLogout}
                    style={{
                        background: '#267E82',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    <LogOut size={20} />
                </button>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: '5px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#267E82',
                        padding: '5px 12px',
                        borderRadius: '20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}>
                        <img src={logo} alt="자격증공장" style={{ height: '30px', objectFit: 'contain' }} />
                    </div>

                    {/* Mode Toggle for Admin */}
                    {isAdmin && (
                        <div style={{
                            display: 'flex',
                            background: '#f1f5f9',
                            padding: '3px',
                            borderRadius: '20px',
                            marginTop: '5px'
                        }}>
                            <button
                                onClick={() => setDashboardMode('manager')}
                                style={{
                                    border: 'none',
                                    borderRadius: '16px',
                                    padding: '4px 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: dashboardMode === 'manager' ? '#267E82' : 'transparent',
                                    color: dashboardMode === 'manager' ? 'white' : '#718096',
                                    boxShadow: dashboardMode === 'manager' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                관리자
                            </button>
                            <button
                                onClick={() => setDashboardMode('staff')}
                                style={{
                                    border: 'none',
                                    borderRadius: '16px',
                                    padding: '4px 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: dashboardMode === 'staff' ? '#267E82' : 'transparent',
                                    color: dashboardMode === 'staff' ? 'white' : '#718096',
                                    boxShadow: dashboardMode === 'staff' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                스탭
                            </button>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleRefresh}
                    style={{
                        background: '#267E82',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    <RotateCw size={20} />
                </button>
            </div>

            {/* 2. Main Content Area */}
            <div style={{
                flex: 1,
                padding: '20px',
                paddingTop: '10px',
                overflow: 'hidden', // Inner components handle scroll
                display: 'flex',
                gap: '20px',
                flexDirection: 'column'
            }}>
                {/* Content Box */}
                <div style={{
                    flex: 1,
                    background: 'white',
                    borderRadius: '20px',
                    // padding: '20px', // QuickMenu includes padding handling if needed, but let's give it wrapper padding
                    // Actually AdminQuickMenu layout expects some space. Let's keep it simple.
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {dashboardMode === 'manager' ? (
                        <div style={{ height: '100%', overflowY: 'auto', padding: '10px', scrollbarWidth: 'none' }}>
                            <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                            <AdminQuickMenu />
                        </div>
                    ) : (
                        <div style={{ height: '100%', overflowY: 'auto', padding: '10px', scrollbarWidth: 'none' }}>
                            <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                            <StaffGridMenu />
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default ManagerDashboard;
