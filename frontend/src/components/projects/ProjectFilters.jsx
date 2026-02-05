import React from 'react';
import { Filter } from 'lucide-react';

const ProjectFilters = ({ filters, onFilterChange, onClearFilters }) => {
    const handleStatusChange = (status) => {
        const currentStatus = filters.status || [];
        const newStatus = currentStatus.includes(status)
            ? currentStatus.filter(s => s !== status)
            : [...currentStatus, status];
        onFilterChange({ ...filters, status: newStatus });
    };

    const handlePriorityChange = (priority) => {
        const currentPriority = filters.priority || [];
        const newPriority = currentPriority.includes(priority)
            ? currentPriority.filter(p => p !== priority)
            : [...currentPriority, priority];
        onFilterChange({ ...filters, priority: newPriority });
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 sticky top-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Filter size={20} className="text-indigo-600" />
                    Filters
                </h3>
                <button
                    onClick={onClearFilters}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                    Clear all
                </button>
            </div>

            {/* Status Filter */}
            <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Status
                </label>
                <div className="space-y-2">
                    {[
                        { value: 'not_started', label: 'Not Started' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'review', label: 'Under Review' },
                        { value: 'completed', label: 'Completed' }
                    ].map(status => (
                        <label key={status.value} className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={(filters.status || []).includes(status.value)}
                                onChange={() => handleStatusChange(status.value)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-2 focus:ring-indigo-500 border-gray-300"
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                {status.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Priority Filter */}
            <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Priority
                </label>
                <div className="space-y-2">
                    {[
                        { value: 'low', label: '🟢 Low', color: 'text-green-600' },
                        { value: 'medium', label: '🟡 Medium', color: 'text-yellow-600' },
                        { value: 'high', label: '🟠 High', color: 'text-orange-600' },
                        { value: 'urgent', label: '🔴 Urgent', color: 'text-red-600' }
                    ].map(priority => (
                        <label key={priority.value} className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={(filters.priority || []).includes(priority.value)}
                                onChange={() => handlePriorityChange(priority.value)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-2 focus:ring-indigo-500 border-gray-300"
                            />
                            <span className={`text-sm ${priority.color} group-hover:opacity-80`}>
                                {priority.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Date Range */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Delivery Date Range
                </label>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">From</label>
                        <input
                            type="date"
                            value={filters.startDate || ''}
                            onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">To</label>
                        <input
                            type="date"
                            value={filters.endDate || ''}
                            onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectFilters;
