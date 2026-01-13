import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronLeft, ChevronRight, Calendar, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import CustomDatePicker from '../components/CustomDatePicker'; // Assuming this exists as used in other files

// Inline Component for Employee Vacation Status
const EmployeeVacationStatus = () => {
    const [selectedBranch, setSelectedBranch] = useState('전체');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [filters, setFilters] = useState({
        full: true,    // 월차 - Red
        half_am: true, // 오전반차 - Red
        half_pm: true  // 오후반차 - Blue
    });
    const [vacations, setVacations] = useState([]);
    const [loading, setLoading] = useState(false);

    const branches = ['전체', '망미점']; // Currently only Mangmi branch exists

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
                    profiles:user_id (name, branch)
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
                gap: '10px',
                marginBottom: '15px',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#718096' }}>지점선택</span>
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        style={{
                            padding: '12px',
                            height: '46px', // Fixed height to match date picker if possible, or just standard
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            color: '#2d3748',
                            background: 'white',
                            minWidth: '100px',
                            boxSizing: 'border-box'
                        }}
                    >
                        {branches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#718096' }}>날짜선택</span>
                    <div style={{ position: 'relative', width: '100%', height: '46px' }}>
                        {/* Visible UI matching Select Box */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            padding: '0 12px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            background: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            pointerEvents: 'none',
                            boxSizing: 'border-box'
                        }}>
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
                        </div>

                        {/* Native Picker Overlay */}
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{
                                position: 'absolute',
                                top: 0, left: 0,
                                width: '100%', height: '100%',
                                opacity: 0,
                                zIndex: 10,
                                cursor: 'pointer',
                                display: 'block' // Ensure it takes space
                            }}
                        />
                    </div>
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

// Admin Quick Menu (3x3 Grid)
const AdminQuickMenu = () => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', height: '100%', alignContent: 'center' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                    key={num}
                    style={{
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
                        justifyContent: 'center'
                    }}
                >
                    {num}
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

    // Carousel State
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);

    const slides = [
        { title: '사원 휴무 현황', component: <EmployeeVacationStatus /> },
        { title: '건의함', component: <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#a0aec0' }}>건의함 기능 준비중</div> }, // Placeholder
        { title: '회원 관리', component: <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#a0aec0' }}>회원 관리 기능 준비중</div> }, // Placeholder
    ];

    // Admin Only Slides
    if (isAdmin) {
        // Prepend Admin Page (0th page)
        slides.unshift({ title: '관리자 페이지', component: <AdminQuickMenu /> });
        // Append Monthly Stats as before
        slides.push({ title: '월별 휴가 현황', component: <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#a0aec0' }}>월별 통계 준비중</div> });
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
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }}>
            {/* Top Navigation Bar */}
            <div style={{
                padding: 'var(--spacing-md)',
                paddingTop: 'calc(env(safe-area-inset-top) + 20px)',
                position: 'relative',
                marginBottom: '10px'
            }}>
                {/* Logout Button Absolute Left */}
                <button
                    onClick={handleLogout}
                    style={{
                        position: 'absolute',
                        left: '20px',
                        top: 'calc(env(safe-area-inset-top) + 20px)',
                        paddingTop: 0,
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        zIndex: 20
                    }}
                >
                    <LogOut size={24} />
                </button>

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
                            textAlign: 'right',
                            opacity: prevTitle ? 0.3 : 0,
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            transform: 'scale(0.9)',
                            cursor: 'pointer',
                            paddingRight: '10px',
                            paddingLeft: '50px', // Avoid Logout button overlap
                            transition: 'all 0.3s',
                            whiteSpace: 'pre-wrap', // Allow wrapping
                            wordBreak: 'keep-all', // Keep words together if possible
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
                        whiteSpace: 'nowrap'
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
                            textAlign: 'left',
                            opacity: nextTitle ? 0.3 : 0,
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            transform: 'scale(0.9)',
                            cursor: 'pointer',
                            paddingLeft: '10px',
                            paddingRight: '10px',
                            transition: 'all 0.3s',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'keep-all',
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
                        width: `${slides.length * 100}%`,
                        height: '100%',
                        transform: `translateX(-${activeIndex * (100 / slides.length)}%)`,
                        transition: 'transform 0.3s ease-out'
                    }}
                >
                    {slides.map((slide, index) => (
                        <div
                            key={index}
                            style={{
                                width: `${100 / slides.length}%`,
                                height: '100%',
                                padding: '10px 20px 30px 20px',
                                boxSizing: 'border-box',
                                overflowY: 'auto'
                            }}
                        >
                            <div style={{ height: '100%', background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                {slide.component}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pagination Indicators */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '20px 0', paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
                {slides.map((_, index) => (
                    <div
                        key={index}
                        style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: index === activeIndex ? 'var(--color-primary)' : '#cbd5e0',
                            transition: 'background-color 0.3s'
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default ManagerDashboard;
