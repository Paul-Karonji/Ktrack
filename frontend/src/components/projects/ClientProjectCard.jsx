import React, { useState } from 'react';
import {
    Calendar, DollarSign, MessageSquare, FileText,
    CheckCircle, Clock, AlertCircle,
    ThumbsUp, ThumbsDown, Paperclip
} from 'lucide-react';
import ChatComponent from '../chat/ChatComponent';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    not_started: { label: 'Not Started', border: 'border-l-gray-300', shadow: 'hover:shadow-gray-200', dot: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-50' },
    in_progress: { label: 'In Progress', border: 'border-l-blue-500', shadow: 'hover:shadow-blue-200', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
    review: { label: 'Under Review', border: 'border-l-violet-500', shadow: 'hover:shadow-violet-200', dot: 'bg-violet-500', text: 'text-violet-700', bg: 'bg-violet-50' },
    completed: { label: 'Completed', border: 'border-l-emerald-500', shadow: 'hover:shadow-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
    cancelled: { label: 'Cancelled', border: 'border-l-red-400', shadow: 'hover:shadow-red-200', dot: 'bg-red-400', text: 'text-red-600', bg: 'bg-red-50' },
};

const PIPELINE = ['not_started', 'in_progress', 'review', 'completed'];

const PRIORITY_CONFIG = {
    low: { label: 'Low', dot: 'bg-green-400', text: 'text-green-700', bg: 'bg-green-50' },
    medium: { label: 'Medium', dot: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50' },
    high: { label: 'High', dot: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50' },
    urgent: { label: 'Urgent', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
};

// ─── Circular SVG progress arc ────────────────────────────────────────────────
const ProgressArc = ({ step, total = 4, status }) => {
    const r = 18;
    const circ = 2 * Math.PI * r;
    const progress = status === 'cancelled' ? 0 : status === 'completed' ? 1 : step / total;
    const dash = circ * progress;
    const colorMap = {
        not_started: '#94a3b8',
        in_progress: '#3b82f6',
        review: '#8b5cf6',
        completed: '#10b981',
        cancelled: '#f87171',
    };
    const color = colorMap[status] || '#94a3b8';

    return (
        <svg width="44" height="44" viewBox="0 0 44 44" className="flex-shrink-0">
            {/* Track */}
            <circle cx="22" cy="22" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
            {/* Progress */}
            <circle
                cx="22" cy="22" r={r}
                fill="none"
                stroke={color}
                strokeWidth="3.5"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                transform="rotate(-90 22 22)"
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
            {/* Step label */}
            <text x="22" y="22" textAnchor="middle" dominantBaseline="central"
                fontSize="10" fontWeight="700" fill={color}>
                {status === 'cancelled' ? '✕' : status === 'completed' ? '✓' : `${step}/${total}`}
            </text>
        </svg>
    );
};

// ─── Deadline chip ────────────────────────────────────────────────────────────
const DeadlineChip = ({ dateDelivered }) => {
    if (!dateDelivered) return null;
    const now = new Date();
    const due = new Date(dateDelivered);
    const diff = Math.ceil((due - now) / 86400000);

    let label, cls;
    if (diff < 0) { label = `${Math.abs(diff)}d overdue`; cls = 'bg-red-50 text-red-600 animate-pulse-ring'; }
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

// ─── Main card ────────────────────────────────────────────────────────────────
const ClientProjectCard = ({ task, user, onQuoteResponse, onDownloadFile, index = 0 }) => {
    const [showChat, setShowChat] = useState(false);

    const status = task.status || 'not_started';
    const sc = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
    const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
    const hasQuote = task.quote_status === 'quote_sent';
    const pipelineStep = PIPELINE.indexOf(status);
    const arcStep = pipelineStep === -1 ? 0 : pipelineStep + 1;

    const fmt = (v) => v ? `$${parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00';

    const staggerDelays = ['delay-0', 'delay-50', 'delay-100', 'delay-150', 'delay-200', 'delay-250', 'delay-300', 'delay-400'];
    const delay = staggerDelays[index % staggerDelays.length];

    return (
        <div className={`
            bg-white rounded-2xl border-l-4 ${sc.border} border border-gray-100
            shadow-sm hover:shadow-xl ${sc.shadow}
            transform transition-all duration-300 hover:-translate-y-1
            flex flex-col overflow-hidden
            animate-stagger ${delay}
            ${hasQuote ? 'ring-2 ring-orange-300' : ''}
        `}>
            {/* Quote banner */}
            {hasQuote && (
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 flex items-center justify-between">
                    <span className="text-white text-xs font-bold flex items-center gap-1.5">
                        <AlertCircle size={13} />
                        Quote awaiting response
                    </span>
                    <span className="text-white font-extrabold text-sm">{fmt(task.quoted_amount)}</span>
                </div>
            )}

            <div className="p-5 flex flex-col gap-3 flex-1">
                {/* Title + arc */}
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
                    <ProgressArc step={arcStep} total={4} status={status} />
                </div>

                {/* Status + Priority row */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                    </span>
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${priority.bg} ${priority.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
                        {priority.label}
                    </span>
                    <DeadlineChip dateDelivered={task.date_delivered} />
                </div>

                {/* Meta chips */}
                <div className="flex flex-wrap gap-1.5">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                        <DollarSign size={10} />
                        {fmt(task.expected_amount)}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                        ${task.is_paid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {task.is_paid ? <><CheckCircle size={10} /> Paid</> : <><Clock size={10} /> Unpaid</>}
                    </span>
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

                {/* Quote accept/reject */}
                {hasQuote && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => onQuoteResponse?.(task.id, 'approve')}
                            className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all"
                        >
                            <ThumbsUp size={13} /> Accept
                        </button>
                        <button
                            onClick={() => onQuoteResponse?.(task.id, 'reject')}
                            className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all border border-red-200"
                        >
                            <ThumbsDown size={13} /> Decline
                        </button>
                    </div>
                )}

                {/* Action bar */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                            ${showChat ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
                    >
                        <MessageSquare size={13} />
                        Chat
                        {task.unread_count > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white">
                                {task.unread_count}
                            </span>
                        )}
                    </button>
                    {(task.has_file || task.file_count > 0) && onDownloadFile && (
                        <button
                            onClick={() => onDownloadFile(task.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all"
                        >
                            <FileText size={13} />
                            Files
                        </button>
                    )}
                </div>
            </div>

            {/* Inline chat */}
            {showChat && (
                <div className="border-t-2 border-indigo-100 bg-gray-50 p-4">
                    <ChatComponent taskId={task.id} user={user} onClose={() => setShowChat(false)} />
                </div>
            )}
        </div>
    );
};

export default ClientProjectCard;
