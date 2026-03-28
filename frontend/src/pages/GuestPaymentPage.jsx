import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    CreditCard,
    Loader2,
    Mail,
    RefreshCcw,
    ShieldCheck,
    Wallet
} from 'lucide-react';
import apiService from '../services/api';
import { formatCurrency } from '../utils/formatters';

const getActionLabel = (phase) => {
    if (phase === 'deposit') return 'Pay Deposit';
    if (phase === 'balance') return 'Clear Balance';
    return 'Pay Now';
};

const GuestPaymentPage = () => {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState(null);
    const [error, setError] = useState(null);
    const [checkoutError, setCheckoutError] = useState('');
    const [email, setEmail] = useState('');
    const [isInitializing, setIsInitializing] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [busyTaskId, setBusyTaskId] = useState(null);

    const loadDetails = async () => {
        if (!token) return;

        try {
            setLoading(true);
            setError(null);
            setCheckoutError('');

            const response = await apiService.getGuestPaymentLink(token);
            if (!response?.success) {
                throw new Error(response?.message || 'Failed to load payment link.');
            }

            const nextDetails = response.data || null;
            setDetails(nextDetails);
            setEmail(nextDetails?.guestEmail || '');
        } catch (err) {
            setDetails(null);
            setError({
                state: err.response?.data?.state || 'invalid',
                message: err.response?.data?.message || err.message || 'This payment link could not be loaded.'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDetails();
    }, [token]);

    const startCheckout = async ({ mode, taskId = null }) => {
        if (!token) return;

        const normalizedEmail = String(email || '').trim().toLowerCase();
        if (!normalizedEmail) {
            setCheckoutError('Enter an email address before starting payment.');
            return;
        }

        try {
            setIsInitializing(true);
            setBusyTaskId(taskId);
            setCheckoutError('');

            const intentResponse = await apiService.initializeGuestPayment(token, {
                mode,
                taskId,
                email: normalizedEmail
            });

            if (!intentResponse?.success) {
                throw new Error(intentResponse?.message || 'Could not start payment.');
            }

            const PaystackPop = window.PaystackPop;
            if (!PaystackPop) {
                throw new Error('Paystack not loaded. Please refresh and try again.');
            }

            const handler = PaystackPop.setup({
                key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                email: intentResponse.email,
                amount: intentResponse.totalAmountKes,
                currency: 'KES',
                channels: ['card', 'mobile_money'],
                metadata: {
                    nonce: intentResponse.nonce,
                    payment_scope: 'guest',
                    guest_payment_mode: intentResponse.mode,
                    exchange_rate: intentResponse.exchangeRate,
                    payable_task_count: intentResponse.payableTaskCount
                },
                onSuccess: async (response) => {
                    setIsVerifying(true);
                    try {
                        const verifyResponse = await apiService.verifyGuestPayment(token, {
                            reference: response.reference,
                            nonce: intentResponse.nonce
                        });

                        if (verifyResponse?.success) {
                            await loadDetails();
                        }
                    } catch (verifyError) {
                        console.error('Guest payment verification failed:', verifyError);
                        setCheckoutError(verifyError.response?.data?.message || 'Payment succeeded, but the system could not apply it automatically. Please contact support.');
                    } finally {
                        setIsVerifying(false);
                    }
                },
                onCancel: () => { }
            });

            handler.openIframe();
        } catch (err) {
            console.error('Guest payment initialization failed:', err);
            setCheckoutError(err.response?.data?.message || err.message || 'Could not start payment.');
        } finally {
            setIsInitializing(false);
            setBusyTaskId(null);
        }
    };

    const renderErrorCard = () => {
        if (!error) return null;

        const isSettled = error.state === 'settled';
        const isRevoked = error.state === 'revoked';
        const tone = isSettled ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : isRevoked ? 'bg-red-50 border-red-100 text-red-800' : 'bg-amber-50 border-amber-100 text-amber-800';

        return (
            <div className={`rounded-3xl border px-6 py-8 shadow-sm ${tone}`}>
                <div className="flex items-start gap-3">
                    <ShieldCheck size={22} className={isSettled ? 'text-emerald-600' : 'text-amber-600'} />
                    <div>
                        <h2 className="text-xl font-black">
                            {isSettled ? 'Payment Settled' : isRevoked ? 'Link Revoked' : 'Link Unavailable'}
                        </h2>
                        <p className="text-sm mt-2">{error.message}</p>
                        {!isRevoked && !isSettled && (
                            <button
                                type="button"
                                onClick={loadDetails}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 text-gray-800 font-bold hover:bg-white"
                            >
                                <RefreshCcw size={16} />
                                Retry
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 px-8 py-10 text-center">
                    <Loader2 size={28} className="animate-spin mx-auto text-indigo-600 mb-4" />
                    <p className="font-bold text-gray-900">Loading payment link...</p>
                </div>
            </div>
        );
    }

    const isPortal = details?.scope === 'portal';
    const tasks = details?.tasks || [];
    const hasOutstanding = tasks.length > 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-100 shadow-sm text-indigo-700 text-xs font-black uppercase tracking-[0.18em]">
                        <ShieldCheck size={14} />
                        Secure Guest Payment
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-gray-900">
                        {details?.guestName || 'Guest Payment'}
                    </h1>
                    <p className="text-gray-500 max-w-2xl mx-auto">
                        Pay securely with Card or M-Pesa. Amounts are charged in KES and applied directly to your K-Track work record.
                    </p>
                </div>

                {error && renderErrorCard()}

                {!error && (
                    <>
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-[1.1fr,0.9fr] gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.18em] font-black text-gray-400">Scope</p>
                                        <h2 className="text-2xl font-black text-gray-900 mt-2">
                                            {isPortal ? 'Guest Payment Portal' : 'Task Payment Link'}
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-2">
                                            {isPortal
                                                ? 'Settle one task or clear all current guest balances in one checkout.'
                                                : 'This link always points at the current due amount for this task.'}
                                        </p>
                                    </div>

                                    <label className="block">
                                        <span className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2">
                                            <Mail size={16} className="text-indigo-600" />
                                            Receipt Email
                                        </span>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            placeholder="name@example.com"
                                            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <p className="text-xs text-gray-400 mt-2">
                                            {details?.requiresEmail
                                                ? 'Add an email to receive your Paystack receipt and start checkout.'
                                                : 'You can update the email for this checkout without changing the guest profile.'}
                                        </p>
                                    </label>
                                </div>

                                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                                    <p className="text-xs uppercase tracking-[0.18em] font-black text-emerald-500">Total Due Now</p>
                                    <div className="text-4xl font-black text-emerald-900 mt-3">
                                        {formatCurrency(details?.totalDue || 0)}
                                    </div>
                                    <p className="text-sm text-emerald-700 mt-3">
                                        {details?.payableTaskCount || 0} payable task{Number(details?.payableTaskCount || 0) === 1 ? '' : 's'} in this link.
                                    </p>

                                    {isPortal && hasOutstanding && tasks.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => startCheckout({ mode: 'bulk' })}
                                            disabled={isInitializing || isVerifying}
                                            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black hover:from-emerald-700 hover:to-teal-600 disabled:opacity-60"
                                        >
                                            {(isInitializing && busyTaskId == null) || isVerifying
                                                ? <Loader2 size={18} className="animate-spin" />
                                                : <Wallet size={18} />}
                                            {isVerifying ? 'Verifying...' : 'Pay Total Due'}
                                        </button>
                                    )}

                                    {!isPortal && hasOutstanding && (
                                        <button
                                            type="button"
                                            onClick={() => startCheckout({ mode: 'single', taskId: tasks[0]?.id })}
                                            disabled={isInitializing || isVerifying}
                                            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-black hover:from-indigo-700 hover:to-blue-600 disabled:opacity-60"
                                        >
                                            {(isInitializing && busyTaskId === tasks[0]?.id) || isVerifying
                                                ? <Loader2 size={18} className="animate-spin" />
                                                : <CreditCard size={18} />}
                                            {isVerifying ? 'Verifying...' : getActionLabel(tasks[0]?.currentDuePhase)}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {checkoutError && (
                                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                    {checkoutError}
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8">
                            <div className="flex items-center justify-between gap-4 mb-5">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.18em] font-black text-gray-400">Outstanding Items</p>
                                    <h2 className="text-2xl font-black text-gray-900 mt-2">
                                        {hasOutstanding ? 'Ready For Payment' : 'No Outstanding Balance'}
                                    </h2>
                                </div>
                            </div>

                            {!hasOutstanding ? (
                                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 px-5 py-6 text-emerald-800">
                                    <p className="font-bold">No outstanding payment is due right now.</p>
                                    <p className="text-sm mt-2">
                                        This portal link stays valid, so you can use the same URL again if new work is added later.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {tasks.map((task) => (
                                        <div key={task.id} className="rounded-3xl border border-gray-100 bg-gray-50/80 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div>
                                                <p className="text-lg font-black text-gray-900">{task.taskName}</p>
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                                                        {task.paymentStateLabel}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-gray-600 text-xs font-bold border border-gray-200 uppercase">
                                                        {task.currentDuePhase}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="md:text-right space-y-3">
                                                <div className="text-2xl font-black text-gray-900">
                                                    {formatCurrency(task.currentDueAmount || 0)}
                                                </div>
                                                {isPortal && (
                                                    <button
                                                        type="button"
                                                        onClick={() => startCheckout({ mode: 'single', taskId: task.id })}
                                                        disabled={isInitializing || isVerifying}
                                                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-800 font-bold hover:bg-gray-100 disabled:opacity-60"
                                                    >
                                                        {(isInitializing && busyTaskId === task.id) || isVerifying
                                                            ? <Loader2 size={16} className="animate-spin" />
                                                            : <CreditCard size={16} />}
                                                        {isVerifying ? 'Verifying...' : getActionLabel(task.currentDuePhase)}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default GuestPaymentPage;
