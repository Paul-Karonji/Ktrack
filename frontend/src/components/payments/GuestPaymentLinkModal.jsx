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

const copyToClipboard = async (value) => {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
    }

    window.prompt('Copy this link:', value);
    return false;
};

const buildPayload = (target) => {
    if (!target) return null;

    if (target.scope === 'task') {
        return {
            scope: 'task',
            taskId: target.task?.id
        };
    }

    return {
        scope: 'portal',
        guestClientId: target.guest?.id
    };
};

const GuestPaymentLinkModal = ({ isOpen, target, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [linkData, setLinkData] = useState(null);
    const [copied, setCopied] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

    const targetLabel = useMemo(() => {
        if (!target) return '';
        if (target.scope === 'task') {
            return target.task?.task_name || `Task #${target.task?.id || ''}`;
        }
        return target.guest?.name || 'Guest Client';
    }, [target]);

    const title = target?.scope === 'task' ? 'Guest Task Payment Link' : 'Guest Payment Portal Link';
    const description = target?.scope === 'task'
        ? 'This link opens a payment page for the current due amount on this guest task.'
        : 'This link opens a guest payment portal showing all currently payable tasks for this guest.';

    const loadLink = async () => {
        const payload = buildPayload(target);
        if (!payload) return;

        try {
            setLoading(true);
            setError('');
            setCopied(false);

            const response = await apiService.createGuestPaymentLink(payload);
            if (!response?.success) {
                throw new Error(response?.message || 'Failed to prepare payment link.');
            }

            setLinkData(response.data || null);
        } catch (err) {
            setLinkData(null);
            setError(err.response?.data?.message || err.message || 'Failed to prepare payment link.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && target) {
            loadLink();
        } else {
            setLoading(false);
            setError('');
            setLinkData(null);
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
                            {target?.scope === 'task' ? 'Single Task' : 'Portal'}
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
                            {target?.scope === 'task' ? 'Task' : 'Guest'}
                        </p>
                        <p className="text-base font-bold text-indigo-950 mt-1">{targetLabel}</p>
                        {target?.scope === 'task' && target?.task?.display_client_name && (
                            <p className="text-sm text-indigo-700 mt-1">{target.task.display_client_name}</p>
                        )}
                    </div>

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
                                    onClick={loadLink}
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
                                            Anyone with this secure URL can open the guest payment page and pay the current due amount.
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
