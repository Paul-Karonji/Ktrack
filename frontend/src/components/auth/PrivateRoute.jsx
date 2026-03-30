import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const PrivateRoute = ({ children, allowedRoles }) => {
    const { user, initializing, loading, isAuthenticated } = useAuth();
    const location = useLocation();

    if (initializing || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard based on role
        const redirectPath = user.role === 'admin' ? '/admin/dashboard' : '/client/dashboard';
        return <Navigate to={redirectPath} replace />;
    }

    return children;
};

export default PrivateRoute;
