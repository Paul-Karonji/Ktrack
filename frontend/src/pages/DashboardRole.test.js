import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard';
import { AuthContext } from '../context/AuthContext';
import { apiService } from '../services/api';

// Mock child components to simplify test
jest.mock('./AdminDashboard', () => () => <div data-testid="admin-dashboard">Admin Dashboard</div>);
jest.mock('./ClientDashboard', () => () => <div data-testid="client-dashboard">Client Dashboard</div>);
jest.mock('../components/layout/Header', () => () => <div data-testid="header">Header</div>);
jest.mock('../components/common/ErrorMessage', () => () => null);
jest.mock('../components/common/LoadingSpinner', () => () => null);
jest.mock('../components/dashboard/Analytics', () => () => null);
jest.mock('../components/tasks/TaskFilters', () => () => null);
jest.mock('../components/common/ExportButton', () => () => null);
jest.mock('../components/tasks/TaskForm', () => () => null);
jest.mock('../components/tasks/TaskTable', () => () => null);
jest.mock('../components/common/Pagination', () => () => null);

// Mock hooks
jest.mock('../hooks/useTasks', () => ({
    useTasks: () => ({
        tasks: [],
        loading: false,
        error: null,
        loadTasks: jest.fn(),
        createTask: jest.fn(),
        updateTask: jest.fn(),
        deleteTask: jest.fn(),
        togglePayment: jest.fn()
    })
}));

jest.mock('../hooks/useOnlineStatus', () => jest.fn(() => true));

describe('Dashboard Role Rendering', () => {
    const mockLogout = jest.fn();

    it('renders AdminDashboard when user is admin', () => {
        const adminUser = { id: 1, role: 'admin', full_name: 'Admin User' };

        render(
            <AuthContext.Provider value={{ user: adminUser, logout: mockLogout }}>
                <Dashboard />
            </AuthContext.Provider>
        );

        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
        expect(screen.queryByTestId('client-dashboard')).not.toBeInTheDocument();
    });

    it('renders ClientDashboard when user is client', () => {
        const clientUser = { id: 2, role: 'client', full_name: 'Client User' };

        render(
            <AuthContext.Provider value={{ user: clientUser, logout: mockLogout }}>
                <Dashboard />
            </AuthContext.Provider>
        );

        expect(screen.getByTestId('client-dashboard')).toBeInTheDocument();
        expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument();
    });
});
