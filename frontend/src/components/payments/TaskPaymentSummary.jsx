import React from 'react';
import { CheckCircle2, ShieldCheck, Wallet } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
    getAmountPaidTotal,
    getDepositAmount,
    getPaymentBadgeStyles,
    getProjectTotal,
    getRemainingBalance
} from '../../utils/paymentSummary';

const TaskPaymentSummary = ({ task, hideAmounts = false, compact = false }) => {
    const badge = getPaymentBadgeStyles(task);
    const projectTotal = getProjectTotal(task);
    const depositAmount = getDepositAmount(task);
    const remainingBalance = getRemainingBalance(task);
    const amountPaidTotal = getAmountPaidTotal(task);
    const hasDepositRequirement = Number(task.requires_deposit) === 1;
    const depositReceived = hasDepositRequirement && Number(task.deposit_paid) === 1;

    return (
        <div className={`rounded-xl border border-gray-100 bg-gray-50/80 ${compact ? 'p-3' : 'p-4'} space-y-3`}>
            <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${badge.className}`}>
                    {Number(task.is_paid) === 1 ? (
                        <CheckCircle2 size={12} />
                    ) : task.current_due_phase === 'balance' ? (
                        <ShieldCheck size={12} />
                    ) : (
                        <Wallet size={12} />
                    )}
                    {badge.label}
                </span>
                {hasDepositRequirement && task.deposit_paid_at && (
                    <span className="text-xs text-gray-500">
                        Deposit cleared {formatDate(task.deposit_paid_at)}
                    </span>
                )}
            </div>

            <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-3 gap-3'}`}>
                <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">Project Total</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(projectTotal, hideAmounts)}</p>
                </div>

                {hasDepositRequirement && (
                    <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">Deposit</p>
                        <p className="text-sm font-bold text-gray-900">
                            {formatCurrency(Number(task.deposit_paid_amount ?? depositAmount), hideAmounts)}
                            {!depositReceived && depositAmount > 0 && (
                                <span className="text-xs text-gray-500 font-medium"> / {formatCurrency(depositAmount, hideAmounts)}</span>
                            )}
                        </p>
                    </div>
                )}

                <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">
                        Collected
                    </p>
                    <p className="text-sm font-bold text-emerald-700">
                        {formatCurrency(amountPaidTotal, hideAmounts)}
                    </p>
                </div>

                <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">
                        {depositReceived && Number(task.is_paid) !== 1 ? 'Balance Left' : 'Current Due'}
                    </p>
                    <p className="text-sm font-bold text-indigo-700">
                        {formatCurrency(Number(task.current_due_amount || remainingBalance || 0), hideAmounts)}
                    </p>
                </div>
            </div>

            {Number(task.is_paid) !== 1 && amountPaidTotal > 0 && (
                <p className="text-xs text-emerald-700 font-medium">
                    {depositReceived
                        ? `Collected ${formatCurrency(amountPaidTotal, hideAmounts)} so far. Remaining balance: ${formatCurrency(remainingBalance, hideAmounts)}.`
                        : `Collected ${formatCurrency(amountPaidTotal, hideAmounts)} so far.`}
                </p>
            )}

            {depositReceived && Number(task.is_paid) !== 1 && (
                <p className="text-xs text-blue-600 font-medium">
                    Deposit received. Remaining balance: {formatCurrency(remainingBalance, hideAmounts)}.
                </p>
            )}
        </div>
    );
};

export default TaskPaymentSummary;
