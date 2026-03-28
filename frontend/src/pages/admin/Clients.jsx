import React, { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import Sidebar from '../../components/layout/Sidebar';
import apiService, { api } from '../../services/api';
import GuestPaymentLinkModal from '../../components/payments/GuestPaymentLinkModal';
import {
    Users, Shield, ShieldOff, AlertCircle, Menu, Clock,
    Check, Merge, X, Trash2, RefreshCw, Sparkles, Search, Plus, Edit2, AlertTriangle, Phone, Mail, BookOpen, Link2
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

const ActionBtn = ({ icon, label, color, onClick, showLabel = false }) => {
    const colors = {
        green: 'text-green-600 hover:bg-green-50 hover:text-green-700 font-bold',
        red: 'text-red-500 hover:bg-red-50 hover:text-red-600',
        orange: 'text-orange-500 hover:bg-orange-50 hover:text-orange-600',
        indigo: 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold',
        indigo_active: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm font-bold',
    };
    return (
        <button
            title={label}
            onClick={onClick}
            className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 ${colors[color] || 'text-gray-500 hover:bg-gray-100'} ${showLabel ? 'px-3' : ''}`}
        >
            {icon}
            {showLabel && <span className="text-xs uppercase tracking-tight">{label}</span>}
        </button>
    );
};

const Clients = () => {
    const { user, logout } = useAuth();
    const { openSidebar } = useNavigation();
    const isOnline = useOnlineStatus();

    const [activeTab, setActiveTab] = useState('registered');

    // Registered Users State
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [userFilter, setUserFilter] = useState('all');

    // Guest Clients State
    const [guests, setGuests] = useState([]);
    const [guestsLoading, setGuestsLoading] = useState(true);
    const [guestSearchTerm, setGuestSearchTerm] = useState('');
    const [showGuestForm, setShowGuestForm] = useState(false);
    const [guestFormData, setGuestFormData] = useState({ name: '', email: '', phone: '', course: '', notes: '' });
    const [editingGuestId, setEditingGuestId] = useState(null);
    const [duplicateWarning, setDuplicateWarning] = useState(null);
    const [guestPaymentLinkTarget, setGuestPaymentLinkTarget] = useState(null);

    // Shared UI State
    const [confirm, setConfirm] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [mergeModal, setMergeModal] = useState({
        show: false,
        user: null,
        matches: [],
        searchTerm: '',
        loading: false,
        error: null
    });

    const fetchUsers = useCallback(async () => {
        try {
            setUsersLoading(true);
            const statusFilter = userFilter === 'all' ? undefined : userFilter;
            const data = await apiService.getUsers({ status: statusFilter });
            setUsers(data);
        } catch (err) {
            console.error('Failed to load users', err);
        } finally {
            setUsersLoading(false);
        }
    }, [userFilter]);

    const fetchGuests = useCallback(async () => {
        try {
            setGuestsLoading(true);
            const response = await api.get('/guest-clients');
            setGuests(response.data.guests);
        } catch (error) {
            console.error('Failed to fetch guests', error);
        } finally {
            setGuestsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'registered') fetchUsers();
        else fetchGuests();
    }, [activeTab, fetchUsers, fetchGuests]);

    // ── Registered Users Actions ──────────────────────────────────────────────
    const runUserAction = async (userId, apiFn, successStatus) => {
        setActionLoading(userId);
        try {
            await apiFn();
            if (successStatus === '__delete__') {
                setUsers(prev => prev.filter(u => u.id !== userId));
            } else {
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: successStatus } : u));
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Action failed');
        } finally {
            setActionLoading(null);
            setConfirm(null);
        }
    };

    const handleApprove = (u) => {
        if (u.potential_guest_matches > 0) {
            setConfirm({
                config: {
                    title: 'Possible Guest Match Found',
                    message: `"${u.full_name}" has ${u.potential_guest_matches} potential guest record(s).`,
                    icon: <Sparkles size={22} className="text-indigo-600" />,
                    iconBg: 'bg-indigo-100',
                    confirmLabel: 'Review Matches',
                    confirmClass: 'bg-indigo-600 hover:bg-indigo-700',
                },
                action: () => {
                    setConfirm(null);
                    checkMatches(u);
                },
            });
        } else {
            setConfirm({
                config: {
                    title: 'Approve User',
                    message: 'The user will receive a welcome email and can log in immediately.',
                    icon: <Check size={22} className="text-green-600" />,
                    iconBg: 'bg-green-100',
                    confirmLabel: 'Approve',
                    confirmClass: 'bg-green-600 hover:bg-green-700',
                },
                action: () => runUserAction(u.id, () => apiService.approveUser(u.id), 'approved'),
            });
        }
    };

    const handleReject = (userId) => {
        setConfirm({
            config: {
                title: 'Reject Registration',
                message: 'The user will be notified that their account was not approved.',
                icon: <X size={22} className="text-red-600" />,
                iconBg: 'bg-red-100',
                confirmLabel: 'Reject',
                confirmClass: 'bg-red-600 hover:bg-red-700',
            },
            action: () => runUserAction(userId, () => apiService.rejectUser(userId), 'rejected'),
        });
    };

    const handleSuspend = (userId) => {
        setConfirm({
            config: {
                title: 'Suspend Account',
                message: 'The user will be locked out. You can reactivate at any time.',
                icon: <Shield size={22} className="text-orange-600" />,
                iconBg: 'bg-orange-100',
                confirmLabel: 'Suspend',
                confirmClass: 'bg-orange-500 hover:bg-orange-600',
            },
            action: () => runUserAction(userId, () => apiService.suspendUser(userId), 'suspended'),
        });
    };

    const handleUnsuspend = (userId) => {
        setConfirm({
            config: {
                title: 'Reactivate Account',
                message: 'The user will be restored to approved status.',
                icon: <ShieldOff size={22} className="text-green-600" />,
                iconBg: 'bg-green-100',
                confirmLabel: 'Reactivate',
                confirmClass: 'bg-green-600 hover:bg-green-700',
            },
            action: () => runUserAction(userId, () => apiService.unsuspendUser(userId), 'approved'),
        });
    };

    const handleDeleteUser = (u) => {
        setConfirm({
            config: {
                title: 'Permanently Delete User',
                message: `This will permanently remove "${u.full_name}". Tasks will remain but lose association.`,
                icon: <Trash2 size={22} className="text-red-600" />,
                iconBg: 'bg-red-100',
                confirmLabel: 'Delete Forever',
                confirmClass: 'bg-red-600 hover:bg-red-700',
            },
            action: () => runUserAction(u.id, () => apiService.deleteUser(u.id), '__delete__'),
        });
    };

    // ── Merge Actions ─────────────────────────────────────────────────────────
    const checkMatches = async (u) => {
        try {
            setMergeModal({ ...mergeModal, show: true, user: u, matches: [], loading: true, searchTerm: '', error: null });
            const data = await apiService.getMatches(u.id);
            setMergeModal(prev => ({ ...prev, show: true, user: u, matches: data.matches || [], loading: false }));
        } catch (err) {
            setMergeModal(prev => ({ ...prev, show: true, user: u, matches: [], loading: false, error: 'Failed' }));
        }
    };

    const performMerge = async (guestId) => {
        setConfirm({
            config: {
                title: 'Merge Guest Account',
                message: 'Transfers all guest tasks to this user and approves them.',
                icon: <Merge size={22} className="text-indigo-600" />,
                iconBg: 'bg-indigo-100',
                confirmLabel: 'Merge & Approve',
                confirmClass: 'bg-indigo-600 hover:bg-indigo-700',
            },
            action: async () => {
                setActionLoading('merge');
                try {
                    await apiService.mergeGuest(mergeModal.user.id, guestId);
                    setMergeModal({ ...mergeModal, show: false, user: null, matches: [] });
                    fetchUsers();
                } catch (err) {
                    alert('Merge failed');
                } finally {
                    setActionLoading(null);
                    setConfirm(null);
                }
            },
        });
    };

    // ── Guest Clients Actions ────────────────────────────────────────────────
    const handleGuestInputChange = (e) => {
        setGuestFormData({ ...guestFormData, [e.target.name]: e.target.value });
        setDuplicateWarning(null);
    };

    const handleGuestSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingGuestId) {
                await api.put(`/guest-clients/${editingGuestId}`, guestFormData);
            } else {
                const response = await api.post('/guest-clients', guestFormData);
                if (response.data.warning) {
                    setDuplicateWarning(response.data);
                    return;
                }
            }
            resetGuestForm();
            fetchGuests();
        } catch (error) {
            if (error.response?.data?.existingGuest) {
                setDuplicateWarning({
                    error: true,
                    message: error.response.data.error,
                    existingGuest: error.response.data.existingGuest
                });
            } else {
                alert('Failed to save guest');
            }
        }
    };

    const handleDeleteGuest = async (id) => {
        if (window.confirm('Delete guest client permanently?')) {
            try {
                await api.delete(`/guest-clients/${id}`);
                fetchGuests();
            } catch (error) {
                console.error('Failed to delete', error);
            }
        }
    };

    const handleEditGuest = (guest) => {
        setGuestFormData({
            name: guest.name,
            email: guest.email || '',
            phone: guest.phone || '',
            course: guest.course || '',
            notes: guest.notes || ''
        });
        setEditingGuestId(guest.id);
        setShowGuestForm(true);
        setDuplicateWarning(null);
    };

    const handleOpenGuestPortalLink = (guest) => {
        if (!guest) return;
        setGuestPaymentLinkTarget({
            scope: 'portal',
            guest
        });
    };

    const resetGuestForm = () => {
        setGuestFormData({ name: '', email: '', phone: '', course: '', notes: '' });
        setEditingGuestId(null);
        setShowGuestForm(false);
        setDuplicateWarning(null);
    };

    const filteredGuests = guests.filter(g =>
        g.name.toLowerCase().includes(guestSearchTerm.toLowerCase()) ||
        (g.email && g.email.toLowerCase().includes(guestSearchTerm.toLowerCase())) ||
        (g.phone && g.phone.includes(guestSearchTerm))
    );

    if (!isOnline) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-red-50 text-red-700 p-6 rounded-xl text-center">
                    <AlertCircle size={40} className="mx-auto mb-2" />
                    <h2 className="text-xl font-bold">Offline</h2>
                    <p>You need to be online to manage clients.</p>
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
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Client Management</h1>
                            </div>
                            <p className="text-gray-500 ml-10 lg:ml-0">
                                {activeTab === 'registered' ? 'Manage registered accounts and approvals' : 'Manage guest records and tracking'}
                            </p>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-white rounded-xl shadow-sm p-1 border border-gray-200">
                            <button
                                onClick={() => setActiveTab('registered')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'registered' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                Registered
                            </button>
                            <button
                                onClick={() => setActiveTab('guests')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'guests' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                Guest Clients
                            </button>
                        </div>
                    </div>

                    {/* REDISTERED USERS VIEW */}
                    {activeTab === 'registered' && (
                        <>
                            <div className="mb-6 flex flex-wrap gap-2">
                                {['all', 'pending', 'approved', 'suspended', 'rejected'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setUserFilter(type)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${userFilter === type ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>

                            {usersLoading ? <LoadingSpinner /> : (
                                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 border-b border-gray-100">
                                                <tr>
                                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Contact</th>
                                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {users.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" className="p-10 text-center text-gray-400">No registered users found.</td>
                                                    </tr>
                                                ) : (
                                                    users.map(u => (
                                                        <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                                                        {u.full_name?.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-gray-900 flex items-center gap-2">
                                                                            {u.full_name}
                                                                            {u.potential_guest_matches > 0 && (
                                                                                <span className="bg-indigo-50 text-indigo-600 text-[10px] px-1.5 py-0.5 rounded-md font-black animate-pulse flex items-center gap-1 border border-indigo-100">
                                                                                    <Sparkles size={10} /> MATCH
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-xs text-gray-400 font-medium">{u.course || 'No Program'}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="text-sm font-semibold text-gray-700">{u.email}</div>
                                                                <div className="text-xs text-gray-400">{u.phone_number || 'No Phone'}</div>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <StatusBadge status={u.status} />
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                {actionLoading === u.id ? <RefreshCw className="animate-spin ml-auto text-indigo-400" size={18} /> : (
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        {u.status === 'pending' && (
                                                                            <>
                                                                                <ActionBtn icon={<Check size={16} />} label="Approve" color="green" onClick={() => handleApprove(u)} showLabel />
                                                                                {!u.is_merged && (
                                                                                    <ActionBtn
                                                                                        icon={<Merge size={16} />}
                                                                                        label="Merge"
                                                                                        color={u.potential_guest_matches > 0 ? "indigo_active" : "indigo"}
                                                                                        onClick={() => checkMatches(u)}
                                                                                        showLabel
                                                                                    />
                                                                                )}
                                                                                <ActionBtn icon={<X size={16} />} label="Reject" color="red" onClick={() => handleReject(u.id)} />
                                                                            </>
                                                                        )}
                                                                        {u.status === 'approved' && u.role !== 'admin' && (
                                                                            <>
                                                                                {!u.is_merged && (
                                                                                    <ActionBtn
                                                                                        icon={<Merge size={16} />}
                                                                                        label="Merge"
                                                                                        color={u.potential_guest_matches > 0 ? "indigo_active" : "indigo"}
                                                                                        onClick={() => checkMatches(u)}
                                                                                        showLabel
                                                                                    />
                                                                                )}
                                                                                <ActionBtn icon={<Shield size={16} />} label="Suspend" color="orange" onClick={() => handleSuspend(u.id)} />
                                                                                <ActionBtn icon={<Trash2 size={16} />} label="Delete" color="red" onClick={() => handleDeleteUser(u)} />
                                                                            </>
                                                                        )}
                                                                        {u.status === 'suspended' && (
                                                                            <>
                                                                                <ActionBtn icon={<ShieldOff size={16} />} label="Restore" color="green" onClick={() => handleUnsuspend(u.id)} showLabel />
                                                                                <ActionBtn icon={<Trash2 size={16} />} label="Delete" color="red" onClick={() => handleDeleteUser(u)} />
                                                                            </>
                                                                        )}
                                                                        {u.status === 'rejected' && (
                                                                            <ActionBtn icon={<Trash2 size={16} />} label="Delete" color="red" onClick={() => handleDeleteUser(u)} />
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
                        </>
                    )}

                    {/* GUEST CLIENTS VIEW */}
                    {activeTab === 'guests' && (
                        <>
                            <div className="flex flex-col md:flex-row gap-4 mb-6">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search guests by name, email or phone..."
                                        value={guestSearchTerm}
                                        onChange={(e) => setGuestSearchTerm(e.target.value)}
                                        className="w-full pl-11 p-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <button
                                    onClick={() => setShowGuestForm(!showGuestForm)}
                                    className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
                                >
                                    <Plus size={20} />
                                    {showGuestForm ? 'Close' : 'Add Guest'}
                                </button>
                            </div>

                            {showGuestForm && (
                                <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border border-indigo-50 animate-in fade-in slide-in-from-top-4">
                                    <h2 className="text-2xl font-bold mb-6 text-gray-800">
                                        {editingGuestId ? 'Edit Guest Details' : 'Register New Guest'}
                                    </h2>

                                    {duplicateWarning && (
                                        <div className={`p-5 rounded-2xl mb-8 ${duplicateWarning.error ? 'bg-red-50 border border-red-100' : 'bg-orange-50 border border-orange-100'}`}>
                                            <div className="flex items-start gap-4">
                                                <AlertTriangle className={duplicateWarning.error ? 'text-red-500' : 'text-orange-500'} size={24} />
                                                <div>
                                                    <h3 className={`font-black uppercase tracking-tight ${duplicateWarning.error ? 'text-red-800' : 'text-orange-800'}`}>
                                                        {duplicateWarning.error ? 'Duplicate Account Found' : 'Similar Record Exists'}
                                                    </h3>
                                                    <p className={`text-sm mt-1 font-medium ${duplicateWarning.error ? 'text-red-600' : 'text-orange-600'}`}>
                                                        {duplicateWarning.message}
                                                    </p>
                                                    {!duplicateWarning.error && (
                                                        <div className="mt-4 flex gap-4">
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await api.post('/guest-clients', { ...guestFormData, force: true });
                                                                        resetGuestForm();
                                                                        fetchGuests();
                                                                    } catch (e) { console.error(e); }
                                                                }}
                                                                className="bg-orange-100 text-orange-800 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-orange-200 transition"
                                                            >
                                                                Create Anyway
                                                            </button>
                                                            <button onClick={() => setDuplicateWarning(null)} className="text-gray-500 text-xs font-bold uppercase hover:underline">Correct Details</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <form onSubmit={handleGuestSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-black uppercase text-gray-400 mb-2 ml-1">Full Name *</label>
                                            <input type="text" name="name" value={guestFormData.name} onChange={handleGuestInputChange} className="w-full p-4 border border-gray-100 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase text-gray-400 mb-2 ml-1">Email</label>
                                            <input type="email" name="email" value={guestFormData.email} onChange={handleGuestInputChange} className="w-full p-4 border border-gray-100 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase text-gray-400 mb-2 ml-1">Phone Number</label>
                                            <input type="text" name="phone" value={guestFormData.phone} onChange={handleGuestInputChange} className="w-full p-4 border border-gray-100 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase text-gray-400 mb-2 ml-1">Program/Course</label>
                                            <input type="text" name="course" value={guestFormData.course} onChange={handleGuestInputChange} className="w-full p-4 border border-gray-100 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-black uppercase text-gray-400 mb-2 ml-1">Internal Notes</label>
                                            <textarea name="notes" value={guestFormData.notes} onChange={handleGuestInputChange} className="w-full p-4 border border-gray-100 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" rows={3} />
                                        </div>
                                        <div className="md:col-span-2 flex gap-4 mt-2">
                                            <button type="submit" className="flex-1 md:flex-none px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-100">
                                                {editingGuestId ? 'Update Record' : 'Save Guest'}
                                            </button>
                                            <button type="button" onClick={resetGuestForm} className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-200 transition">
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {guestsLoading ? <LoadingSpinner /> : filteredGuests.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                                    <Users size={48} className="mx-auto text-gray-200 mb-4" />
                                    <p className="text-gray-400 font-bold">No guest records found.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredGuests.map(guest => (
                                        <div key={guest.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group hover:-translate-y-1">
                                            <div className="flex justify-between items-start mb-5">
                                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
                                                    {guest.name.charAt(0)}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEditGuest(guest)} className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-xl transition"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteGuest(guest.id)} className="p-2 text-red-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition"><Trash2 size={16} /></button>
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-bold text-gray-900 mb-1">{guest.name}</h3>
                                            <div className="space-y-2 mt-4">
                                                {guest.email && <div className="flex items-center gap-2 text-sm text-gray-500 font-medium"><Mail size={14} className="text-gray-300" /> {guest.email}</div>}
                                                {guest.phone && <div className="flex items-center gap-2 text-sm text-gray-500 font-medium"><Phone size={14} className="text-gray-300" /> {guest.phone}</div>}
                                                {guest.course && <div className="flex items-center gap-2 text-sm text-gray-500 font-medium"><BookOpen size={14} className="text-gray-300" /> {guest.course}</div>}
                                            </div>

                                            <div className="mt-8 pt-5 border-t border-gray-50 flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase text-gray-300 tracking-widest">History</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-black">
                                                        {guest.task_count || 0} TASKS
                                                    </div>
                                                    <button
                                                        onClick={() => handleOpenGuestPortalLink(guest)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 text-xs font-black hover:bg-sky-100 transition"
                                                    >
                                                        <Link2 size={12} />
                                                        Portal Link
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Merge Modal */}
                {mergeModal.show && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 max-h-[90vh] flex flex-col relative scale-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                    <Merge className="text-indigo-600" size={28} /> MERGE HISTORY
                                </h2>
                                <button onClick={() => setMergeModal({ ...mergeModal, show: false, user: null, matches: [] })} className="text-gray-400 hover:text-gray-900 transition p-1">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="mb-6">
                                <p className="text-sm text-gray-500 font-medium mb-4">Connect guest history for <strong>{mergeModal.user?.full_name}</strong>:</p>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={mergeModal.searchTerm}
                                        placeholder="Search by name, email or phone..."
                                        className="w-full pl-11 pr-11 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                        onChange={async (e) => {
                                            const val = e.target.value;
                                            setMergeModal(prev => ({ ...prev, searchTerm: val }));
                                            if (val.length >= 1) {
                                                setMergeModal(prev => ({ ...prev, loading: true }));
                                                try {
                                                    const res = await apiService.searchGuests(val);
                                                    setMergeModal(prev => ({ ...prev, matches: res.guests, loading: false }));
                                                } catch (err) { setMergeModal(prev => ({ ...prev, loading: false })); }
                                            } else if (val === '') {
                                                checkMatches(mergeModal.user);
                                            }
                                        }}
                                    />
                                    {mergeModal.loading && <RefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" size={18} />}
                                </div>
                            </div>

                            <div className="overflow-y-auto flex-1 pr-1">
                                {mergeModal.loading ? <div className="py-12"><LoadingSpinner /></div> : (mergeModal.matches?.length || 0) === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
                                        <p className="text-gray-400 font-bold mb-4">No matching guests.</p>
                                        <button onClick={() => { setMergeModal({ ...mergeModal, show: false }); handleApprove(mergeModal.user); }} className="text-indigo-600 text-sm font-black uppercase tracking-widest">Just Approve User</button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {mergeModal.matches.map(match => (
                                            <div key={match.id} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-indigo-300 transition-all flex justify-between items-center group">
                                                <div className="min-w-0 flex-1 mr-4">
                                                    <div className="font-bold text-gray-900 truncate">{match.name}</div>
                                                    <div className="text-xs text-gray-400 font-medium truncate mt-0.5">{match.email || 'No Email'} · {match.phone || 'No Phone'}</div>
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <span className="bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase">{match.task_count} Tasks</span>
                                                        {match.match_type && <span className="text-[10px] text-gray-300 uppercase font-bold">{match.match_type.replace('_', ' ')}</span>}
                                                    </div>
                                                </div>
                                                <button onClick={() => performMerge(match.id)} className="h-10 px-5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition">Merge</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmModal config={confirm?.config} onConfirm={confirm?.action} onCancel={() => setConfirm(null)} />

            <GuestPaymentLinkModal
                isOpen={Boolean(guestPaymentLinkTarget)}
                target={guestPaymentLinkTarget}
                onClose={() => setGuestPaymentLinkTarget(null)}
            />
        </div>
    );
};

export default Clients;
