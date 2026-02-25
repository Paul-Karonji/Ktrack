import React, { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import axios from 'axios';
import { Calendar, DollarSign, Edit, Trash2, FileText, CheckCircle, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { PriorityBadge, StatusBadge } from '../common/Badges';
import { formatDate, formatCurrency } from '../../utils/formatters';

const TaskCard = ({ task, isOnline, hideAmounts, onEdit, onDelete, onTogglePayment, onDownloadFile, onDeliverWork, onSendQuote, onPaymentSuccess, user }) => {
    const [isVerifying, setIsVerifying] = useState(false);

    // ─── Paystack Logic ──────────────────────────────────────────────────────────
    const exchangeRate = parseFloat(import.meta.env.VITE_EXCHANGE_RATE_USD_KES || 135);

    // Determine payment amount based on deposit status
    let paymentUsdAmount = parseFloat(task.quoted_amount) || parseFloat(task.expected_amount);
    let isDeposit = false;

    if (task.requires_deposit && !task.deposit_paid) {
        paymentUsdAmount = parseFloat(task.deposit_amount);
        isDeposit = true;
    } else if (task.deposit_paid && !task.is_paid) {
        paymentUsdAmount = (parseFloat(task.quoted_amount) || parseFloat(task.expected_amount)) - parseFloat(task.deposit_amount);
    }

    const kesAmount = paymentUsdAmount * exchangeRate;

    const paystackConfig = {
        reference: `task_${task.id}_${new Date().getTime()}`,
        email: user.email,
        amount: Math.round(kesAmount * 100), // convert to cents (KES)
        currency: 'KES',
        channels: ['card', 'mobile_money'],
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        metadata: {
            task_id: task.id,
            task_name: task.task_name,
            usd_amount: paymentUsdAmount,
            exchange_rate: exchangeRate,
            is_deposit: isDeposit,
            custom_fields: [
                { display_name: "Task ID", variable_name: "task_id", value: task.id },
                { display_name: "USD Amount", variable_name: "usd_amount", value: paymentUsdAmount },
                { display_name: "Exchange Rate", variable_name: "exchange_rate", value: exchangeRate },
                { display_name: "Payment Type", variable_name: "payment_type", value: isDeposit ? 'Deposit' : 'Balance' }
            ]
        }
    };

    const initializePayment = usePaystackPayment(paystackConfig);

    const handlePaystackSuccess = async (response) => {
        setIsVerifying(true);
        try {
            const apiResponse = await axios.post('/api/payments/verify', {
                reference: response.reference,
                taskId: task.id
            });

            if (apiResponse.data.success) {
                onPaymentSuccess?.(task.id);
            }
        } catch (error) {
            console.error('Payment verification failed:', error);
            alert('Payment was successful, but we encountered an issue updating your task. Please contact support.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handlePaystackClose = () => {
        console.log('Payment modal closed');
    };
    return (
        <div className="bg-white rounded-xl shadow-md p-4 space-y-3 border border-gray-100 hover:shadow-lg transition-shadow">
            {/* Client & Task Name */}
            <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Client</p>
                <p className="font-semibold text-gray-900 text-lg">{task.client_name}</p>
                {task.task_name && (
                    <p className="text-sm font-medium text-indigo-600 mt-1">{task.task_name}</p>
                )}
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{task.task_description}</p>
            </div>

            {/* Priority & Status Badges */}
            <div className="flex flex-wrap gap-2">
                <PriorityBadge priority={task.priority} />
                <StatusBadge status={task.status} />
                {task.is_paid ? (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                        <CheckCircle size={12} />
                        Paid
                    </span>
                ) : task.deposit_paid ? (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
                        <ShieldCheck size={12} />
                        Deposit Paid
                    </span>
                ) : null}
            </div>

            {/* Timeline */}
            <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-gray-100">
                <div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} />
                        Commissioned
                    </p>
                    <p className="font-medium text-gray-900">{formatDate(task.date_commissioned)}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} />
                        Delivered
                    </p>
                    <p className="font-medium text-gray-900">{formatDate(task.date_delivered)}</p>
                </div>
            </div>

            {/* Amount */}
            <div className="pt-2 border-t border-gray-100">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            <DollarSign size={12} />
                            {task.deposit_paid && !task.is_paid ? 'Remaining Balance' : 'Project Total'}
                        </p>
                        <p className="text-xl font-bold text-indigo-600">
                            {hideAmounts ? '****' : formatCurrency(task.deposit_paid && !task.is_paid ? (task.quoted_amount - task.deposit_amount) : (task.quoted_amount || task.expected_amount))}
                        </p>
                    </div>
                    {task.deposit_paid && !task.is_paid && (
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Total Project</p>
                            <p className="text-sm font-medium text-gray-500 line-through decoration-gray-300">
                                {formatCurrency(task.quoted_amount)}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-gray-100">
                {onEdit && (
                    <button
                        onClick={() => onEdit(task)}
                        disabled={!isOnline}
                        className="flex-1 px-3 py-2.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Edit size={16} />
                        Edit
                    </button>
                )}
                {onDownloadFile && (
                    <button
                        onClick={() => onDownloadFile(task.id)}
                        className="flex-1 px-3 py-2.5 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                    >
                        <FileText size={16} />
                        Files
                    </button>
                )}
                {onDeliverWork && user?.role === 'admin' && (task.status === 'in_progress' || task.status === 'review') && (
                    <button
                        onClick={() => onDeliverWork(task.id)}
                        className="flex-1 px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        <CheckCircle size={16} />
                        Deliver
                    </button>
                )}
                {onDelete && user?.role === 'admin' && (
                    <button
                        onClick={() => onDelete(task.id)}
                        disabled={!isOnline}
                        className="px-3 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
                {user?.role === 'admin' && task.quote_status === 'pending_quote' && (
                    <button
                        onClick={() => onSendQuote(task)}
                        className="flex-1 px-3 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm transform active:scale-95"
                    >
                        Send Quote
                    </button>
                )}
                {user?.role === 'client' && !task.is_paid && task.quote_status === 'approved' && (
                    <div className="flex-1 flex flex-col gap-1">
                        <button
                            onClick={() => initializePayment(handlePaystackSuccess, handlePaystackClose)}
                            disabled={isVerifying || !isOnline}
                            className="w-full px-3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-lg text-sm font-bold hover:from-emerald-700 hover:to-teal-600 transition-all flex items-center justify-center gap-2 shadow-sm transform active:scale-95 disabled:opacity-50"
                        >
                            {isVerifying ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <CreditCard size={16} />
                            )}
                            {task.requires_deposit && !task.deposit_paid ? 'Pay 50% Deposit' : 'Pay Balance'}
                        </button>
                        <p className="text-[10px] text-gray-400 text-center italic">
                            KES (Approx. KSh {Math.round(kesAmount).toLocaleString()})
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskCard;
