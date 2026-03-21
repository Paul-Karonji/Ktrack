import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import Sidebar from '../../components/layout/Sidebar';
import apiService from '../../services/api';
import {
    CreditCard, Search, Menu,
    SearchX, Loader2, TrendingUp, BellRing, Save
} from 'lucide-react';

const Payments = () => {
    const { user, logout } = useAuth();
    const { openSidebar } = useNavigation();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ totalUsd: 0, totalKes: 0, count: 0 });
    const [settings, setSettings] = useState({
        depositRemindersEnabled: true,
        depositReminderIntervalHours: 24,
        balanceRemindersEnabled: true,
        balanceReminderIntervalDays: 7
    });
    const [savingSettings, setSavingSettings] = useState(false);

    const fetchPayments = useCallback(async () => {
        try {
            setLoading(true);
            const [paymentsResponse, settingsResponse] = await Promise.all([
                apiService.getPaymentHistory(),
                apiService.getPaymentSettings()
            ]);

            if (paymentsResponse.success) {
                setPayments(paymentsResponse.data);

                // Calculate quick stats
                const totals = paymentsResponse.data.reduce((acc, p) => {
                    acc.totalUsd += parseFloat(p.amount || 0);
                    acc.totalKes += parseFloat(p.kes_amount || 0);
                    return acc;
                }, { totalUsd: 0, totalKes: 0 });

                setStats({
                    totalUsd: totals.totalUsd,
                    totalKes: totals.totalKes,
                    count: paymentsResponse.data.length
                });
            }

            if (settingsResponse.success) {
                setSettings({
                    depositRemindersEnabled: Boolean(settingsResponse.data.deposit_reminders_enabled),
                    depositReminderIntervalHours: settingsResponse.data.deposit_reminder_interval_hours,
                    balanceRemindersEnabled: Boolean(settingsResponse.data.balance_reminders_enabled),
                    balanceReminderIntervalDays: settingsResponse.data.balance_reminder_interval_days
                });
            }
        } catch (error) {
            console.error('Failed to fetch payments:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const filteredPayments = payments.filter(p =>
        (p.task_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.display_client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.reference && p.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.gateway_reference && p.gateway_reference.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const fmt = (amount) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);

    const fmtKes = (amount) => new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
    }).format(amount);

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
            if (response.success) {
                await fetchPayments();
            }
        } catch (error) {
            console.error('Failed to save payment settings:', error);
            alert(error.response?.data?.message || 'Failed to save reminder settings.');
        } finally {
            setSavingSettings(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar user={user} onLogout={logout} />

            <div className="flex-1 lg:ml-64 p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <button onClick={openSidebar} className="lg:hidden p-2 hover:bg-gray-200 rounded-lg transition-colors">
                                    <Menu size={24} className="text-gray-600" />
                                </button>
                                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600 hidden lg:block">
                                    <CreditCard size={28} />
                                </div>
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Transaction History</h1>
                            </div>
                            <p className="text-gray-500 ml-10 lg:ml-0">
                                Detailed audit of every deposit and final settlement.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 bg-white p-2 border border-gray-100 rounded-2xl shadow-sm">
                            <div className="px-4 py-2 text-center border-r border-gray-100">
                                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Total Revenue</p>
                                <p className="text-lg font-bold text-indigo-600">{fmt(stats.totalUsd)}</p>
                            </div>
                            <div className="px-4 py-2 text-center text-emerald-600">
                                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">KES equivalent</p>
                                <p className="text-lg font-bold">KSh {Math.round(stats.totalKes).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <BellRing size={18} className="text-indigo-600" />
                                    Balance Reminder Settings
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Deposit reminders use hours. Balance reminders use days.
                                </p>
                            </div>
                            <button
                                onClick={saveSettings}
                                disabled={savingSettings}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Save
                            </button>
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

                    {/* Filters & Search */}
                    <div className="mb-6 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by Client, Project, or Reference..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 p-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                            />
                        </div>
                        <button
                            onClick={fetchPayments}
                            className="px-6 py-3.5 bg-white border border-gray-100 text-gray-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition shadow-sm"
                        >
                            <TrendingUp size={18} className="text-indigo-500" />
                            Refresh
                        </button>
                    </div>

                    {/* Transactions Table */}
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center">
                                <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                                <p className="text-gray-500 font-bold">Fetching transaction data...</p>
                            </div>
                        ) : filteredPayments.length === 0 ? (
                            <div className="py-32 flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <SearchX size={40} className="text-gray-300" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">No transactions found</h3>
                                <p className="text-gray-500 max-w-xs">Try adjusting your search or check again later.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50 border-b border-gray-100">
                                        <tr>
                                            <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Date / Reference</th>
                                            <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Client / Task</th>
                                            <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Milestone</th>
                                            <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Amount (USD)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredPayments.map((p) => (
                                            <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors group">
                                                <td className="p-5">
                                                        <div className="flex flex-col">
                                                            <div className="text-sm font-bold text-gray-900">{formatDate(p.created_at)}</div>
                                                            <div className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">
                                                            ENTRY: {p.reference || 'N/A'}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">
                                                            GATEWAY: {p.gateway_reference || p.reference || 'N/A'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                                                            {p.display_client_name}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                                            {p.task_name}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex w-fit px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest shadow-sm ${p.type === 'deposit'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : p.type === 'balance'
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-indigo-100 text-indigo-700'
                                                            }`}>
                                                            {p.type}
                                                        </span>
                                                        {p.currency === 'KES' && (
                                                            <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                Paid {fmtKes(p.kes_amount)} (@{p.exchange_rate})
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-5 text-right">
                                                    <div className="text-sm font-black text-gray-900">{fmt(p.amount)}</div>
                                                    <div className="text-[10px] text-gray-400 uppercase font-black">Settled</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Summary Footer */}
                        {!loading && filteredPayments.length > 0 && (
                            <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                                    Audit complete: {filteredPayments.length} records processed
                                </p>
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black uppercase text-gray-400">Net Revenue Accounted</span>
                                        <span className="text-xl font-black text-gray-900">{fmt(stats.totalUsd)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payments;
