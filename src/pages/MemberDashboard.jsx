import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTemplate from '../components/PageTemplate';
import { LogOut, ChevronLeft, ChevronRight, CircleHelp } from 'lucide-react';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import WorkPlanReport from '../components/WorkPlanReport';
import InlineVacationRequest from '../components/InlineVacationRequest';
import InlineSuggestion from '../components/InlineSuggestion';

const MemberDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Carousel State
    const [activeIndex, setActiveIndex] = useState(0);
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
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: '#f8fafc'
        }}>
            {/* 1. Global Header Bar (Logout - Logo - Help) */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 20px',
                paddingTop: 'calc(env(safe-area-inset-top) + 15px)',
                backgroundColor: 'transparent'
            }}>
                <button
                    onClick={handleLogout}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#718096',
                        cursor: 'pointer',
                        padding: '5px',
                        display: 'flex', alignItems: 'center'
                    }}
                >
                    <LogOut size={24} />
                </button>

                <div style={{ height: '30px', display: 'flex', alignItems: 'center' }}>
                    <img src={logo} alt="자격증공장" style={{ height: '100%', objectFit: 'contain' }} />
                </div>

                <button
                    onClick={() => { }} // Placeholder
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#718096',
                        cursor: 'pointer',
                        padding: '5px',
                        display: 'flex', alignItems: 'center'
                    }}
                >
                    <CircleHelp size={24} />
                </button>
            </div>

            {/* 2. Navigation Title Bar (Moved Down) */}
            <div style={{
                padding: '15px 20px',
                paddingBottom: '5px',
                position: 'relative',
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
                                padding: '10px 20px 30px 20px',
                                boxSizing: 'border-box',
                                overflowY: 'auto'
                            }}
                        >
                            <div style={{ height: '100%' }}>
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

export default MemberDashboard;
