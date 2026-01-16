import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTemplate from '../components/PageTemplate';
import { LogOut, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import logo from '../assets/logo_new.png';
import { useAuth } from '../context/AuthContext';
import WorkPlanReport from '../components/WorkPlanReport';
import InlineVacationRequest from '../components/InlineVacationRequest';
import InlineSuggestion from '../components/InlineSuggestion';

const MemberDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Carousel State - Initialize from LocalStorage
    const [activeIndex, setActiveIndex] = useState(() => {
        const saved = localStorage.getItem('member_dashboard_index');
        return saved ? parseInt(saved, 10) : 0;
    });

    // Save to LocalStorage whenever index changes
    React.useEffect(() => {
        localStorage.setItem('member_dashboard_index', activeIndex);
    }, [activeIndex]);

    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);

    const slides = [
        { title: '작업계획', component: <WorkPlanReport /> },
        { title: '휴무계획', component: <InlineVacationRequest /> },
        { title: '건의사항', component: <InlineSuggestion /> },
    ];

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

    // Calculate nav titles
    const prevTitle = activeIndex > 0 ? slides[activeIndex - 1].title : '';
    const nextTitle = activeIndex < slides.length - 1 ? slides[activeIndex + 1].title : '';

    return (
        <div style={{
            height: '100dvh', // Use dvh for mobile address bar adjustment
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: '#f8fafc',
            position: 'relative' // Needed for absolute positioning of dots if preferred, but flex is fine
        }}>
            {/* 1. Global Header Bar (Logout - Logo - Refresh) */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 20px',
                paddingTop: 'calc(env(safe-area-inset-top) + 15px)',
                backgroundColor: '#267E82',
                flexShrink: 0
            }}>
                <button
                    onClick={handleLogout}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '5px',
                        display: 'flex', alignItems: 'center'
                    }}
                >
                    <LogOut size={24} />
                </button>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                    <img src={logo} alt="자격증공장" style={{ height: '24px', objectFit: 'contain' }} />
                </div>

                <button
                    onClick={handleRefresh}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '5px',
                        display: 'flex', alignItems: 'center'
                    }}
                >
                    <RotateCw size={24} />
                </button>
            </div>

            {/* 2. Navigation Title Bar (Moved Down) */}
            <div style={{
                padding: '15px 20px',
                paddingBottom: '5px',
                position: 'relative',
                flexShrink: 0 // Prevent shrinking
            }}>
                {/* Grid for perfect centering */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    width: '100%',
                    userSelect: 'none'
                }}>
                    {/* Prev Title (Faded) - Align Right */}
                    <div
                        onClick={handlePrev}
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            opacity: prevTitle ? 0.6 : 0,
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            transform: 'scale(0.9)',
                            cursor: 'pointer',
                            paddingRight: '10px',
                            transition: 'all 0.3s',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            width: '100%',
                            maskImage: 'linear-gradient(to right, transparent, black 30%)',
                            WebkitMaskImage: 'linear-gradient(to right, transparent, black 30%)'
                        }}
                    >
                        {prevTitle || '　'}
                    </div>

                    {/* Active Title (Centered) */}
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

                    {/* Next Title (Faded) - Align Left */}
                    <div
                        onClick={handleNext}
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                            opacity: nextTitle ? 0.6 : 0,
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            transform: 'scale(0.9)',
                            cursor: 'pointer',
                            paddingLeft: '10px',
                            transition: 'all 0.3s',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            width: '100%',
                            maskImage: 'linear-gradient(to right, black 70%, transparent)',
                            WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent)'
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
                                padding: '10px 20px',
                                boxSizing: 'border-box',
                                overflow: 'hidden', // Hide global overflow, rely on inner scroll
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            {/* Make this specific white box scrollable */}
                            <div style={{
                                flex: 1,
                                overflowY: 'auto',
                                paddingBottom: '20px',
                                marginBottom: '60px', /* Make dots appear outside */
                                // Hide scrollbar for cleaner look
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none'
                            }}>
                                <style>{`
                                    div::-webkit-scrollbar { display: none; }
                                `}</style>
                                {slide.component}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pagination Indicators - Fixed above the bottom edge */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                padding: '15px 0',
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)', // Safe area aware
                background: 'linear-gradient(to top, rgba(248,250,252, 1) 0%, rgba(248,250,252, 0.8) 70%, transparent 100%)', // Fade background to ensure visibility
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 20
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
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)' // Shadow for better visibility
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default MemberDashboard;
