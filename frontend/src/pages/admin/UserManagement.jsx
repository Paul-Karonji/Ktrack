import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import Sidebar from '../../components/layout/Sidebar';
import api from '../../services/api';
import {
    Users, Shield, ShieldOff, AlertCircle, Menu, Clock,
    Check, Merge, X, Trash2, RefreshCw
} from 'lucide-react';

// ─── Confirmation Modal ───────────────────────────────────────────────────────
const ConfirmModal = ({ config, onConfirm, onCancel }) => {
    if (!config) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${config.iconBg}`}>
                    {config.icon}
                </div>
                <h2 className="text-xl font-bold text-gray-900 text-center mb-2">{config.title}</h2>
                <p className="text-gray-500 text-center text-sm mb-6">{config.message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-white font-medium transition-colors ${config.confirmClass}`}
                    >
                        {config.confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const styles = {
        approved: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        suspended: 'bg-orange-100 text-orange-800',
        rejected: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
            {status === 'pending' && <Clock size={11} />}
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const UserManagement = () => {
    const { user, logout } = useAuth();
    const { openSidebar } = useNavigation();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [confirm, setConfirm] = useState(null); // { config, action }
    const [actionLoading, setActionLoading] = useState(null); // userId being acted on
    const [mergeModal, setMergeModal] = useState({ show: false, user: null, matches: [] });
    const isOnline = useOnlineStatus();

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const statusFilter = filter === 'all' ? undefined : filter;
            const data = await apiService.getUsers({ status: statusFilter });
            setUsers(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { fetchUsers(); }, [filter, fetchUsers]);

    // ── Generic action runner ──
    const runAction = async (userId, apiFn, successStatus) => {
        setActionLoading(userId);
        try {
            await apiFn();
            if (successStatus === '__delete__') {
                setUsers(prev => prev.filter(u => u.id !== userId));
            } else {
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: successStatus } : u));
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Action failed. Please try again.');
        } finally {
            setActionLoading(null);
            setConfirm(null);
        }
    };

    // ── Action triggers (show modal first) ──
    const handleApprove = (userId) => {
        setConfirm({
            config: {
                title: 'Approve User',
                message: 'The user will receive a welcome email and can log in immediately.',
                icon: <Check size={22} className="text-green-600" />,
                iconBg: 'bg-green-100',
                confirmLabel: 'Approve',
                confirmClass: 'bg-green-600 hover:bg-green-700',
            },
            action: () => runAction(userId, () => apiService.approveUser(userId), 'approved'),
        });
    };

    const handleReject = (userId) => {
        setConfirm({
            config: {
                title: 'Reject Registration',
                message: 'The user will be notified by email that their account was not approved.',
                icon: <X size={22} className="text-red-600" />,
                iconBg: 'bg-red-100',
                confirmLabel: 'Reject',
                confirmClass: 'bg-red-600 hover:bg-red-700',
            },
            action: () => runAction(userId, () => apiService.rejectUser(userId), 'rejected'),
        });
    };

    const handleSuspend = (userId) => {
        setConfirm({
            config: {
                title: 'Suspend Account',
                message: 'The user will be locked out and notified by email. You can reactivate at any time.',
                icon: <Shield size={22} className="text-orange-600" />,
                iconBg: 'bg-orange-100',
                confirmLabel: 'Suspend',
                confirmClass: 'bg-orange-500 hover:bg-orange-600',
            },
            action: () => runAction(userId, () => apiService.suspendUser(userId), 'suspended'),
        });
    };

    const handleUnsuspend = (userId) => {
        setConfirm({
            config: {
                title: 'Reactivate Account',
                message: 'The user will be restored to approved status and notified by email.',
                icon: <ShieldOff size={22} className="text-green-600" />,
                iconBg: 'bg-green-100',
                confirmLabel: 'Reactivate',
                confirmClass: 'bg-green-600 hover:bg-green-700',
            },
            action: () => runAction(userId, () => apiService.unsuspendUser(userId), 'approved'),
        });
    };

    const handleDelete = (u) => {
        setConfirm({
            config: {
                title: 'Permanently Delete User',
                message: `This will permanently remove "${u.full_name}" from the system. Their tasks will remain but lose client association. This cannot be undone.`,
                icon: <Trash2 size={22} className="text-red-600" />,
                iconBg: 'bg-red-100',
                confirmLabel: 'Delete Forever',
                confirmClass: 'bg-red-600 hover:bg-red-700',
            },
            action: () => runAction(u.id, () => apiService.deleteUser(u.id), '__delete__'),
        });
    };

    // ── Merge modal ──
    const checkMatches = async (u) => {
        try {
            setMergeModal({ show: true, user: u, matches: [], loading: true });
            const response = await api.get(`/users/${u.id}/matches`);
            setMergeModal({ show: true, user: u, matches: response.data.matches, loading: false });
        } catch (err) {
            setMergeModal({ show: true, user: u, matches: [], loading: false, error: 'Failed to find matches' });
        }
    };

    const performMerge = async (guestId) => {
        setConfirm({
            config: {
                title: 'Merge Guest Account',
                message: 'This will transfer all guest tasks to this user and approve them. Cannot be undone.',
                icon: <Merge size={22} className="text-indigo-600" />,
                iconBg: 'bg-indigo-100',
                confirmLabel: 'Merge & Approve',
                confirmClass: 'bg-indigo-600 hover:bg-indigo-700',
            },
            action: async () => {
                setActionLoading('merge');
                try {
                    await api.post(`/users/${mergeModal.user.id}/merge/${guestId}`);
                    setMergeModal({ show: false, user: null, matches: [] });
                    fetchUsers();
                } catch (err) {
                    alert('Merge failed: ' + (err.response?.data?.error || err.message));
                } finally {
                    setActionLoading(null);
                    setConfirm(null);
                }
            },
        });
    };

    const FILTERS = ['all', 'pending', 'approved', 'suspended', 'rejected'];

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
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar user={user} onLogout={logout} />

            <div className="flex-1 lg:ml-64 p-4 md:p-8 relative">
                <div className="max-w-6xl mx-auto">

                    {/* Header */}
                    <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <button onClick={openSidebar} className="lg:hidden p-2 hover:bg-gray-200 rounded-lg transition-colors">
                                    <Menu size={24} className="text-gray-600" />
                                </button>
                                <Users size={28} className="text-indigo-600 hidden lg:block" />
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-800">User Management</h1>
                            </div>
                            <p className="text-gray-500 ml-10 lg:ml-0">Approve registrations and manage client accounts</p>
                        </div>

                        {/* Filter tabs */}
                        <div className="flex flex-wrap bg-white rounded-xl shadow-sm p-1 border border-gray-200 gap-0.5">
                            {FILTERS.map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFilter(type)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === type ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    {loading ? <LoadingSpinner /> : error ? (
                        <div className="bg-red-50 p-4 rounded-xl text-red-700 flex items-center gap-2">
                            <AlertCircle size={18} /> {error}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {users.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="p-10 text-center text-gray-400">
                                                    No {filter === 'all' ? '' : filter} users found.
                                                </td>
                                            </tr>
                                        ) : (
                                            users.map(u => (
                                                <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${actionLoading === u.id ? 'opacity-50' : ''}`}>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                                                {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-gray-900">{u.full_name}</div>
                                                                <div className="text-xs text-gray-400">{u.course || 'No course'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="text-sm text-gray-800">{u.email}</div>
                                                        <div className="text-xs text-gray-400">{u.phone_number || '–'}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <StatusBadge status={u.status} />
                                                    </td>
                                                    <td className="p-4">
                                                        {actionLoading === u.id ? (
                                                            <RefreshCw size={16} className="text-indigo-400 animate-spin" />
                                                        ) : (
                                                            <div className="flex items-center gap-1">
                                                                {/* PENDING */}
                                                                {u.status === 'pending' && (<>
                                                                    <ActionBtn icon={<Check size={16} />} label="Approve" color="green" onClick={() => handleApprove(u.id)} />
                                                                    <ActionBtn icon={<Merge size={16} />} label="Check Merge" color="indigo" onClick={() => checkMatches(u)} />
                                                                    <ActionBtn icon={<X size={16} />} label="Reject" color="red" onClick={() => handleReject(u.id)} />
                                                                </>)}

                                                                {/* APPROVED */}
                                                                {u.status === 'approved' && u.role !== 'admin' && (<>
                                                                    <ActionBtn icon={<Shield size={16} />} label="Suspend" color="orange" onClick={() => handleSuspend(u.id)} />
                                                                    <ActionBtn icon={<Trash2 size={16} />} label="Delete" color="red" onClick={() => handleDelete(u)} />
                                                                </>)}

                                                                {/* SUSPENDED */}
                                                                {u.status === 'suspended' && (<>
                                                                    <ActionBtn icon={<ShieldOff size={16} />} label="Reactivate" color="green" onClick={() => handleUnsuspend(u.id)} />
                                                                    <ActionBtn icon={<Trash2 size={16} />} label="Delete" color="red" onClick={() => handleDelete(u)} />
                                                                </>)}

                                                                {/* REJECTED */}
                                                                {u.status === 'rejected' && (
                                                                    <ActionBtn icon={<Trash2 size={16} />} label="Delete" color="red" onClick={() => handleDelete(u)} />
                                                                )}
                                                            </div>
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
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Merge className="text-indigo-600" /> Merge Accounts
                                </h2>
                                <button onClick={() => setMergeModal({ show: false, user: null, matches: [] })} className="text-gray-400 hover:text-gray-600 p-1">
                                    <X size={22} />
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">Checking guest records for <strong>{mergeModal.user?.full_name}</strong>…</p>

                            {mergeModal.loading ? (
                                <div className="py-8 text-center"><LoadingSpinner /></div>
                            ) : mergeModal.error ? (
                                <div className="text-red-500 text-center py-4">{mergeModal.error}</div>
                            ) : mergeModal.matches.length === 0 ? (
                                <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-gray-500 mb-4">No matching guest clients found.</p>
                                    <button onClick={() => { setMergeModal({ show: false, user: null, matches: [] }); handleApprove(mergeModal.user.id); }} className="text-indigo-600 font-semibold hover:underline">
                                        Just Approve User
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-lg border border-yellow-200">
                                        Merging transfers guest tasks to this user and marks the guest profile as upgraded.
                                    </div>
                                    {mergeModal.matches.map(match => (
                                        <div key={match.id} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-indigo-300 transition-colors">
                                            <div>
                                                <div className="font-bold text-gray-900">{match.name}</div>
                                                <div className="text-xs text-gray-500">{match.email || 'No Email'} · {match.phone || 'No Phone'}</div>
                                                <div className="mt-1 inline-flex items-center gap-1">
                                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">{match.task_count} Tasks</span>
                                                    <span className="text-[10px] text-gray-400 uppercase tracking-wide border border-gray-200 px-1 rounded bg-white">{match.match_type?.replace('_', ' ')}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => performMerge(match.id)}
                                                className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow hover:bg-indigo-700 transition-colors"
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

            {/* Confirmation Modal */}
            <ConfirmModal
                config={confirm?.config}
                onConfirm={confirm?.action}
                onCancel={() => setConfirm(null)}
            />
        </div>
    );
};

// Small action button helper
const ActionBtn = ({ icon, label, color, onClick }) => {
    const colors = {
        green: 'text-green-600 hover:bg-green-50 hover:text-green-700',
        red: 'text-red-500 hover:bg-red-50 hover:text-red-600',
        orange: 'text-orange-500 hover:bg-orange-50 hover:text-orange-600',
        indigo: 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700',
    };
    return (
        <button
            title={label}
            onClick={onClick}
            className={`p-1.5 rounded-lg transition-colors ${colors[color] || 'text-gray-500 hover:bg-gray-100'}`}
        >
            {icon}
        </button>
    );
};

export default UserManagement;
