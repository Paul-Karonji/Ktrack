import React, { useState } from 'react';
import { Calendar, DollarSign, User, Edit, Trash2, FileText, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import ChatComponent from '../chat/ChatComponent';

const ProjectCard = ({ task, isOnline, hideAmounts, user, onEdit, onDelete, onTogglePayment, onDownloadFile }) => {
    const [showChat, setShowChat] = useState(false);

    const priorityColors = {
        low: 'bg-green-100 text-green-700 border-green-200',
        medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        high: 'bg-orange-100 text-orange-700 border-orange-200',
        urgent: 'bg-red-100 text-red-700 border-red-200'
    };

    const statusColors = {
        not_started: 'bg-gray-100 text-gray-700',
        in_progress: 'bg-blue-100 text-blue-700',
        review: 'bg-purple-100 text-purple-700',
        completed: 'bg-green-100 text-green-700',
        cancelled: 'bg-red-100 text-red-700'
    };

    const isDeliverableAvailable = task.status === 'completed' && task.has_file;

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatCurrency = (amount) => {
        if (!amount) return '$0.00';
        return `$${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const clientName = task.display_client_name || task.client_name;

    return (
        <div className="bg-white rounded-2xl border-2 border-gray-100 hover:border-indigo-200 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
            {/* Card Body */}
            <div className="p-6 flex flex-col flex-1">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <h3 className="font-bold text-lg text-gray-900 line-clamp-2 flex-1 pr-2">
                        {task.task_name || 'Untitled Task'}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${priorityColors[task.priority || 'medium']}`}>
                        {(task.priority || 'medium').toUpperCase()}
                    </span>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                    {task.task_description || 'No description provided'}
                </p>

                {/* Meta Info */}
                <div className="space-y-2 mb-4 flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar size={14} className="text-indigo-500 flex-shrink-0" />
                        <span>Due: <span className="font-medium text-gray-700">{formatDate(task.date_delivered)}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <DollarSign size={14} className="text-emerald-500 flex-shrink-0" />
                        <span className={`font-semibold text-emerald-700 text-base ${hideAmounts ? 'blur-sm select-none' : ''}`}>
                            {formatCurrency(task.expected_amount)}
                        </span>
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

                {/* Status + Payment row */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between mb-3">
                    <div className="flex flex-col gap-1">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusColors[task.status || 'not_started']}`}>
                            {(task.status || 'not_started').replace(/_/g, ' ').toUpperCase()}
                        </span>
                        {task.status === 'completed' && task.has_file && (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                                <CheckCircle size={10} /> Delivered
                            </span>
                        )}
                    </div>
                    {user?.role === 'admin' ? (
                        <button
                            onClick={() => onTogglePayment && onTogglePayment(task.id)}
                            disabled={!isOnline}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${task.is_paid
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                } ${!isOnline ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            title="Click to toggle payment status"
                        >
                            {task.is_paid ? <><CheckCircle size={12} /> Paid</> : <><Clock size={12} /> Unpaid</>}
                        </button>
                    ) : (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${task.is_paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {task.is_paid ? <><CheckCircle size={12} /> Paid</> : <><Clock size={12} /> Unpaid</>}
                        </span>
                    )}
                </div>

                {/* Action Bar */}
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
                    {/* Chat button */}
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

            {/* Inline Chat Panel */}
            {showChat && (
                <div className="border-t-2 border-indigo-100 bg-gray-50 p-4">
                    <ChatComponent
                        taskId={task.id}
                        user={user}
                        onClose={() => setShowChat(false)}
                    />
                </div>
            )}
        </div>
    );
};

export default ProjectCard;
