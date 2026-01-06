import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VacationRequest from './pages/VacationRequest';
import Suggestion from './pages/Suggestion';
import ManageMembers from './pages/ManageMembers';
import WriteNotice from './pages/WriteNotice';


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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

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
              <ProtectedRoute>
                <ManageMembers />
              </ProtectedRoute>
            } />
            <Route path="/write-notice" element={
              <ProtectedRoute>
                <WriteNotice />
              </ProtectedRoute>
            } />

          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
