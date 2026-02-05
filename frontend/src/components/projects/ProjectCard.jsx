import React from 'react';
import { Calendar, DollarSign, User } from 'lucide-react';

const ProjectCard = ({ task, onClick }) => {
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
        completed: 'bg-green-100 text-green-700'
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatCurrency = (amount) => {
        if (!amount) return '$0.00';
        return `$${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-indigo-200 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <h3 className="font-bold text-lg text-gray-900 line-clamp-2 flex-1 pr-2">
                    {task.task_name}
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${priorityColors[task.priority || 'medium']}`}>
                    {(task.priority || 'medium').toUpperCase()}
                </span>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                {task.task_description || 'No description provided'}
            </p>

            {/* Meta Info */}
            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={14} className="text-indigo-500" />
                    <span>Due: <span className="font-medium text-gray-700">{formatDate(task.date_delivered)}</span></span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <DollarSign size={14} className="text-emerald-500" />
                    <span className="font-semibold text-emerald-700 text-base">
                        {formatCurrency(task.expected_amount)}
                    </span>
                </div>
                {task.client_name && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <User size={14} className="text-purple-500" />
                        <span className="font-medium text-gray-700">{task.client_name}</span>
                    </div>
                )}
            </div>

            {/* Footer - Status Badge */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusColors[task.status || 'not_started']}`}>
                    {(task.status || 'not_started').replace('_', ' ').toUpperCase()}
                </span>
                {task.quantity && task.quantity > 1 && (
                    <span className="text-xs text-gray-500">
                        Qty: {task.quantity}
                    </span>
                )}
            </div>
        </div>
    );
};

export default ProjectCard;
