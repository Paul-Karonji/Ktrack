import React, { useEffect, useMemo, useState } from 'react';
import {
    Ban,
    Copy,
    ExternalLink,
    Link2,
    Loader2,
    RefreshCcw,
    ShieldCheck,
    X
} from 'lucide-react';
import apiService from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

const copyToClipboard = async (value) => {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
    }

    window.prompt('Copy this link:', value);
    return false;
};

const extractToken = (publicUrl) => {
    if (!publicUrl) return '';

    try {
        const url = new URL(publicUrl);
        const parts = url.pathname.split('/').filter(Boolean);
        return decodeURIComponent(parts[parts.length - 1] || '');
    } catch (_error) {
        return decodeURIComponent(String(publicUrl).split('/').pop() || '');
    }
};

const buildPayload = (target, collectionMode, fixedAmountUsd) => {
    if (!target) return null;

    if (target.scope === 'task') {
        return {
            scope: 'task',
            taskId: target.task?.id
        };
    }

    const payload = {
        scope: 'portal',
        guestClientId: target.guest?.id,
        collectionMode
    };

    if (collectionMode === 'fixed_amount') {
        payload.fixedAmountUsd = Number(fixedAmountUsd || 0);
    }

    return payload;
};

const MODE_OPTIONS = [
    { value: 'all_balances', label: 'All Balances', hint: 'Collect the full remaining balance across all unpaid guest tasks.' },
    { value: 'current_due', label: 'Current Due', hint: 'Only collect each task current due milestone, like the existing portal flow.' },
    { value: 'fixed_amount', label: 'Fixed Amount', hint: 'Request one exact amount and apply it oldest-due-first across unpaid tasks.' }
];

