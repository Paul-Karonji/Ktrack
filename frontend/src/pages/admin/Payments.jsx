import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import Sidebar from '../../components/layout/Sidebar';
import apiService from '../../services/api';
import {
    BellRing,
    CreditCard,
    Loader2,
    Menu,
    RefreshCcw,
    Save,
    Search,
    SearchX,
    Send,
    Wallet
} from 'lucide-react';

const formatUsd = (amount) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
}).format(Number(amount || 0));

const formatKes = (amount) => new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES'
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

const Payments = () => {
    const { user, logout } = useAuth();
    const { openSidebar } = useNavigation();

    const [payments, setPayments] = useState([]);
    const [reminderOverview, setReminderOverview] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [settings, setSettings] = useState({
        depositRemindersEnabled: true,
        depositReminderIntervalHours: 24,
        balanceRemindersEnabled: true,
        balanceReminderIntervalDays: 7
    });
    const [savingSettings, setSavingSettings] = useState(false);
    const [sendingAll, setSendingAll] = useState(false);
    const [sendingClientId, setSendingClientId] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [paymentsResponse, settingsResponse, reminderResponse] = await Promise.all([
                apiService.getPaymentHistory(),
                apiService.getPaymentSettings(),
                apiService.getPaymentReminderOverview()
            ]);

            if (paymentsResponse?.success) {
                setPayments(paymentsResponse.data || []);
            }

            if (settingsResponse?.success) {
                setSettings({
                    depositRemindersEnabled: Boolean(settingsResponse.data.deposit_reminders_enabled),
                    depositReminderIntervalHours: Number(settingsResponse.data.deposit_reminder_interval_hours || 24),
                    balanceRemindersEnabled: Boolean(settingsResponse.data.balance_reminders_enabled),
                    balanceReminderIntervalDays: Number(settingsResponse.data.balance_reminder_interval_days || 7)
                });
            }

            if (reminderResponse?.success) {
                setReminderOverview(reminderResponse.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch payment admin data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const stats = useMemo(() => {
        return payments.reduce((accumulator, payment) => {
            const usdAmount = Number(payment.amount || 0);
            const kesAmount = Number(payment.kes_amount || 0);
            accumulator.totalUsd += usdAmount;
            accumulator.totalKes += kesAmount;
            accumulator.count += 1;
            if (payment.source === 'offline_admin') {
                accumulator.offlineUsd += usdAmount;
            } else {
                accumulator.platformUsd += usdAmount;
            }
            return accumulator;
        }, {
            totalUsd: 0,
            totalKes: 0,
            platformUsd: 0,
            offlineUsd: 0,
            count: 0
        });
    }, [payments]);

    const filteredPayments = useMemo(() => {
        return payments.filter((payment) => {
            const matchesSource = sourceFilter === 'all' || payment.source === sourceFilter;
            const q = searchTerm.trim().toLowerCase();
            const matchesSearch = !q || [
                payment.task_name,
                payment.display_client_name,
                payment.reference,
                payment.gateway_reference,
                payment.recorded_by_name
            ].some((value) => String(value || '').toLowerCase().includes(q));

            return matchesSource && matchesSearch;
        });
    }, [payments, searchTerm, sourceFilter]);

    const handleSettingsChange = (event) => {
        const { name, type, checked, value } = event.target;
        setSettings((current) => ({
            ...current,
            [name]: type === 'checkbox' ? checked : Number(value)
        }));
    };

    const saveSettings = async () => {
        try {
            setSavingSettings(true);
            const response = await apiService.updatePaymentSettings(settings);
            if (response?.success) {
                await fetchData();
            }
        } catch (error) {
            console.error('Failed to save reminder settings:', error);
            alert(error.response?.data?.message || 'Failed to save reminder settings.');
        } finally {
            setSavingSettings(false);
        }
    };

    const sendRemindersNow = async (clientId = null) => {
        try {
            if (clientId) {
                setSendingClientId(clientId);
            } else {
                setSendingAll(true);
            }

            const response = await apiService.sendPaymentRemindersNow(clientId ? { clientId } : {});
            if (response?.success) {
                await fetchData();
            }
        } catch (error) {
            console.error('Failed to send reminders:', error);
            alert(error.response?.data?.message || 'Failed to send reminders.');
        } finally {
            setSendingAll(false);
            setSendingClientId(null);
        }
    };

    const getSourceBadge = (source) => {
        return source === 'offline_admin'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-emerald-100 text-emerald-700';
    };

    const getTypeBadge = (type) => {
        if (type === 'deposit') return 'bg-blue-100 text-blue-700';
        if (type === 'balance') return 'bg-indigo-100 text-indigo-700';
        return 'bg-violet-100 text-violet-700';
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar user={user} onLogout={logout} />

            <div className="flex-1 lg:ml-64 p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
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
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Payments</h1>
                            </div>
                            <p className="text-gray-500">
                                Platform and offline revenue ledger, reminder controls, and payment audit.
                            </p>
                        </div>

                        <button
                            onClick={fetchData}
                            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm font-bold text-gray-700 hover:bg-gray-50"
                        >
                            <RefreshCcw size={16} />
                            Refresh
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <p className="text-xs uppercase tracking-[0.18em] font-black text-gray-400">Total Revenue</p>
                            <p className="text-3xl font-black text-gray-900 mt-2">{formatUsd(stats.totalUsd)}</p>
                            <p className="text-sm text-gray-500 mt-1">{stats.count} ledger entries</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <p className="text-xs uppercase tracking-[0.18em] font-black text-gray-400">Platform Revenue</p>
                            <p className="text-3xl font-black text-emerald-700 mt-2">{formatUsd(stats.platformUsd)}</p>
                            <p className="text-sm text-gray-500 mt-1">Paystack verified payments</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <p className="text-xs uppercase tracking-[0.18em] font-black text-gray-400">Offline Revenue</p>
                            <p className="text-3xl font-black text-amber-700 mt-2">{formatUsd(stats.offlineUsd)}</p>
                            <p className="text-sm text-gray-500 mt-1">Admin-recorded payments</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <p className="text-xs uppercase tracking-[0.18em] font-black text-gray-400">KES Equivalent</p>
                            <p className="text-3xl font-black text-indigo-700 mt-2">{formatKes(stats.totalKes)}</p>
                            <p className="text-sm text-gray-500 mt-1">Stored gateway conversions only</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[1.25fr,0.95fr] gap-6">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <BellRing size={18} className="text-indigo-600" />
                                        Reminder Settings
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Scheduled reminders keep running on their configured cadence. Manual send does not reset that timer.
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => sendRemindersNow()}
                                        disabled={sendingAll}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        {sendingAll ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        Send Reminders Now
                                    </button>
                                    <button
                                        onClick={saveSettings}
                                        disabled={savingSettings}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Save
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="rounded-2xl border border-gray-100 p-4 bg-gray-50 space-y-3">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="font-bold text-gray-800">Deposit Reminders</span>
                                        <input
                                            type="checkbox"
                                            name="depositRemindersEnabled"
                                            checked={settings.depositRemindersEnabled}
                                            onChange={handleSettingsChange}
                                            className="h-5 w-5 text-indigo-600 rounded"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.18em] font-black text-gray-400 mb-2">Hours</p>
                                        <input
                                            type="number"
                                            min="1"
                                            max="168"
                                            name="depositReminderIntervalHours"
                                            value={settings.depositReminderIntervalHours}
                                            onChange={handleSettingsChange}
                                            className="w-full rounded-xl border border-gray-200 px-3 py-2 font-semibold"
                                        />
                                    </div>
                                </label>

                                <label className="rounded-2xl border border-gray-100 p-4 bg-gray-50 space-y-3">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="font-bold text-gray-800">Balance Reminders</span>
                                        <input
                                            type="checkbox"
                                            name="balanceRemindersEnabled"
                                            checked={settings.balanceRemindersEnabled}
                                            onChange={handleSettingsChange}
                                            className="h-5 w-5 text-indigo-600 rounded"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.18em] font-black text-gray-400 mb-2">Days</p>
                                        <input
                                            type="number"
                                            min="1"
                                            max="90"
                                            name="balanceReminderIntervalDays"
                                            value={settings.balanceReminderIntervalDays}
                                            onChange={handleSettingsChange}
                                            className="w-full rounded-xl border border-gray-200 px-3 py-2 font-semibold"
                                        />
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <Wallet size={18} className="text-indigo-600" />
                                        Reminder Queue
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Eligible registered clients with current outstanding amounts.
                                    </p>
                                </div>
                            </div>

                            {loading ? (
                                <div className="py-8 text-center text-gray-500">Loading reminder overview...</div>
                            ) : reminderOverview.length === 0 ? (
                                <div className="py-8 text-center text-emerald-600 font-medium">
                                    No registered clients currently need payment reminders.
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                                    {reminderOverview.map((item) => (
                                        <div key={item.clientId} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="font-bold text-gray-900">{item.clientName}</p>
                                                    <p className="text-xs text-gray-500">{item.email}</p>
                                                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                                                        <span>{item.taskCount} task{item.taskCount === 1 ? '' : 's'}</span>
                                                        <span>{item.depositDueCount} deposit due</span>
                                                        <span>{item.balanceDueCount} balance due</span>
                                                        <span>{item.fullDueCount} full due</span>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-xl font-black text-indigo-700">{formatUsd(item.totalDue)}</p>
                                                    <button
                                                        onClick={() => sendRemindersNow(item.clientId)}
                                                        disabled={sendingClientId === item.clientId}
                                                        className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 disabled:opacity-50"
                                                    >
                                                        {sendingClientId === item.clientId ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                                        Send Now
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs text-gray-500">
                                                <p>Last scheduled: {formatDateTime(item.lastScheduledReminderAt)}</p>
                                                <p>Last manual: {formatDateTime(item.lastManualReminderAt)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by client, task, gateway ref, ledger ref, or admin..."
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    className="w-full pl-11 p-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                />
                            </div>

                            <select
                                value={sourceFilter}
                                onChange={(event) => setSourceFilter(event.target.value)}
                                className="px-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm font-medium text-gray-700"
                            >
                                <option value="all">All Channels</option>
                                <option value="platform">Platform Only</option>
                                <option value="offline_admin">Offline Only</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center">
                                <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                                <p className="text-gray-500 font-bold">Fetching payment ledger...</p>
                            </div>
                        ) : filteredPayments.length === 0 ? (
                            <div className="py-24 flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <SearchX size={40} className="text-gray-300" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">No payment entries found</h3>
                                <p className="text-gray-500 max-w-xs">Adjust the search or filter to see matching ledger entries.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/70 border-b border-gray-100">
                                        <tr>
                                            <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Received / Reference</th>
                                            <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Client / Task</th>
                                            <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Channel</th>
                                            <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Milestone</th>
                                            <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredPayments.map((payment) => (
                                            <tr key={payment.id} className="hover:bg-indigo-50/30 transition-colors">
                                                <td className="p-5">
                                                    <div className="flex flex-col">
                                                        <div className="text-sm font-bold text-gray-900">
                                                            {formatDateTime(payment.received_at || payment.created_at)}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">
                                                            Entry: {payment.reference || 'N/A'}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">
                                                            Gateway: {payment.gateway_reference || payment.reference || 'N/A'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex flex-col">
                                                        <div className="text-sm font-bold text-gray-900">{payment.display_client_name}</div>
                                                        <div className="text-xs text-gray-500 font-medium">{payment.task_name}</div>
                                                        {payment.recorded_by_name && (
                                                            <div className="text-[11px] text-gray-400 mt-1">
                                                                Recorded by {payment.recorded_by_name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getSourceBadge(payment.source)}`}>
                                                        {payment.source === 'offline_admin' ? 'Offline' : 'Platform'}
                                                    </span>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex w-fit px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${getTypeBadge(payment.type)}`}>
                                                            {payment.type}
                                                        </span>
                                                        {Number(payment.is_partial) === 1 && (
                                                            <span className="inline-flex w-fit px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700">
                                                                partial
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-gray-500">{payment.current_task_status}</span>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-right">
                                                    <div className="font-black text-gray-900">{formatUsd(payment.amount)}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {payment.kes_amount ? formatKes(payment.kes_amount) : 'No KES value'}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payments;
