import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';
import logo from '../assets/logo_new.png';

import { useAuth } from '../context/AuthContext';
import AdminQuickMenu from '../components/dashboard/AdminQuickMenu';
import StaffGridMenu from '../components/dashboard/StaffGridMenu';
import StaffDailyAttendance from '../pages/StaffDailyAttendance'; // 출석부
import StaffTaskBoard from '../pages/StaffTaskBoard'; // 스탭 업무 현황

const ManagerDashboard = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();

    // Default to '출석부' (Index 1)
    const [activeIndex, setActiveIndex] = useState(() => {
        const saved = localStorage.getItem('manager_dashboard_index');
        return saved ? parseInt(saved, 10) : 1;
    });

    // Save to LocalStorage whenever index changes
    useEffect(() => {
        localStorage.setItem('manager_dashboard_index', activeIndex);
    }, [activeIndex]);

    const items = [
        { title: '관리자 페이지', component: <AdminQuickMenu /> },
        { title: '출석부', component: <StaffDailyAttendance /> },
        { title: '스탭 업무 현황', component: <StaffTaskBoard /> },
        { title: '스탭 페이지', component: <StaffGridMenu /> },
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

    // Swipe Logic
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);
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

        if (isLeftSwipe && activeIndex < items.length - 1) {
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
        if (activeIndex < items.length - 1) setActiveIndex(prev => prev + 1);
    };

    // Calculate nav titles
    const prevTitle = activeIndex > 0 ? items[activeIndex - 1].title : '';
    const nextTitle = activeIndex < items.length - 1 ? items[activeIndex + 1].title : '';

    return (
        <div style={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: '#f8fafc',
            position: 'relative'
        }}>
            {/* 1. Global Header Bar */}
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

            {/* 2. Navigation Title Bar */}
            <div style={{
                padding: '15px 20px',
                paddingBottom: '5px',
                position: 'relative',
                flexShrink: 0
            }}>
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

                    {/* Active Title */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        fontSize: '1.3rem',
                        fontWeight: 'bold',
                        color: '#267E82',
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
                        <span>{items[activeIndex].title}</span>
                        <button
                            onClick={handleNext}
                            disabled={activeIndex === items.length - 1}
                            style={{ background: 'none', border: 'none', color: 'inherit', opacity: activeIndex === items.length - 1 ? 0.2 : 1, cursor: 'pointer' }}
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>

                    {/* Next Title */}
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

            {/* 3. Main Content Carousel */}
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
                        width: `${items.length * 100}%`,
                        height: '100%',
                        transform: `translateX(-${activeIndex * (100 / items.length)}%)`,
                        transition: 'transform 0.3s ease-out'
                    }}
                >
                    {items.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                width: `${100 / items.length}%`,
                                height: '100%',
                                padding: '0 20px 20px 20px', // Added padding
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <div style={{
                                flex: 1,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                backgroundColor: 'white',
                                borderRadius: '24px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // Enhanced shadow
                                border: '1px solid #e2e8f0',
                                overflow: 'hidden',
                                position: 'relative'
                            }}>
                                <div style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    padding: '20px', // Add internal padding
                                    paddingBottom: '20px', // Bottom padding for scrolling content
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none'
                                }}>
                                    <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                                    {item.component}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Pagination Indicators */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                padding: '15px 0',
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
                background: 'linear-gradient(to top, rgba(248,250,252, 1) 0%, rgba(248,250,252, 0.8) 70%, transparent 100%)',
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 20
            }}>
                {items.map((_, index) => (
                    <div
                        key={index}
                        style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: index === activeIndex ? '#267E82' : '#cbd5e0',
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
