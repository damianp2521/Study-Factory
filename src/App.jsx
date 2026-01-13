import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import VacationRequest from './pages/VacationRequest';
import Suggestion from './pages/Suggestion';
import ManageMembers from './pages/ManageMembers';
import WriteNotice from './pages/WriteNotice';
import SuggestionBox from './pages/SuggestionBox';
import TodayLeaves from './pages/TodayLeaves';

import StaffPage from './pages/StaffPage';
import AdminPage from './pages/AdminPage';
import MonthlyLeaveStatus from './pages/MonthlyLeaveStatus';

import MemberDashboard from './pages/MemberDashboard';
import ManagerDashboard from './pages/ManagerDashboard';

import AdminSettings from './pages/AdminSettings';
import Unauthorized from './pages/Unauthorized';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading, authError } = useAuth();

  if (authError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '20px' }}>
        <div style={{ color: '#e53e3e', fontSize: '1.2rem', fontWeight: 'bold' }}>
          시스템 오류가 발생했습니다.
        </div>
        <div style={{ color: '#718096' }}>{authError}</div>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '10px 20px', background: '#2d3748', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          페이지 새로고침
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem' }}>
        서버 연결 중...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const RootRedirect = () => {
  const { user, loading, authError } = useAuth();

  if (authError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '20px' }}>
        <div style={{ color: '#e53e3e', fontSize: '1.2rem', fontWeight: 'bold' }}>
          초기화 중 오류 발생
        </div>
        <div style={{ color: '#718096' }}>{authError}</div>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '10px 20px', background: '#2d3748', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>로그인 정보 확인 중...</div>;

  if (!user) return <Navigate to="/login" replace />;

  const role = user.role || 'member';
  if (role === 'admin' || role === 'staff') return <Navigate to="/managerdashboard" replace />;
  return <Navigate to="/memberdashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RootRedirect />} />

            {/* Protected Routes */}
            <Route path="/vacation" element={
              <ProtectedRoute>
                <VacationRequest />
              </ProtectedRoute>
            } />
            <Route path="/suggestion" element={
              <ProtectedRoute>
                <Suggestion />
              </ProtectedRoute>
            } />
            <Route path="/manage-members" element={
              <RoleProtectedRoute allowedRoles={['staff', 'admin']}>
                <ManageMembers />
              </RoleProtectedRoute>
            } />
            <Route path="/write-notice" element={
              <RoleProtectedRoute allowedRoles={['staff', 'admin']}>
                <WriteNotice />
              </RoleProtectedRoute>
            } />
            <Route path="/suggestion-box" element={
              <RoleProtectedRoute allowedRoles={['staff', 'admin']}>
                <SuggestionBox />
              </RoleProtectedRoute>
            } />
            <Route path="/today-leaves" element={
              <RoleProtectedRoute allowedRoles={['staff', 'admin']}>
                <TodayLeaves />
              </RoleProtectedRoute>
            } />
            <Route path="/admin-settings" element={
              <RoleProtectedRoute allowedRoles={['admin']}>
                <AdminSettings />
              </RoleProtectedRoute>
            } />
            <Route path="/admin/monthly-leaves" element={
              <RoleProtectedRoute allowedRoles={['admin']}>
                <MonthlyLeaveStatus />
              </RoleProtectedRoute>
            } />


            {/* Role-Based Dashboard Routes */}
            <Route path="/memberdashboard" element={
              <RoleProtectedRoute allowedRoles={['member', 'staff', 'admin']}>
                <MemberDashboard />
              </RoleProtectedRoute>
            } />
            <Route path="/managerdashboard" element={
              <RoleProtectedRoute allowedRoles={['staff', 'admin']}>
                <ManagerDashboard />
              </RoleProtectedRoute>
            } />

            {/* Role Menu Pages */}
            <Route path="/staff-menu" element={
              <RoleProtectedRoute allowedRoles={['staff', 'admin']}>
                <StaffPage />
              </RoleProtectedRoute>
            } />
            <Route path="/admin-menu" element={
              <RoleProtectedRoute allowedRoles={['admin']}>
                <AdminPage />
              </RoleProtectedRoute>
            } />

            {/* Unauthorized Page */}
            <Route path="/unauthorized" element={<Unauthorized />} />

          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
