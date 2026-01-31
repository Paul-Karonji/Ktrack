import React from 'react';

// Priority badge component
export const PriorityBadge = ({ priority }) => {
    const priorityConfig = {
        low: { color: 'bg-green-100 text-green-700', icon: '🟢', label: 'Low' },
        medium: { color: 'bg-yellow-100 text-yellow-700', icon: '🟡', label: 'Medium' },
        high: { color: 'bg-orange-100 text-orange-700', icon: '🟠', label: 'High' },
        urgent: { color: 'bg-red-100 text-red-700', icon: '🔴', label: 'Urgent' }
    };

    const config = priorityConfig[priority] || priorityConfig.medium;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${config.color}`}>
            <span>{config.icon}</span>
            <span>{config.label}</span>
        </span>
    );
};

// Status badge component
export const StatusBadge = ({ status }) => {
    const statusConfig = {
        not_started: { color: 'bg-gray-100 text-gray-700', label: 'Not Started' },
        in_progress: { color: 'bg-blue-100 text-blue-700', label: 'In Progress' },
        review: { color: 'bg-purple-100 text-purple-700', label: 'Under Review' },
        completed: { color: 'bg-green-100 text-green-700', label: 'Completed' }
    };

    const config = statusConfig[status] || statusConfig.not_started;

    return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${config.color}`}>
            {config.label}
        </span>
    );
};
