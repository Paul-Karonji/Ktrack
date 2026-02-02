import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import PrivateRoute from './components/auth/PrivateRoute';
import LandingPage from './pages/LandingPage';
import WhatsAppButton from './components/common/WhatsAppButton';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/client/dashboard"
            element={
              <PrivateRoute allowedRoles={['client']}>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute allowedRoles={['admin']}>
                <Dashboard />
                {/* Note: This will be replaced with AdminDashboard later */}
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <PrivateRoute allowedRoles={['admin']}>
                <UserManagement />
              </PrivateRoute>
            }
          />


          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Catch all - Redirect to Home if not found, or keep to dashboard? Let's redirect to / for now as it's the entry point */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Global WhatsApp Contact Button */}
        <WhatsAppButton />
      </AuthProvider>
    </Router>
  );
};

export default App;