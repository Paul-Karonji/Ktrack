import React from 'react';
import { Calendar, DollarSign, Edit, Trash2, FileText, CheckCircle } from 'lucide-react';
import { PriorityBadge, StatusBadge } from '../common/Badges';
import { formatDate, formatCurrency } from '../../utils/formatters';

const TaskCard = ({ task, isOnline, hideAmounts, onEdit, onDelete, onTogglePayment, onDownloadFile, user }) => {
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
                {task.is_paid && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                        <CheckCircle size={12} />
                        Paid
                    </span>
                )}
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
                <p className="text-xs text-gray-500 flex items-center gap-1">
                    <DollarSign size={12} />
                    Amount
                </p>
                <p className="text-xl font-bold text-indigo-600">
                    {hideAmounts ? '****' : formatCurrency(task.expected_amount)}
                </p>
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
                {onDelete && user?.role === 'admin' && (
                    <button
                        onClick={() => onDelete(task.id)}
                        disabled={!isOnline}
                        className="px-3 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default TaskCard;
