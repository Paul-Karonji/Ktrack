import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import Sidebar from '../components/layout/Sidebar';
import apiService from '../services/api';
import {
    CreditCard,
    ArrowUpRight,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Calendar,
    DollarSign,
    User,
    Wallet,
    Send,
    RefreshCcw,
    Menu,
    Search,
    Loader2
} from 'lucide-react';

const formatUsd = (amount) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
}).format(Number(amount || 0));

const formatDateTime = (value) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const Payouts = () => {
    const { user, logout } = useAuth();
    const { openSidebar } = useNavigation();

    const isSuperadmin = user?.role === 'superadmin';

    // State variables
    const [requests, setRequests] = useState([]);
    const [balanceInfo, setBalanceInfo] = useState({ totalEarned: 0, totalRequested: 0, availableBalance: 0 });
    const [adminStats, setAdminStats] = useState({ pendingTotal: 0, approvedTotal: 0, pendingCount: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modal state for Tutor: Request Payout
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestAmount, setRequestAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('M-Pesa');
    const [paymentDetails, setPaymentDetails] = useState('');
    const [requestError, setRequestError] = useState('');
    const [requestSubmitting, setRequestSubmitting] = useState(false);

    // Modal state for Admin: Resolve Payout
    const [resolvingRequest, setResolvingRequest] = useState(null); // holds the request object
    const [resolutionStatus, setResolutionStatus] = useState('approved'); // approved / rejected
    const [adminNotes, setAdminNotes] = useState('');
    const [resolveSubmitting, setResolveSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            if (isSuperadmin) {
                const response = await apiService.adminGetPayoutRequests();
                if (response?.success) {
                    setRequests(response.requests || []);
                    setAdminStats(response.stats || { pendingTotal: 0, approvedTotal: 0, pendingCount: 0 });
                }
            } else {
                const response = await apiService.getPayoutHistory();
                if (response?.success) {
                    setRequests(response.requests || []);
                    setBalanceInfo(response.balance || { totalEarned: 0, totalRequested: 0, availableBalance: 0 });
                }
            }
        } catch (error) {
            console.error('Failed to fetch payout records:', error);
        } finally {
            setLoading(false);
        }
    }, [isSuperadmin]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredRequests = useMemo(() => {
        return requests.filter((request) => {
            const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
            const q = searchTerm.trim().toLowerCase();
            const matchesSearch = !q || [
                request.tutor_name,
                request.tutor_email,
                request.payment_method,
                request.payment_details,
                request.admin_notes
            ].some((value) => String(value || '').toLowerCase().includes(q));

            return matchesStatus && matchesSearch;
        });
    }, [requests, searchTerm, statusFilter]);

    // Handle submit payout request (Tutor)
    const handleRequestSubmit = async (e) => {
        e.preventDefault();
        setRequestError('');
        const amount = parseFloat(requestAmount);

        if (isNaN(amount) || amount <= 0) {
            setRequestError('Please enter a valid positive payout amount.');
            return;
        }

        if (amount > balanceInfo.availableBalance) {
            setRequestError(`Insufficient balance. You can only request up to $${balanceInfo.availableBalance.toFixed(2)}.`);
            return;
        }

        if (!paymentDetails.trim()) {
            setRequestError('Please provide payment details (e.g., phone number or account information).');
            return;
        }

        try {
            setRequestSubmitting(true);
            const response = await apiService.requestPayout({
                amount,
                paymentMethod,
                paymentDetails
            });

            if (response?.success) {
                setShowRequestModal(false);
                setRequestAmount('');
                setPaymentDetails('');
                await fetchData();
                alert('Payout request submitted successfully!');
            }
        } catch (error) {
            console.error('Request Payout Error:', error);
            setRequestError(error.response?.data?.message || 'Failed to submit payout request. Please try again.');
        } finally {
            setRequestSubmitting(false);
        }
    };

    // Handle resolve request (Admin)
    const handleResolveSubmit = async (e) => {
        e.preventDefault();
        try {
            setResolveSubmitting(true);
            const response = await apiService.adminResolvePayoutRequest(resolvingRequest.id, {
                status: resolutionStatus,
                adminNotes
            });

            if (response?.success) {
                setResolvingRequest(null);
                setAdminNotes('');
                await fetchData();
                alert(`Payout request successfully marked as ${resolutionStatus}!`);
            }
        } catch (error) {
            console.error('Resolve Payout Error:', error);
            alert(error.response?.data?.message || 'Failed to resolve payout request.');
        } finally {
            setResolveSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'approved') {
            return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
        }
        if (status === 'rejected') {
            return 'bg-rose-100 text-rose-800 border border-rose-200';
        }
        return 'bg-amber-100 text-amber-800 border border-amber-200';
    };

    const getStatusIcon = (status) => {
        if (status === 'approved') return <CheckCircle2 size={16} className="text-emerald-600" />;
        if (status === 'rejected') return <XCircle size={16} className="text-rose-600" />;
        return <AlertCircle size={16} className="text-amber-600" />;
    };

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar user={user} onLogout={logout} />

            <div className="flex-1 lg:ml-64 p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <button
                                    onClick={openSidebar}
                                    className="lg:hidden p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <Menu size={24} className="text-gray-600" />
                                </button>
                                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600 hidden lg:block">
                                    <CreditCard size={28} />
                                </div>
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Payout Ledger</h1>
                            </div>
                            <p className="text-gray-500">
                                {isSuperadmin 
                                    ? 'Review, approve, reject, and monitor all tutor payouts and financial disbursements.'
                                    : 'Track your earned task revenue, request payouts, and check payout processing history.'}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={fetchData}
                                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm font-bold text-gray-700 hover:bg-gray-50 transition-all active:scale-95"
                            >
                                <RefreshCcw size={16} />
                                Refresh
                            </button>

                            {!isSuperadmin && (
                                <button
                                    onClick={() => setShowRequestModal(true)}
                                    disabled={balanceInfo.availableBalance <= 0}
                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-indigo-500/20"
                                >
                                    <ArrowUpRight size={18} />
                                    Request Payout
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats Rows */}
                    {isSuperadmin ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden group hover:border-amber-200 transition-all">
                                <div className="absolute right-4 top-4 p-3 bg-amber-50 rounded-xl text-amber-600">
                                    <AlertCircle size={22} />
                                </div>
                                <p className="text-xs uppercase tracking-[0.15em] font-black text-gray-400">Pending Requests</p>
                                <p className="text-3xl font-black text-gray-900 mt-2">{formatUsd(adminStats.pendingTotal)}</p>
                                <p className="text-sm text-amber-600 font-semibold mt-1">{adminStats.pendingCount} tutor requests awaiting approval</p>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden group hover:border-emerald-200 transition-all">
                                <div className="absolute right-4 top-4 p-3 bg-emerald-50 rounded-xl text-emerald-600">
                                    <CheckCircle2 size={22} />
                                </div>
                                <p className="text-xs uppercase tracking-[0.15em] font-black text-gray-400">Total Paid Out</p>
                                <p className="text-3xl font-black text-emerald-700 mt-2">{formatUsd(adminStats.approvedTotal)}</p>
                                <p className="text-sm text-gray-500 mt-1">Successfully approved and recorded payouts</p>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden group hover:border-indigo-200 transition-all">
                                <div className="absolute right-4 top-4 p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                    <Wallet size={22} />
                                </div>
                                <p className="text-xs uppercase tracking-[0.15em] font-black text-gray-400">System Liquidity</p>
                                <p className="text-3xl font-black text-indigo-700 mt-2">Active</p>
                                <p className="text-sm text-gray-500 mt-1">All payment methods operational</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden group hover:border-indigo-200 transition-all">
                                <div className="absolute right-4 top-4 p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                    <Wallet size={22} />
                                </div>
                                <p className="text-xs uppercase tracking-[0.15em] font-black text-gray-400">Available Balance</p>
                                <p className="text-3xl font-black text-indigo-700 mt-2">{formatUsd(balanceInfo.availableBalance)}</p>
                                <p className="text-sm text-gray-500 mt-1">Ready to withdraw</p>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden group hover:border-amber-200 transition-all">
                                <div className="absolute right-4 top-4 p-3 bg-amber-50 rounded-xl text-amber-600">
                                    <Clock size={22} className="animate-pulse" />
                                </div>
                                <p className="text-xs uppercase tracking-[0.15em] font-black text-gray-400">Requested / Processing</p>
                                <p className="text-3xl font-black text-gray-900 mt-2">{formatUsd(balanceInfo.totalRequested)}</p>
                                <p className="text-sm text-gray-500 mt-1">Pending and approved payout request totals</p>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden group hover:border-emerald-200 transition-all">
                                <div className="absolute right-4 top-4 p-3 bg-emerald-50 rounded-xl text-emerald-600">
                                    <CheckCircle2 size={22} />
                                </div>
                                <p className="text-xs uppercase tracking-[0.15em] font-black text-gray-400">Total Earned Task Revenue</p>
                                <p className="text-3xl font-black text-emerald-700 mt-2">{formatUsd(balanceInfo.totalEarned)}</p>
                                <p className="text-sm text-gray-500 mt-1">From all assigned completed client-paid tasks</p>
                            </div>
                        </div>
                    )}

                    {/* Filter & Search Bar */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder={isSuperadmin ? "Search requests by tutor name, email, details, notes..." : "Search payouts by details or notes..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 p-3.5 bg-gray-50/50 hover:bg-gray-50 focus:bg-white border-2 border-gray-100 focus:border-indigo-500 rounded-2xl outline-none font-medium transition-all"
                            />
                        </div>

                        <div className="flex gap-2 w-full md:w-auto">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full md:w-auto px-4 py-3.5 bg-white border-2 border-gray-100 rounded-2xl font-semibold text-gray-700 focus:border-indigo-500 outline-none"
                            >
                                <option value="all">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>

                    {/* Request Ledger Table */}
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center">
                                <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                                <p className="text-gray-500 font-bold">Loading Payout records...</p>
                            </div>
                        ) : filteredRequests.length === 0 ? (
                            <div className="py-24 flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <CreditCard size={40} className="text-gray-300" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">No payout requests found</h3>
                                <p className="text-gray-500 max-w-sm mt-1">There are no records matching your current filter selections.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Date Requested</th>
                                            {isSuperadmin && <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Tutor</th>}
                                            <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Payout Method / Details</th>
                                            <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Status / Ledger Refs</th>
                                            <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                            {isSuperadmin && <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredRequests.map((request) => (
                                            <tr key={request.id} className="hover:bg-indigo-50/20 transition-all duration-150">
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <Calendar size={18} className="text-gray-400" />
                                                        <div className="text-sm font-bold text-gray-900">
                                                            {formatDateTime(request.created_at)}
                                                        </div>
                                                    </div>
                                                </td>

                                                {isSuperadmin && (
                                                    <td className="p-5">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-gray-900">{request.tutor_name || 'N/A'}</span>
                                                            <span className="text-xs text-gray-400 font-medium">{request.tutor_email}</span>
                                                        </div>
                                                    </td>
                                                )}

                                                <td className="p-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                                            <CreditCard size={14} className="text-indigo-600" />
                                                            {request.payment_method}
                                                        </span>
                                                        <span className="text-xs text-gray-500 font-medium mt-1 max-w-xs break-all">
                                                            {request.payment_details}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="p-5">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className={`inline-flex w-fit items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${getStatusBadge(request.status)}`}>
                                                            {getStatusIcon(request.status)}
                                                            {request.status}
                                                        </span>
                                                        {request.admin_notes && (
                                                            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 border border-gray-100 max-w-xs">
                                                                <span className="font-semibold text-gray-700">Admin Notes: </span>
                                                                {request.admin_notes}
                                                            </div>
                                                        )}
                                                        {request.resolved_at && (
                                                            <span className="text-[10px] text-gray-400">
                                                                Resolved by {request.resolved_by_name || 'System'} on {formatDateTime(request.resolved_at)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="p-5 text-right font-black text-lg text-gray-900">
                                                    {formatUsd(request.amount)}
                                                </td>

                                                {isSuperadmin && (
                                                    <td className="p-5 text-center">
                                                        {request.status === 'pending' ? (
                                                            <button
                                                                onClick={() => setResolvingRequest(request)}
                                                                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold rounded-xl text-xs transition-all outline-none border border-indigo-100 hover:border-indigo-600 active:scale-95 shadow-sm"
                                                            >
                                                                Resolve Request
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs font-semibold text-gray-400">Completed</span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tutor Payout Request Modal */}
            {showRequestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transform scale-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Request Payout</h3>
                                <p className="text-xs text-gray-500 mt-1">Submit earnings withdrawal request</p>
                            </div>
                            <button
                                onClick={() => setShowRequestModal(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <XCircle size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleRequestSubmit} className="p-6 space-y-4">
                            {requestError && (
                                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-sm font-semibold rounded-xl flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    <span>{requestError}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs uppercase tracking-[0.15em] font-black text-gray-400 mb-1.5">Amount (USD)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        placeholder="0.00"
                                        value={requestAmount}
                                        onChange={(e) => setRequestAmount(e.target.value)}
                                        className="w-full pl-8 pr-20 py-3.5 bg-gray-50 focus:bg-white border-2 border-gray-100 focus:border-indigo-500 rounded-2xl outline-none font-bold text-lg transition-all"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setRequestAmount(balanceInfo.availableBalance.toFixed(2))}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors"
                                    >
                                        Max Limit
                                    </button>
                                </div>
                                <span className="text-[11px] text-gray-400 mt-1 block">
                                    Available balance: <span className="font-bold text-indigo-600">{formatUsd(balanceInfo.availableBalance)}</span>
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-[0.15em] font-black text-gray-400 mb-1.5">Payment Method</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full p-3.5 bg-gray-50 focus:bg-white border-2 border-gray-100 focus:border-indigo-500 rounded-2xl outline-none font-semibold text-gray-700 transition-all"
                                >
                                    <option value="M-Pesa">M-Pesa</option>
                                    <option value="PayPal">PayPal</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Card/Other">Card / Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-[0.15em] font-black text-gray-400 mb-1.5">Payment Details</label>
                                <textarea
                                    rows="3"
                                    placeholder={paymentMethod === 'M-Pesa' 
                                        ? "Enter M-Pesa Phone number (e.g., +254 700 000000)" 
                                        : paymentMethod === 'PayPal' 
                                            ? "Enter your PayPal registered email address" 
                                            : "Enter complete Bank Name, Account Name, Account Number, and Swift/IBAN details"}
                                    value={paymentDetails}
                                    onChange={(e) => setPaymentDetails(e.target.value)}
                                    className="w-full p-3.5 bg-gray-50 focus:bg-white border-2 border-gray-100 focus:border-indigo-500 rounded-2xl outline-none font-semibold text-gray-700 transition-all text-sm resize-none"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={requestSubmitting}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50 active:scale-[0.98] shadow-md hover:shadow-indigo-500/20"
                            >
                                {requestSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                Submit Payout Request
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Admin Payout Resolution Modal */}
            {resolvingRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transform scale-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Resolve Payout Request</h3>
                                <p className="text-xs text-gray-500 mt-1">Approve or reject tutor withdrawal</p>
                            </div>
                            <button
                                onClick={() => setResolvingRequest(null)}
                                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <XCircle size={22} />
                            </button>
                        </div>

                        <div className="p-6 bg-gray-50 border-b border-gray-100 space-y-2">
                            <div className="flex justify-between items-center text-sm font-semibold">
                                <span className="text-gray-500">Tutor:</span>
                                <span className="text-gray-900 font-bold">{resolvingRequest.tutor_name}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-semibold">
                                <span className="text-gray-500">Method:</span>
                                <span className="text-gray-950 font-bold">{resolvingRequest.payment_method}</span>
                            </div>
                            <div className="flex justify-between items-start text-sm font-semibold">
                                <span className="text-gray-500">Details:</span>
                                <span className="text-gray-900 text-right max-w-[200px] break-all">{resolvingRequest.payment_details}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-semibold pt-1 border-t border-gray-200">
                                <span className="text-gray-500">Requested Amount:</span>
                                <span className="text-indigo-700 font-black text-lg">{formatUsd(resolvingRequest.amount)}</span>
                            </div>
                        </div>

                        <form onSubmit={handleResolveSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-[0.15em] font-black text-gray-400 mb-1.5">Action Status</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setResolutionStatus('approved')}
                                        className={`py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-1.5 ${resolutionStatus === 'approved' 
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' 
                                            : 'bg-white border-gray-100 hover:border-gray-200 text-gray-500'}`}
                                    >
                                        <CheckCircle2 size={16} />
                                        Approve
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setResolutionStatus('rejected')}
                                        className={`py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-1.5 ${resolutionStatus === 'rejected' 
                                            ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm' 
                                            : 'bg-white border-gray-100 hover:border-gray-200 text-gray-500'}`}
                                    >
                                        <XCircle size={16} />
                                        Reject
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-[0.15em] font-black text-gray-400 mb-1.5">
                                    {resolutionStatus === 'approved' ? 'Transaction Code / Audit Ref' : 'Rejection Reason'}
                                </label>
                                <textarea
                                    rows="3"
                                    placeholder={resolutionStatus === 'approved' 
                                        ? "Enter M-Pesa transaction ID, bank confirmation number, or other audit reference details..." 
                                        : "Enter clear feedback explaining why this withdrawal request was declined..."}
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    className="w-full p-3.5 bg-gray-50 focus:bg-white border-2 border-gray-100 focus:border-indigo-500 rounded-2xl outline-none font-semibold text-gray-700 transition-all text-sm resize-none"
                                    required={resolutionStatus === 'rejected'}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={resolveSubmitting}
                                className={`w-full flex items-center justify-center gap-2 py-4 text-white font-bold rounded-2xl transition-all disabled:opacity-50 active:scale-[0.98] shadow-md ${resolutionStatus === 'approved' 
                                    ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-500/20' 
                                    : 'bg-rose-600 hover:bg-rose-700 hover:shadow-rose-500/20'}`}
                            >
                                {resolveSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                Mark Payout Resolved
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Payouts;
