import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RotateCw } from 'lucide-react';
import logo from '../assets/logo_new.png';

import { useAuth } from '../context/AuthContext';
import AdminQuickMenu from '../components/dashboard/AdminQuickMenu';
import StaffGridMenu from '../components/dashboard/StaffGridMenu';

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
                    // padding: '10px', // Removed padding to let children handle it if needed
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
