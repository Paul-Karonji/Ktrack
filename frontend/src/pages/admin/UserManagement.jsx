import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Check, X, Shield, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // all, pending, approved
    const isOnline = useOnlineStatus();

    const fetchUsers = React.useCallback(async () => {
        try {
            setLoading(true);
            // If filter is 'pending', use getPendingUsers, else getAllUsers filtering locally or via params
            // apiService.getUsers supports filters
            const statusFilter = filter === 'all' ? undefined : filter;
            const data = await apiService.getUsers({ status: statusFilter });
            setUsers(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchUsers();
    }, [filter, fetchUsers]);

    const handleApprove = async (userId) => {
        try {
            await apiService.approveUser(userId);
            // Optimistic update
            setUsers(users.map(u =>
                u.id === userId ? { ...u, status: 'approved' } : u
            ));
        } catch (err) {
            alert('Failed to approve user');
        }
    };

    const handleReject = async (userId) => {
        if (!window.confirm('Are you sure you want to reject this user?')) return;
        try {
            await apiService.rejectUser(userId);
            setUsers(users.map(u =>
                u.id === userId ? { ...u, status: 'rejected' } : u
            ));
        } catch (err) {
            alert('Failed to reject user');
        }
    };

    const handleSuspend = async (userId) => {
        if (!window.confirm('Are you sure you want to suspend this user?')) return;
        try {
            await apiService.suspendUser(userId);
            setUsers(users.map(u =>
                u.id === userId ? { ...u, status: 'suspended' } : u
            ));
        } catch (err) {
            alert('Failed to suspend user');
        }
    };

    if (!isOnline) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-red-50 text-red-700 p-6 rounded-xl text-center">
                    <AlertCircle size={40} className="mx-auto mb-2" />
                    <h2 className="text-xl font-bold">Offline</h2>
                    <p>You need to be online to manage users.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <Link to="/admin/dashboard" className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-2 mb-2">
                            <ArrowLeft size={16} /> Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
                        <p className="text-gray-500">Approve registrations and manage client accounts</p>
                    </div>

                    <div className="flex bg-white rounded-lg shadow-sm p-1 border border-gray-200">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            All Users
                        </button>
                        <button
                            onClick={() => setFilter('pending')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setFilter('approved')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'approved' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Approved
                        </button>
                    </div>
                </div>

                {loading ? (
                    <LoadingSpinner />
                ) : error ? (
                    <div className="bg-red-50 p-4 rounded-lg text-red-700">{error}</div>
                ) : (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-gray-500">
                                                No users found matching filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map(user => (
                                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                                            {user.full_name?.charAt(0) || 'U'}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900">{user.full_name}</div>
                                                            <div className="text-xs text-gray-500">{user.course || 'No course'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-sm text-gray-900">{user.email}</div>
                                                    <div className="text-xs text-gray-500">{user.phone_number || '-'}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                        user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                        }`}>
                                                        {user.status === 'pending' && <Clock size={12} className="mr-1" />}
                                                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-gray-500">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 text-right space-x-2">
                                                    {user.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(user.id)}
                                                                className="text-green-600 hover:bg-green-50 p-1 rounded transition-colors"
                                                                title="Approve"
                                                            >
                                                                <Check size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(user.id)}
                                                                className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                                                                title="Reject"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {user.status === 'approved' && user.role !== 'admin' && (
                                                        <button
                                                            onClick={() => handleSuspend(user.id)}
                                                            className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                                                            title="Suspend"
                                                        >
                                                            <Shield size={18} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagement;
