import React from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const BulkPaymentCard = ({
    summary,
    isLoading,
    isInitializing,
    isVerifying,
    onRefresh,
    onPay
}) => {
    if (!summary) return null;

    const hasOutstanding = Number(summary.totalDue || 0) > 0 && Number(summary.payableTaskCount || 0) > 0;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.18em] font-black text-gray-400">Total Due</p>
                    <h3 className="text-2xl font-black text-gray-900 mt-1">
                        {formatCurrency(summary.totalDue || 0)}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {summary.payableTaskCount || 0} task{Number(summary.payableTaskCount || 0) === 1 ? '' : 's'} ready to clear.
                    </p>
                </div>
                <button
                    onClick={onPay}
                    disabled={!hasOutstanding || isLoading || isInitializing || isVerifying}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold shadow-sm hover:from-emerald-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {(isInitializing || isVerifying) ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                    {isVerifying ? 'Verifying...' : 'Clear Total Due'}
                </button>
            </div>

            {hasOutstanding ? (
                <p className="text-xs text-gray-500">
                    Pay the full current due amount for all approved tasks in one checkout.
                </p>
            ) : (
                <p className="text-sm text-emerald-600 font-medium">
                    No outstanding balance at the moment.
                </p>
            )}
        </div>
    );
};

export default BulkPaymentCard;
