import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronLeft, ChevronRight, Calendar, Filter, RotateCw, ClipboardList } from 'lucide-react';
import logo from '../assets/logo_new.png';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import EmbeddedCalendar from '../components/EmbeddedCalendar';
import AdminMemberStatus from './AdminMemberStatus';
import AdminMemberRegister from './AdminMemberRegister';
import AdminEmployeeVacationHistory from './AdminEmployeeVacationHistory';
import AdminWorkReport from './AdminWorkReport';
import StaffTaskBoard from './StaffTaskBoard';
import { BRANCH_OPTIONS } from '../constants/branches';

// ... (skipping inline components)

// ~~~~ Main Dashboard Component ~~~~


// Inline Component for Employee Vacation Status
const EmployeeVacationStatus = () => {
    const { user } = useAuth(); // Access user context

    // Branch configuration
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
                .select(`
        *,
        profiles: user_id(name, branch)
        `)
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
                                return `${y}. ${m}. ${d}.`;
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
                        border: filters.half_am ? '2px solid #e53e3e' : '1px solid #e2e8f0', // Red for AM as requested
                        background: filters.half_am ? '#fff5f5' : 'white',
                        color: filters.half_am ? '#c53030' : '#a0aec0',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.9rem'
                    }}
                >
                    오전반차
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
                    오후반차
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

                            if (req.type === 'half') {
                                const isAm = (req.periods || []).includes(1);
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

                            return (
                                <div key={req.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '15px',
                                    borderRadius: '12px',
                                    background: bg,
                                    border: '1px solid transparent',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2d3748' }}>
                                            {req.profiles?.name || '알 수 없음'}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#718096' }}>
                                            {req.profiles?.branch || '지점 미정'}
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: '0.9rem',
                                        fontWeight: 'bold',
                                        color: color
                                    }}>
                                        {typeLabel}
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
    const [currentView, setCurrentView] = useState('grid'); // 'grid', 'management_menu', 'register', 'status', 'vacation_history'

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

    // Sub-menu for Employee Management
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

// Manager Dashboard with Carousel
const ManagerDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Determine initial slide based on role
    // Admin: Start at index 1 (Employee Vacation Status), index 0 is Admin Page
    // Staff: Start at index 0 (Employee Vacation Status)
    const isAdmin = user?.role === 'admin';
    const initialIndex = isAdmin ? 1 : 0;

    // Carousel State - Initialize from LocalStorage
    const [activeIndex, setActiveIndex] = useState(() => {
        const saved = localStorage.getItem('manager_dashboard_index');
        if (saved !== null) return parseInt(saved, 10);
        return initialIndex;
    });

    // Save to LocalStorage whenever index changes
    useEffect(() => {
        localStorage.setItem('manager_dashboard_index', activeIndex);
    }, [activeIndex]);

    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);

    const slides = [
        { title: '사원 휴무 현황', component: <EmployeeVacationStatus /> },
        { title: '스탭 업무 현황', component: <StaffTaskBoard /> },
    ];

    // Admin Only Slides
    if (isAdmin) {
        // Prepend Admin Page (0th page)
        slides.unshift({ title: '관리자 페이지', component: <AdminQuickMenu /> });
    }

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

    // Handle Swipe
    const minSwipeDistance = 50;
    const onTouchStart = (e) => {
        setTouchEnd(0);
        setTouchStart(e.targetTouches[0].clientX);
    };
    const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && activeIndex < slides.length - 1) {
            setActiveIndex(prev => prev + 1);
        }
        if (isRightSwipe && activeIndex > 0) {
            setActiveIndex(prev => prev - 1);
        }
    };

    const handlePrev = () => {
        if (activeIndex > 0) setActiveIndex(prev => prev - 1);
    };

    const handleNext = () => {
        if (activeIndex < slides.length - 1) setActiveIndex(prev => prev + 1);
    };

    const prevTitle = activeIndex > 0 ? slides[activeIndex - 1].title : '';
    const nextTitle = activeIndex < slides.length - 1 ? slides[activeIndex + 1].title : '';

    return (
        <div style={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* 1. Global Header Bar (Logout - Logo - Help) */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 20px',
                paddingTop: 'calc(env(safe-area-inset-top) + 15px)',
                backgroundColor: 'transparent',
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
                    backgroundColor: '#267E82',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                    <img src={logo} alt="자격증공장" style={{ height: '30px', objectFit: 'contain' }} />
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

            {/* 2. Navigation Title Bar (Moved Down) */}
            <div style={{
                padding: '15px 20px',
                paddingBottom: '5px',
                position: 'relative',
                flexShrink: 0
            }}>
                {/* Grid for perfect centering */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    width: '100%',
                    userSelect: 'none'
                }}>
                    {/* Prev Title */}
                    <div
                        onClick={handlePrev}
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end', // Force alignment to right
                            alignItems: 'center',
                            opacity: prevTitle ? 0.6 : 0, // Slightly more opacity
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            transform: 'scale(0.9)',
                            cursor: 'pointer',
                            paddingRight: '10px',
                            transition: 'all 0.3s',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            width: '100%', // Ensure full width for flex
                            maskImage: 'linear-gradient(to right, transparent, black 30%)', // Softer fade (0-30%)
                            WebkitMaskImage: 'linear-gradient(to right, transparent, black 30%)',
                            lineHeight: '1.2'
                        }}
                    >
                        {prevTitle || '　'}
                    </div>

                    {/* Active Title */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        fontSize: '1.3rem',
                        fontWeight: 'bold',
                        color: 'var(--color-primary)',
                        whiteSpace: 'nowrap',
                        zIndex: 10
                    }}>
                        <button
                            onClick={handlePrev}
                            disabled={activeIndex === 0}
                            style={{ background: 'none', border: 'none', color: 'inherit', opacity: activeIndex === 0 ? 0.2 : 1, cursor: 'pointer' }}
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <span>{slides[activeIndex].title}</span>
                        <button
                            onClick={handleNext}
                            disabled={activeIndex === slides.length - 1}
                            style={{ background: 'none', border: 'none', color: 'inherit', opacity: activeIndex === slides.length - 1 ? 0.2 : 1, cursor: 'pointer' }}
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>

                    {/* Next Title */}
                    <div
                        onClick={handleNext}
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-start', // Force alignment to left
                            alignItems: 'center',
                            opacity: nextTitle ? 0.6 : 0,
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            transform: 'scale(0.9)',
                            cursor: 'pointer',
                            paddingLeft: '10px',
                            paddingRight: '10px',
                            transition: 'all 0.3s',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            width: '100%',
                            maskImage: 'linear-gradient(to right, black 70%, transparent)', // Softer fade (70-100%)
                            WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent)',
                            lineHeight: '1.2'
                        }}
                    >
                        {nextTitle || '　'}
                    </div>
                </div>
            </div>

            {/* Main Content Carousel */}
            <div
                style={{
                    flex: 1,
                    position: 'relative',
                    width: '100%',
                    overflow: 'hidden'
                }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div
                    style={{
                        display: 'flex',
                        width: `${slides.length * 100}% `,
                        height: '100%',
                        transform: `translateX(-${activeIndex * (100 / slides.length)}%)`,
                        transition: 'transform 0.3s ease-out'
                    }}
                >
                    {slides.map((slide, index) => (
                        <div
                            key={index}
                            style={{
                                width: `${100 / slides.length}% `,
                                height: '100%',
                                padding: '10px 20px',
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            {/* White Box with Internal Scroll */}
                            <div style={{
                                flex: 1,
                                background: 'white',
                                borderRadius: '20px',
                                padding: '20px',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                paddingBottom: '20px',
                                marginBottom: '60px', /* Make dots appear outside */
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none'
                            }}>
                                <style>{`
                                    div::-webkit-scrollbar { display: none; }
                                `}</style>
                                <div style={{ flex: 1 }}>
                                    {slide.component}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pagination Indicators - Floating at Bottom with Background */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                padding: '15px 0',
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 20,
                background: 'linear-gradient(to top, rgba(245,246,250, 0.9) 0%, rgba(245,246,250, 0) 100%)', // Subtle fade
                pointerEvents: 'none' // Click through just in case
            }}>
                {slides.map((_, index) => (
                    <div
                        key={index}
                        style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: index === activeIndex ? 'var(--color-primary)' : '#cbd5e0',
                            transition: 'background-color 0.3s',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default ManagerDashboard;
