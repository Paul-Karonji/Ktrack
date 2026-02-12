import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import Sidebar from '../../components/layout/Sidebar';
import api from '../../services/api';
import {
    Users, Shield, AlertCircle, Menu, Clock, Check, Merge, X
} from 'lucide-react';

const UserManagement = () => {
    const { user, logout } = useAuth();
    const { openSidebar } = useNavigation();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [mergeModal, setMergeModal] = useState({ show: false, user: null, matches: [] });
    const isOnline = useOnlineStatus();

    const fetchUsers = React.useCallback(async () => {
        try {
            setLoading(true);
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
            setUsers(users.map(u => u.id === userId ? { ...u, status: 'approved' } : u));
        } catch (err) {
            alert('Failed to approve user');
        }
    };

    const handleReject = async (userId) => {
        if (!window.confirm('Are you sure you want to reject this user?')) return;
        try {
            await apiService.rejectUser(userId);
            setUsers(users.map(u => u.id === userId ? { ...u, status: 'rejected' } : u));
        } catch (err) {
            alert('Failed to reject user');
        }
    };

    const handleSuspend = async (userId) => {
        if (!window.confirm('Are you sure you want to suspend this user?')) return;
        try {
            await apiService.suspendUser(userId);
            setUsers(users.map(u => u.id === userId ? { ...u, status: 'suspended' } : u));
        } catch (err) {
            alert('Failed to suspend user');
        }
    };

    const checkMatches = async (user) => {
        try {
            setMergeModal({ show: true, user, matches: [], loading: true });
            const response = await api.get(`/users/${user.id}/matches`);
            setMergeModal({ show: true, user, matches: response.data.matches, loading: false });
        } catch (error) {
            console.error(error);
            setMergeModal({ show: true, user, matches: [], loading: false, error: 'Failed to find matches' });
        }
    };

    const performMerge = async (guestId) => {
        if (!window.confirm('Merge this guest account into the user account? This cannot be undone.')) return;
        try {
            const response = await api.post(`/users/${mergeModal.user.id}/merge/${guestId}`);
            alert(response.data.message);
            setMergeModal({ show: false, user: null, matches: [] });
            fetchUsers(); // Refresh list to update status
        } catch (error) {
            alert('Merge failed: ' + (error.response?.data?.error || error.message));
        }
    };

    if (!isOnline) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4"><div className="bg-red-50 text-red-700 p-6 rounded-xl text-center"><AlertCircle size={40} className="mx-auto mb-2" /><h2 className="text-xl font-bold">Offline</h2><p>You need to be online to manage users.</p></div></div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar user={user} onLogout={logout} />

            <div className="flex-1 lg:ml-64 p-4 md:p-8 relative">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <button
                                    onClick={openSidebar}
                                    className="lg:hidden p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <Menu size={24} className="text-gray-600" />
                                </button>
                                <Users size={28} className="text-indigo-600 hidden lg:block" />
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-800">User Management</h1>
                            </div>
                            <p className="text-gray-500 ml-10 lg:ml-0">Approve registrations and manage client accounts</p>
                        </div>
                        <div className="flex bg-white rounded-lg shadow-sm p-1 border border-gray-200">
                            {['all', 'pending', 'approved'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFilter(type)}
                                    className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${filter === type ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    {loading ? <LoadingSpinner /> : error ? <div className="bg-red-50 p-4 rounded-lg text-red-700">{error}</div> : (
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {users.length === 0 ? (
                                            <tr><td colSpan="5" className="p-8 text-center text-gray-500">No users found.</td></tr>
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
                                                    <td className="p-4"><span className={`px-2 py-0.5 rounded text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{user.role}</span></td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${user.status === 'approved' ? 'bg-green-100 text-green-800' : user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                            {user.status === 'pending' && <Clock size={12} className="inline mr-1" />}
                                                            {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 space-x-2 flex items-center">
                                                        {user.status === 'pending' && (
                                                            <>
                                                                <button onClick={() => handleApprove(user.id)} className="text-green-600 hover:bg-green-50 p-1 rounded" title="Approve"><Check size={18} /></button>
                                                                <button onClick={() => checkMatches(user)} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded" title="Check for Merge"><Merge size={18} /></button>
                                                                <button onClick={() => handleReject(user.id)} className="text-red-600 hover:bg-red-50 p-1 rounded" title="Reject"><X size={18} /></button>
                                                            </>
                                                        )}
                                                        {user.status === 'approved' && user.role !== 'admin' && (
                                                            <button onClick={() => handleSuspend(user.id)} className="text-red-600 hover:bg-red-50 p-1 rounded" title="Suspend"><Shield size={18} /></button>
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

                {/* Merge Modal */}
                {mergeModal.show && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-50 duration-200">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Merge className="text-indigo-600" /> Merge Accounts
                                </h2>
                                <button onClick={() => setMergeModal({ show: false, user: null, matches: [] })} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                            </div>

                            <div className="mb-4 text-sm text-gray-600">
                                Checking guest records for <strong>{mergeModal.user.full_name}</strong>...
                            </div>

                            {mergeModal.loading ? (
                                <div className="py-8 text-center"><LoadingSpinner /></div>
                            ) : mergeModal.matches.length === 0 ? (
                                <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-gray-500">No matching guest clients found.</p>
                                    <button onClick={() => handleApprove(mergeModal.user.id)} className="mt-4 text-indigo-600 font-bold hover:underline">Just Approve User</button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-lg border border-yellow-200 mb-2">
                                        Merging will assume ownership of guest tasks and mark the guest profile as upgraded.
                                    </div>
                                    {mergeModal.matches.map(match => (
                                        <div key={match.id} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-indigo-300 transition-colors">
                                            <div>
                                                <div className="font-bold text-gray-900">{match.name}</div>
                                                <div className="text-xs text-gray-500">{match.email || 'No Email'} • {match.phone || 'No Phone'}</div>
                                                <div className="mt-1 inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                                    {match.task_count} Tasks
                                                </div>
                                                <span className="ml-2 text-[10px] text-gray-400 uppercase tracking-wide border border-gray-200 px-1 rounded bg-white">
                                                    {match.match_type.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => performMerge(match.id)}
                                                className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700"
                                            >
                                                Merge
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagement;
