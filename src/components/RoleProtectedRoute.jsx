import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RoleProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem' }}>
                권한 확인 중...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Check if user's role is in the allowedRoles array
    const userRole = user.role || 'member'; // Default to member if undefined

    if (!allowedRoles.includes(userRole)) {
        console.warn(`Access Denied: User role '${userRole}' is not in allowed list [${allowedRoles.join(', ')}]`);
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default RoleProtectedRoute;
