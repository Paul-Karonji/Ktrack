import React, { useState } from 'react';
import {
    Calendar,
    User,
    Edit,
    Trash2,
    FileText,
    CheckCircle,
    MessageSquare,
    CreditCard,
    Link2,
    Loader2
} from 'lucide-react';
import ChatComponent from '../chat/ChatComponent';
import TaskPaymentSummary from '../payments/TaskPaymentSummary';
import { canTaskBePaid, getPaymentActionLabel, shouldShowSendQuote } from '../../utils/paymentSummary';
import { formatDate } from '../../utils/formatters';
import useTaskPayment from '../../hooks/useTaskPayment';

const ProjectCard = ({
    task,
    isOnline,
    hideAmounts,
    user,
    onEdit,
    onDelete,
    onTogglePayment,
    onDownloadFile,
    onDeliverWork,
    onSendQuote,
    onPaymentSuccess,
    onGuestPaymentLink
}) => {
    const [showChat, setShowChat] = useState(false);
    const { expectedKesAmount, isInitializing, isVerifying, startPayment } = useTaskPayment({
        task,
        user,
        onPaymentSuccess
    });

    const priorityColors = {
        low: 'bg-green-100 text-green-700 border-green-200',
        medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        high: 'bg-orange-100 text-orange-700 border-orange-200',
        urgent: 'bg-red-100 text-red-700 border-red-200'
    };

    const statusColors = {
        not_started: 'bg-gray-100 text-gray-700',
        in_progress: 'bg-blue-100 text-blue-700',
        pending_deposit: 'bg-orange-100 text-orange-700',
        review: 'bg-purple-100 text-purple-700',
        completed: 'bg-green-100 text-green-700',
        cancelled: 'bg-red-100 text-red-700'
    };

    const clientName = task.display_client_name || task.client_name;
    const showPayButton = user?.role === 'client' && canTaskBePaid(task) && Number(task.is_paid) !== 1;
    const payLabel = getPaymentActionLabel(task);
    const showGuestPaymentLink = user?.role === 'admin'
        && Number(task?.guest_client_id) > 0
        && Number(task?.can_pay_now) === 1
        && Number(task?.current_due_amount) > 0;

    // Use the imported formatDate function below

    return (
        <div className="bg-white rounded-2xl border-2 border-gray-100 hover:border-indigo-200 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
            <div className="p-6 flex flex-col flex-1 gap-4">
                <div className="flex items-start justify-between">
                    <h3 className="font-bold text-lg text-gray-900 line-clamp-2 flex-1 pr-2">
                        {task.task_name || 'Untitled Task'}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${priorityColors[task.priority || 'medium']}`}>
                        {(task.priority || 'medium').toUpperCase()}
                    </span>
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px]">
                    {task.task_description || 'No description provided'}
                </p>

                <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar size={14} className="text-indigo-500 flex-shrink-0" />
                        <span>Due: <span className="font-medium text-gray-700">{formatDate(task.date_delivered)}</span></span>
                    </div>
                    {clientName && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <User size={14} className="text-purple-500 flex-shrink-0" />
                            <span className="font-medium text-gray-700 truncate">{clientName}</span>
                            {task.client_type === 'guest' && (
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] border border-gray-200 flex-shrink-0">
                                    Guest
                                </span>
                            )}
                        </div>
                    )}
                    {task.file_count > 0 && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                            <FileText size={14} className="flex-shrink-0" />
                            <span className="font-medium">{task.file_count} file{task.file_count !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusColors[task.status || 'not_started']}`}>
                        {(task.status || 'not_started').replace(/_/g, ' ').toUpperCase()}
                    </span>
                    {user?.role === 'admin' ? (
                        <button
                            onClick={() => onTogglePayment && onTogglePayment(task)}
                            disabled={!isOnline}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${Number(task.is_paid) === 1
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                } ${!isOnline ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            {Number(task.is_paid) === 1 ? 'Paid' : 'Record Paid'}
                        </button>
                    ) : (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${Number(task.is_paid) === 1 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {Number(task.is_paid) === 1 ? 'Paid' : 'Outstanding'}
                        </span>
                    )}
                </div>

                <TaskPaymentSummary task={task} hideAmounts={hideAmounts} compact />

                {showPayButton && (
                    <div className="space-y-2">
                        <button
                            onClick={startPayment}
                            disabled={isVerifying || isInitializing}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl text-sm font-bold hover:from-emerald-700 hover:to-teal-600 transition-all disabled:opacity-70"
                        >
                            {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                            {payLabel}
                        </button>
                        <p className="text-[10px] text-gray-400 text-center italic">
                            KES (Approx. KSh {Math.round(expectedKesAmount || 0).toLocaleString()})
                        </p>
                    </div>
                )}

                <div className="flex gap-2">
                    {onEdit && (
                        <button
                            onClick={() => onEdit(task)}
                            disabled={!isOnline}
                            className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                            <Edit size={15} />
                            Edit
                        </button>
                    )}
                    <button
                        onClick={() => setShowChat(!showChat)}
                        disabled={!isOnline}
                        className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${showChat
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                            }`}
                        title="Chat"
                    >
                        <MessageSquare size={15} />
                        {task.unread_count > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
                                {task.unread_count}
                            </span>
                        )}
                    </button>
                    {onDownloadFile && (task.has_file || task.file_count > 0) && (
                        <button
                            onClick={() => onDownloadFile(task.id)}
                            className="px-3 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5"
                            title="View Files"
                        >
                            <FileText size={15} />
                        </button>
                    )}
                    {onSendQuote && user?.role === 'admin' && shouldShowSendQuote(task) && (
                        <button
                            onClick={() => onSendQuote(task)}
                            className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm"
                        >
                            Send Quote
                        </button>
                    )}
                    {showGuestPaymentLink && onGuestPaymentLink && (
                        <button
                            onClick={() => onGuestPaymentLink(task)}
                            className="flex-1 px-3 py-2 bg-sky-50 text-sky-700 rounded-lg text-sm font-bold hover:bg-sky-100 transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                            <Link2 size={15} />
                            Payment Link
                        </button>
                    )}
                    {onDeliverWork && user?.role === 'admin' && (task.status === 'in_progress' || task.status === 'review') && (
                        <button
                            onClick={() => onDeliverWork(task.id)}
                            className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                            <CheckCircle size={15} />
                            Deliver
                        </button>
                    )}
                    {onDelete && user?.role === 'admin' && (
                        <button
                            onClick={() => onDelete(task.id)}
                            disabled={!isOnline}
                            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete"
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                </div>
            </div>

            {showChat && (
                <div className="border-t-2 border-indigo-100 bg-gray-50 p-4">
                    <ChatComponent taskId={task.id} user={user} onClose={() => setShowChat(false)} />
                </div>
            )}
        </div>
    );
};

export default ProjectCard;
