import React, { useState } from 'react';
import {
    Calendar,
    Edit,
    Trash2,
    FileText,
    CheckCircle,
    CreditCard,
    Loader2,
    MessageSquare
} from 'lucide-react';
import { PriorityBadge, StatusBadge } from '../common/Badges';
import { formatDate } from '../../utils/formatters';
import ChatComponent from '../chat/ChatComponent';
import TaskPaymentSummary from '../payments/TaskPaymentSummary';
import { canTaskBePaid, getPaymentActionLabel, shouldShowQuoteActions, shouldShowSendQuote } from '../../utils/paymentSummary';
import useTaskPayment from '../../hooks/useTaskPayment';

const TaskCard = ({
    task,
    isOnline,
    hideAmounts,
    onEdit,
    onDelete,
    onTogglePayment,
    onDownloadFile,
    onDeliverWork,
    onSendQuote,
    onQuoteResponse,
    onPaymentSuccess,
    user
}) => {
    const [showChat, setShowChat] = useState(false);
    const { expectedKesAmount, isInitializing, isVerifying, startPayment } = useTaskPayment({
        task,
        user,
        onPaymentSuccess
    });

    const showPayButton = user?.role === 'client' && canTaskBePaid(task) && Number(task.is_paid) !== 1;
    const actionLabel = getPaymentActionLabel(task);

    return (
        <div className="bg-white rounded-xl shadow-md p-4 space-y-4 border border-gray-100 hover:shadow-lg transition-shadow">
            <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Client</p>
                <p className="font-semibold text-gray-900 text-lg">{task.display_client_name || task.client_name}</p>
                {task.task_name && (
                    <p className="text-sm font-medium text-indigo-600 mt-1">{task.task_name}</p>
                )}
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{task.task_description}</p>
            </div>

            <div className="flex flex-wrap gap-2">
                <PriorityBadge priority={task.priority} />
                <StatusBadge status={task.status} />
            </div>

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

            <TaskPaymentSummary task={task} hideAmounts={hideAmounts} compact />

            <div className="flex gap-2 pt-3 border-t border-gray-100 flex-wrap">
                <button
                    onClick={() => setShowChat(!showChat)}
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all
                        ${showChat ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
                    title="Chat"
                >
                    <MessageSquare size={14} />
                    Chat
                    {task.unread_count > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white">
                            {task.unread_count}
                        </span>
                    )}
                </button>

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

                {user?.role === 'admin' && onTogglePayment && (
                    <button
                        onClick={() => onTogglePayment(task)}
                        disabled={!isOnline || Number(task.is_paid) === 1}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${Number(task.is_paid) === 1
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                        {Number(task.is_paid) === 1 ? 'Paid' : 'Record Paid'}
                    </button>
                )}

                {user?.role === 'admin' && shouldShowSendQuote(task) && (
                    <button
                        onClick={() => onSendQuote(task)}
                        className="flex-1 px-3 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm transform active:scale-95"
                    >
                        Send Quote
                    </button>
                )}

                {user?.role === 'client' && shouldShowQuoteActions(task) && (
                    <div className="flex w-full gap-2">
                        <button
                            onClick={() => onQuoteResponse?.(task.id, 'approve')}
                            className="flex-1 px-3 py-2.5 bg-green-100 text-green-700 rounded-lg text-sm font-bold hover:bg-green-200"
                        >
                            Accept Quote
                        </button>
                        <button
                            onClick={() => onQuoteResponse?.(task.id, 'reject')}
                            className="flex-1 px-3 py-2.5 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200"
                        >
                            Reject
                        </button>
                    </div>
                )}

                {showPayButton && (
                    <div className="flex-1 flex flex-col gap-1">
                        <button
                            onClick={startPayment}
                            disabled={isVerifying || isInitializing || !isOnline}
                            className="w-full px-3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-lg text-sm font-bold hover:from-emerald-700 hover:to-teal-600 transition-all flex items-center justify-center gap-2 shadow-sm transform active:scale-95 disabled:opacity-50"
                        >
                            {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                            {actionLabel}
                        </button>
                        <p className="text-[10px] text-gray-400 text-center italic">
                            KES (Approx. KSh {Math.round(expectedKesAmount || 0).toLocaleString()})
                        </p>
                    </div>
                )}
            </div>

            {showChat && (
                <div className="border-t-2 border-indigo-100 bg-gray-50 p-3">
                    <ChatComponent taskId={task.id} user={user} onClose={() => setShowChat(false)} />
                </div>
            )}
        </div>
    );
};

export default TaskCard;
