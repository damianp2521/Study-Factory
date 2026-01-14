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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '15px' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <div style={{ color: '#718096' }}>로딩중...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '20px' }}>
        <h3 style={{ color: '#e53e3e' }}>인증 오류</h3>
        <p style={{ color: '#718096' }}>{authError}</p>
        <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: '#2d3748', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          새로고침
        </button>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const RootRedirect = () => {
  const { user, loading, authError } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '15px' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '20px' }}>
        <h3 style={{ color: '#e53e3e' }}>연결 오류</h3>
        <p style={{ color: '#718096' }}>서버와 연결할 수 없습니다.</p>
        <p style={{ fontSize: '12px', color: '#a0aec0' }}>({authError})</p>
        <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: '#2d3748', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          새로고침
        </button>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role based redirect
  const role = user.role || 'member';
  if (role === 'admin' || role === 'staff') {
    return <Navigate to="/managerdashboard" replace />;
  }
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
