import React, { useState } from 'react';
import {
    Edit2,
    Trash2,
    Calendar,
    CheckCircle,
    Clock,
    FileText,
    Copy,
    MessageSquare,
    Upload,
    CreditCard,
    Link2,
    Loader2
} from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { PriorityBadge, StatusBadge } from '../common/Badges';
import ChatComponent from '../chat/ChatComponent';
import TaskPaymentSummary from '../payments/TaskPaymentSummary';
import { canTaskBePaid, getPaymentActionLabel, shouldShowQuoteActions, shouldShowSendQuote } from '../../utils/paymentSummary';
import useTaskPayment from '../../hooks/useTaskPayment';

const TaskRow = ({
    task,
    isOnline,
    hideAmounts,
    onEdit,
    onDelete,
    onTogglePayment,
    onDownloadFile,
    onUploadFile,
    onDeliverWork,
    onQuoteResponse,
    onSendQuote,
    onDuplicate,
    onPaymentSuccess,
    onGuestPaymentLink,
    user
}) => {
    const [showChat, setShowChat] = useState(false);
    const fileRef = React.useRef(null);
    const { expectedKesAmount, isInitializing, isVerifying, startPayment } = useTaskPayment({
        task,
        user,
        onPaymentSuccess
    });

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            onUploadFile(task.id, file);
        }
        event.target.value = '';
    };

    const showPayButton = user?.role === 'client' && canTaskBePaid(task) && Number(task.is_paid) !== 1;
    const payLabel = getPaymentActionLabel(task);
    const showGuestPaymentLink = user?.role === 'admin'
        && Number(task?.guest_client_id) > 0
        && Number(task?.can_pay_now) === 1
        && Number(task?.current_due_amount) > 0;

    return (
        <>
            <tr className="hover:bg-indigo-50/30 transition-colors border-b border-gray-100 last:border-0">
                <td className="px-6 py-5">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-900 text-lg">{task.task_name || 'Untitled Task'}</span>
                            {task.file_count > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                    <FileText size={12} />
                                    {task.file_count}
                                </span>
                            )}
                        </div>
                        <span className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{task.task_description}</span>
                        {task.quantity > 1 && (
                            <span className="text-xs text-indigo-600 font-semibold mt-1">Qty: {task.quantity}</span>
                        )}
                        <input
                            type="file"
                            ref={fileRef}
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                        {task.has_file && (
                            <button
                                onClick={() => onDownloadFile(task.id)}
                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mt-2 font-medium"
                            >
                                <FileText size={14} /> View Files ({task.file_count || 1})
                            </button>
                        )}

                        {(user.role === 'admin' || !task.has_file) && (
                            <button
                                onClick={() => fileRef.current.click()}
                                disabled={!isOnline}
                                className="flex items-center gap-1 text-xs mt-1 text-gray-400 hover:text-indigo-600 font-medium"
                                title={task.has_file ? 'Upload New File' : 'Upload File'}
                            >
                                <Upload size={14} /> {task.has_file ? 'New' : 'Upload'}
                            </button>
                        )}

                        {user.role === 'admin' && (
                            <div className="mt-2 text-xs">
                                <span className="text-gray-500 font-medium">{task.display_client_name || task.client_name}</span>
                                {task.client_type === 'guest' && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] border border-gray-200">
                                        Guest
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </td>

                <td className="px-6 py-5">
                    <div className="flex flex-col gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-gray-400" />
                            <span className="font-medium">Due: {formatDate(task.date_delivered)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Clock size={14} />
                            <span>Created: {formatDate(task.created_at)}</span>
                        </div>
                    </div>
                </td>

                <td className="px-6 py-5">
                    <span className={`font-bold text-base ${hideAmounts ? 'blur-sm select-none' : 'text-gray-900'}`}>
                        {formatCurrency(task.current_due_amount || task.project_total || task.expected_amount)}
                    </span>
                    {task.current_due_phase && (
                        <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide font-bold">
                            {task.current_due_phase}
                        </div>
                    )}
                </td>

                <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                        <PriorityBadge priority={task.priority} />
                        <StatusBadge status={task.status} />
                    </div>
                </td>

                <td className="px-6 py-4 min-w-[340px]">
                    <div className="space-y-3">
                        <TaskPaymentSummary task={task} hideAmounts={hideAmounts} compact />

                        {user?.role === 'client' && shouldShowQuoteActions(task) && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onQuoteResponse(task.id, 'approve')}
                                    disabled={!isOnline}
                                    className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200"
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => onQuoteResponse(task.id, 'reject')}
                                    disabled={!isOnline}
                                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200"
                                >
                                    Reject
                                </button>
                            </div>
                        )}

                        {showPayButton && (
                            <div>
                                <button
                                    onClick={startPayment}
                                    disabled={isVerifying || isInitializing}
                                    className="flex items-center justify-center gap-2 px-4 py-1.5 bg-gradient-to-r from-teal-600 to-blue-500 hover:from-teal-700 hover:to-blue-600 text-white rounded-full text-[11px] font-bold shadow-sm transition-all disabled:opacity-70 w-full"
                                >
                                    {isVerifying ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                                    {payLabel}
                                </button>
                                <p className="text-[10px] text-gray-400 text-center italic mt-1 pb-1">
                                    In KES (Approx. KSh {Math.round(expectedKesAmount || 0).toLocaleString()})
                                </p>
                            </div>
                        )}

                        {user?.role === 'admin' && shouldShowSendQuote(task) && (
                            <button
                                onClick={() => onSendQuote(task)}
                                className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full font-bold hover:bg-indigo-700"
                            >
                                Send Quote
                            </button>
                        )}

                        {showGuestPaymentLink && onGuestPaymentLink && (
                            <button
                                onClick={() => onGuestPaymentLink(task)}
                                className="text-xs bg-sky-100 text-sky-700 px-3 py-1 rounded-full font-bold hover:bg-sky-200 inline-flex items-center gap-1.5"
                            >
                                <Link2 size={12} />
                                Payment Link
                            </button>
                        )}

                        {user?.role === 'admin' && (task.status === 'in_progress' || task.status === 'review') && (
                            <button
                                onClick={() => onDeliverWork(task.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm"
                            >
                                <CheckCircle size={14} /> Deliver Results
                            </button>
                        )}
                    </div>
                </td>

                <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                        <button
                            onClick={() => onDuplicate(task)}
                            className="px-3 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                            title="Duplicate"
                        >
                            <Copy size={15} />
                        </button>
                        <button
                            onClick={() => setShowChat(!showChat)}
                            className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${showChat
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
                        {onEdit && (
                            <button
                                onClick={() => onEdit(task)}
                                disabled={!isOnline}
                                className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors disabled:opacity-50"
                            >
                                <Edit2 size={15} />
                            </button>
                        )}
                        {user?.role === 'admin' && (
                            <button
                                onClick={() => onTogglePayment(task)}
                                disabled={!isOnline}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${Number(task.is_paid) === 1
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                    } disabled:opacity-50`}
                            >
                                {Number(task.is_paid) === 1 ? 'Paid' : 'Record Paid'}
                            </button>
                        )}
                        {onDelete && user?.role === 'admin' && (
                            <button
                                onClick={() => onDelete(task.id)}
                                disabled={!isOnline}
                                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                                title="Delete"
                            >
                                <Trash2 size={15} />
                            </button>
                        )}
                    </div>
                </td>
            </tr>

            {showChat && (
                <tr>
                    <td colSpan={6} className="bg-gray-50 p-4">
                        <ChatComponent taskId={task.id} user={user} onClose={() => setShowChat(false)} />
                    </td>
                </tr>
            )}
        </>
    );
};

export default TaskRow;
