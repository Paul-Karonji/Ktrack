import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NavigationProvider } from './context/NavigationContext';
import { AnalyticsProvider } from './context/AnalyticsContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Files from './pages/Files';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import UserManagement from './pages/admin/UserManagement';
import PrivateRoute from './components/auth/PrivateRoute';
import LandingPage from './pages/LandingPage';
import WhatsAppButton from './components/common/WhatsAppButton';
import GuestClientManagement from './pages/GuestClientManagement';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <NavigationProvider>
          <AnalyticsProvider>
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

              <Route
                path="/admin/guests"
                element={
                  <PrivateRoute allowedRoles={['admin']}>
                    <GuestClientManagement />
                  </PrivateRoute>
                }
              />

              <Route
                path="/projects"
                element={
                  <PrivateRoute>
                    <Projects />
                  </PrivateRoute>
                }
              />

              <Route
                path="/files"
                element={
                  <PrivateRoute>
                    <Files />
                  </PrivateRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <PrivateRoute>
                    <Settings />
                  </PrivateRoute>
                }
              />

              <Route
                path="/analytics"
                element={
                  <PrivateRoute allowedRoles={['admin']}>
                    <Analytics />
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
          </AnalyticsProvider>
        </NavigationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;