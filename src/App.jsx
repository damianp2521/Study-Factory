import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
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
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';

import AdminSettings from './pages/AdminSettings';
import Unauthorized from './pages/Unauthorized';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
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
  const { user, loading } = useAuth();

  if (loading) return null; // Or a spinner

  if (!user) return <Navigate to="/login" replace />;

  const role = user.role || 'member';
  if (role === 'admin') return <Navigate to="/admindashboard" replace />;
  if (role === 'staff') return <Navigate to="/staffdashboard" replace />;
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
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
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
            <Route path="/staffdashboard" element={
              <RoleProtectedRoute allowedRoles={['staff', 'admin']}>
                <StaffDashboard />
              </RoleProtectedRoute>
            } />
            <Route path="/admindashboard" element={
              <RoleProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </RoleProtectedRoute>
            } />

            {/* Legacy Dashboard Route (can redirect to based on role or keep as fallback) */}
            <Route path="/dashboard" element={
              <RoleProtectedRoute allowedRoles={['member', 'staff', 'admin']}>
                <Dashboard />
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
