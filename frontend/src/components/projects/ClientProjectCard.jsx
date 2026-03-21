import React, { useState } from 'react';
import {
    Calendar,
    MessageSquare,
    CheckCircle,
    AlertCircle,
    ThumbsUp,
    ThumbsDown,
    Paperclip,
    Download,
    CreditCard,
    Loader2
} from 'lucide-react';
import ChatComponent from '../chat/ChatComponent';
import TaskPaymentSummary from '../payments/TaskPaymentSummary';
import { canTaskBePaid, getPaymentActionLabel, shouldShowQuoteActions } from '../../utils/paymentSummary';
import useTaskPayment from '../../hooks/useTaskPayment';

const STATUS_CONFIG = {
    not_started: { label: 'Not Started', border: 'border-l-gray-300', shadow: 'hover:shadow-gray-200', dot: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-50' },
    in_progress: { label: 'In Progress', border: 'border-l-blue-500', shadow: 'hover:shadow-blue-200', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
    review: { label: 'Under Review', border: 'border-l-violet-500', shadow: 'hover:shadow-violet-200', dot: 'bg-violet-500', text: 'text-violet-700', bg: 'bg-violet-50' },
    completed: { label: 'Completed', border: 'border-l-emerald-500', shadow: 'hover:shadow-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
    pending_deposit: { label: 'Awaiting Deposit', border: 'border-l-orange-500', shadow: 'hover:shadow-orange-200', dot: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
    cancelled: { label: 'Cancelled', border: 'border-l-red-400', shadow: 'hover:shadow-red-200', dot: 'bg-red-400', text: 'text-red-600', bg: 'bg-red-50' }
};

const PIPELINE = ['not_started', 'pending_deposit', 'in_progress', 'review', 'completed'];

const ProgressArc = ({ step, total = 5, status }) => {
    const r = 18;
    const circ = 2 * Math.PI * r;
    const progress = status === 'cancelled' ? 0 : status === 'completed' ? 1 : step / total;
    const dash = circ * progress;
    const colorMap = {
        not_started: '#94a3b8',
        pending_deposit: '#f97316',
        in_progress: '#3b82f6',
        review: '#8b5cf6',
        completed: '#10b981',
        cancelled: '#f87171'
    };
    const color = colorMap[status] || '#94a3b8';

    return (
        <svg width="44" height="44" viewBox="0 0 44 44" className="flex-shrink-0">
            <circle cx="22" cy="22" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
            <circle
                cx="22"
                cy="22"
                r={r}
                fill="none"
                stroke={color}
                strokeWidth="3.5"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                transform="rotate(-90 22 22)"
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
            <text x="22" y="22" textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="700" fill={color}>
                {status === 'cancelled' ? '×' : status === 'completed' ? '✓' : `${step}/${total}`}
            </text>
        </svg>
    );
};

const DeadlineChip = ({ dateDelivered }) => {
    if (!dateDelivered) return null;
    const now = new Date();
    const due = new Date(dateDelivered);
    const diff = Math.ceil((due - now) / 86400000);

    let label;
    let cls;
    if (diff < 0) { label = `${Math.abs(diff)}d overdue`; cls = 'bg-red-50 text-red-600'; }
    else if (diff === 0) { label = 'Due today'; cls = 'bg-orange-50 text-orange-600'; }
    else if (diff <= 3) { label = `${diff}d left`; cls = 'bg-orange-50 text-orange-500'; }
    else if (diff <= 7) { label = `${diff}d left`; cls = 'bg-yellow-50 text-yellow-600'; }
    else { label = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); cls = 'bg-gray-50 text-gray-500'; }

    return (
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
            <Calendar size={10} />
            {label}
        </span>
    );
};

const ClientProjectCard = ({ task, user, onQuoteResponse, onDownloadFile, onPaymentSuccess, index = 0 }) => {
    const [showChat, setShowChat] = useState(false);
    const { expectedKesAmount, isInitializing, isVerifying, startPayment } = useTaskPayment({
        task,
        user,
        onPaymentSuccess
    });

    const status = task.status || 'not_started';
    const sc = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
    const hasQuote = shouldShowQuoteActions(task);
    const canPay = canTaskBePaid(task) && Number(task.is_paid) !== 1;
    const payLabel = getPaymentActionLabel(task);

    const pipelineStep = PIPELINE.indexOf(status);
    const arcStep = pipelineStep === -1 ? 0 : pipelineStep + 1;

    const staggerDelays = ['delay-0', 'delay-50', 'delay-100', 'delay-150', 'delay-200', 'delay-250', 'delay-300', 'delay-400'];
    const delay = staggerDelays[index % staggerDelays.length];

    return (
        <div
            className={`
                bg-white rounded-2xl border-l-4 ${sc.border} border border-gray-100
                shadow-sm hover:shadow-xl ${sc.shadow}
                transform transition-all duration-300 hover:-translate-y-1
                flex flex-col overflow-hidden
                animate-stagger ${delay}
                ${hasQuote ? 'ring-2 ring-orange-300' : ''}
            `}
        >
            {hasQuote && (
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 flex items-center justify-between">
                    <span className="text-white text-xs font-bold flex items-center gap-1.5">
                        <AlertCircle size={13} />
                        Quote awaiting response
                    </span>
                    <span className="text-white font-extrabold text-sm">${Number(task.quoted_amount || 0).toFixed(2)}</span>
                </div>
            )}

            <div className="p-5 flex flex-col gap-4 flex-1">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-1">
                            {task.task_name || 'Untitled Project'}
                        </h3>
                        {task.task_description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                                {task.task_description}
                            </p>
                        )}
                    </div>
                    <ProgressArc step={arcStep} total={5} status={status} />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                    </span>
                    <DeadlineChip dateDelivered={task.date_delivered} />
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {task.file_count > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                            <Paperclip size={10} />
                            {task.file_count}
                        </span>
                    )}
                    {task.unread_count > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
                            <MessageSquare size={10} />
                            {task.unread_count} new
                        </span>
                    )}
                </div>

                <TaskPaymentSummary task={task} compact />

                {hasQuote && (
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => onQuoteResponse(task.id, 'approve')}
                            className="flex items-center justify-center gap-2 py-2.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl text-sm font-bold transition-colors"
                        >
                            <ThumbsUp size={16} />
                            Accept
                        </button>
                        <button
                            onClick={() => onQuoteResponse(task.id, 'reject')}
                            className="flex items-center justify-center gap-2 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-sm font-bold transition-colors"
                        >
                            <ThumbsDown size={16} />
                            Reject
                        </button>
                    </div>
                )}

                {canPay && (
                    <div className="space-y-2">
                        <button
                            onClick={startPayment}
                            disabled={isVerifying || isInitializing}
                            className="w-full flex items-center justify-center gap-3 py-3 bg-gradient-to-r from-teal-600 to-blue-500 hover:from-teal-700 hover:to-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-teal-100 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isVerifying ? (
                                <><Loader2 className="animate-spin" size={18} /> Verifying Payment...</>
                            ) : (
                                <><CreditCard size={18} /> {payLabel}</>
                            )}
                        </button>
                        <p className="text-[10px] text-gray-400 text-center italic">
                            Secure payment in KES. Approx. KSh {Math.round(expectedKesAmount || 0).toLocaleString()}.
                        </p>
                    </div>
                )}

                {task.status === 'completed' && task.has_file && (
                    <button
                        onClick={() => onDownloadFile(task.id)}
                        className="w-full flex items-center justify-center gap-3 py-3 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 transition-all"
                    >
                        <Download size={18} />
                        Download Delivered Work
                    </button>
                )}

                <button
                    onClick={() => setShowChat(!showChat)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${showChat ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
                >
                    <MessageSquare size={16} />
                    {showChat ? 'Close Chat' : 'Open Chat'}
                </button>
            </div>

            {showChat && (
                <div className="border-t border-indigo-100 bg-gray-50 p-4">
                    <ChatComponent taskId={task.id} user={user} onClose={() => setShowChat(false)} />
                </div>
            )}
        </div>
    );
};

export default ClientProjectCard;