const GuestPaymentLinkModal = ({ isOpen, target, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [linkData, setLinkData] = useState(null);
    const [preview, setPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [collectionMode, setCollectionMode] = useState('all_balances');
    const [fixedAmountUsd, setFixedAmountUsd] = useState('');

    const isTaskLink = target?.scope === 'task';
    const targetLabel = useMemo(() => {
        if (!target) return '';
        if (isTaskLink) {
            return target.task?.task_name || `Task #${target.task?.id || ''}`;
        }
        return target.guest?.name || 'Guest Client';
    }, [isTaskLink, target]);

    const title = isTaskLink ? 'Guest Task Payment Link' : 'Guest Payment Portal Link';
    const description = useMemo(() => {
        if (isTaskLink) {
            return 'This link opens a payment page for the current due amount on this guest task.';
        }

        if (collectionMode === 'fixed_amount') {
            return 'This link requests one exact amount and applies it oldest-due-first across the guest unpaid tasks.';
        }

        if (collectionMode === 'current_due') {
            return 'This portal shows only each task current due milestone, not the full outstanding balance.';
        }

        return 'This portal collects the full remaining balance across every currently payable guest task.';
    }, [collectionMode, isTaskLink]);

    const loadPreview = async (publicUrl) => {
        const token = extractToken(publicUrl);
        if (!token) {
            setPreview(null);
            return;
        }

        try {
            setPreviewLoading(true);
            const response = await apiService.getGuestPaymentLink(token);
            if (!response?.success) {
                throw new Error(response?.message || 'Failed to load link preview.');
            }

            setPreview(response.data || null);
        } catch (err) {
            setPreview(null);
            setError(err.response?.data?.message || err.message || 'Failed to load payment link preview.');
        } finally {
            setPreviewLoading(false);
        }
    };

    const loadLink = async (overrides = {}) => {
        const nextMode = overrides.collectionMode ?? collectionMode;
        const nextFixedAmount = overrides.fixedAmountUsd ?? fixedAmountUsd;
        const payload = buildPayload(target, nextMode, nextFixedAmount);
        if (!payload) return;

        try {
            setLoading(true);
            setError('');
            setCopied(false);
            setPreview(null);

            const response = await apiService.createGuestPaymentLink(payload);
            if (!response?.success) {
                throw new Error(response?.message || 'Failed to prepare payment link.');
            }

            const nextLinkData = response.data || null;
            setLinkData(nextLinkData);
            if (nextLinkData?.publicUrl) {
                await loadPreview(nextLinkData.publicUrl);
            }
        } catch (err) {
            setLinkData(null);
            setPreview(null);
            setError(err.response?.data?.message || err.message || 'Failed to prepare payment link.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && target) {
            const defaultMode = target.scope === 'task' ? 'current_due' : 'all_balances';
            setCollectionMode(defaultMode);
            setFixedAmountUsd('');
            setLoading(false);
            setPreview(null);
            setError('');
            setLinkData(null);
            setCopied(false);
            setIsRevoking(false);
            setIsRegenerating(false);
            loadLink({ collectionMode: defaultMode, fixedAmountUsd: '' });
        } else {
            setLoading(false);
            setError('');
            setLinkData(null);
            setPreview(null);
            setCopied(false);
            setIsRevoking(false);
            setIsRegenerating(false);
        }
    }, [isOpen, target]);

    const handleCopy = async () => {
        if (!linkData?.publicUrl) return;
        await copyToClipboard(linkData.publicUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    };

    const handleModeChange = (event) => {
        setCollectionMode(event.target.value);
        setLinkData(null);
        setPreview(null);
        setError('');
        setCopied(false);
    };

    const handleFixedAmountChange = (event) => {
        setFixedAmountUsd(event.target.value);
        setLinkData(null);
        setPreview(null);
        setError('');
        setCopied(false);
    };

    const handleRevoke = async () => {
        if (!linkData?.linkId) return;
        if (!window.confirm('Revoke this payment link? The current URL will stop working immediately.')) {
            return;
        }

        try {
            setIsRevoking(true);
            const response = await apiService.revokeGuestPaymentLink(linkData.linkId);
            if (!response?.success) {
                throw new Error(response?.message || 'Failed to revoke payment link.');
            }

            setError('Link revoked. Generate again when you need a fresh URL.');
            setLinkData(null);
            setPreview(null);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to revoke payment link.');
        } finally {
            setIsRevoking(false);
        }
    };

    const handleRegenerate = async () => {
        try {
            setIsRegenerating(true);

            if (linkData?.linkId) {
                await apiService.revokeGuestPaymentLink(linkData.linkId);
            }

            await loadLink();
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to regenerate payment link.');
        } finally {
            setIsRegenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-[0.18em]">
                            <Link2 size={14} />
                            {isTaskLink ? 'Single Task' : 'Portal'}
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mt-3">{title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{description}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] font-black text-indigo-400">
                            {isTaskLink ? 'Task' : 'Guest'}
                        </p>
                        <p className="text-base font-bold text-indigo-950 mt-1">{targetLabel}</p>
                        {isTaskLink && target?.task?.display_client_name && (
                            <p className="text-sm text-indigo-700 mt-1">{target.task.display_client_name}</p>
                        )}
                    </div>

                    {!isTaskLink && (
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-[0.18em] font-black text-gray-400 mb-2">
                                    Portal Mode
                                </label>
                                <select
                                    value={collectionMode}
                                    onChange={handleModeChange}
                                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800"
                                >
                                    {MODE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                <p className="text-sm text-gray-500 mt-2">
                                    {MODE_OPTIONS.find((option) => option.value === collectionMode)?.hint}
                                </p>
                            </div>

                            {collectionMode === 'fixed_amount' && (
                                <div>
                                    <label className="block text-xs uppercase tracking-[0.18em] font-black text-gray-400 mb-2">
                                        Requested Amount (USD)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={fixedAmountUsd}
                                        onChange={handleFixedAmountChange}
                                        placeholder="0.00"
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        This amount will be applied oldest-due-first across the guest unpaid tasks.
                                    </p>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => loadLink()}
                                disabled={loading || previewLoading || (collectionMode === 'fixed_amount' && Number(fixedAmountUsd || 0) <= 0)}
                                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                                Prepare Link
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-8 text-center text-gray-500">
                            <Loader2 size={22} className="animate-spin mx-auto mb-3 text-indigo-600" />
                            Preparing link...
                        </div>
                    ) : error ? (
                        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <Ban size={18} className="text-red-500 mt-0.5" />
                                <div>
                                    <p className="font-bold text-red-800">Link unavailable</p>
                                    <p className="text-sm text-red-600 mt-1">{error}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => loadLink()}
                                    className="px-4 py-2 rounded-xl bg-white border border-red-200 text-red-700 font-bold hover:bg-red-50"
                                >
                                    Retry
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    ) : linkData ? (
                        <>
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                                <div className="flex items-start gap-3">
                                    <ShieldCheck size={18} className="text-emerald-600 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-emerald-900">
                                            {linkData.reused ? 'Existing link ready' : 'Fresh link ready'}
                                        </p>
                                        <p className="text-sm text-emerald-700 mt-1">
                                            Anyone with this secure URL can open the guest payment page and make the payment configured here.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-[0.18em] font-black text-gray-400 mb-2">
                                    Public Link
                                </label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={linkData.publicUrl || ''}
                                        readOnly
                                        className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
                                    />
                                    <a
                                        href={linkData.publicUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-50"
                                    >
                                        <ExternalLink size={16} />
                                        Open
                                    </a>
                                </div>
                            </div>

                            {(previewLoading || preview) && (
                                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.18em] font-black text-gray-400">Preview</p>
                                            <p className="text-sm font-bold text-gray-900 mt-1">
                                                {preview?.collectionMode === 'fixed_amount'
                                                    ? 'Fixed amount checkout'
                                                    : preview?.collectionMode === 'current_due'
                                                        ? 'Current due portal'
                                                        : preview?.scope === 'task'
                                                            ? 'Single task checkout'
                                                            : 'All balances portal'}
                                            </p>
                                        </div>
                                        {previewLoading && <Loader2 size={16} className="animate-spin text-indigo-600" />}
                                    </div>

                                    {preview && (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="rounded-2xl bg-white border border-gray-200 px-4 py-3">
                                                    <p className="text-xs uppercase tracking-[0.18em] font-black text-gray-400">Charge</p>
                                                    <p className="text-lg font-black text-gray-900 mt-1">{formatCurrency(preview.totalDue || 0)}</p>
                                                </div>
                                                <div className="rounded-2xl bg-white border border-gray-200 px-4 py-3">
                                                    <p className="text-xs uppercase tracking-[0.18em] font-black text-gray-400">Outstanding</p>
                                                    <p className="text-lg font-black text-gray-900 mt-1">{formatCurrency(preview.eligibleOutstandingTotal || 0)}</p>
                                                </div>
                                            </div>

                                            {preview.collectionMode === 'fixed_amount' && preview.allocationPreview?.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-xs uppercase tracking-[0.18em] font-black text-gray-400">
                                                        Allocation Preview
                                                    </p>
                                                    {preview.allocationPreview.map((item) => (
                                                        <div key={item.taskId} className="rounded-2xl bg-white border border-gray-200 px-4 py-3">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <p className="font-bold text-gray-900">{item.taskName}</p>
                                                                <p className="font-black text-gray-900">{formatCurrency(item.totalAmount || 0)}</p>
                                                            </div>
                                                            <p className="text-xs text-gray-500 mt-2">
                                                                {item.segments.map((segment) => `${segment.phase}: ${formatCurrency(segment.amount || 0)}`).join(' | ')}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                                >
                                    <Copy size={16} />
                                    {copied ? 'Copied' : 'Copy Link'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRegenerate}
                                    disabled={isRegenerating || isRevoking}
                                    className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {(isRegenerating || loading) ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                                    Regenerate
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRevoke}
                                    disabled={isRevoking || isRegenerating}
                                    className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-50 text-red-700 font-bold hover:bg-red-100 disabled:opacity-50"
                                >
                                    {isRevoking ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                                    Revoke
                                </button>
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default GuestPaymentLinkModal;
