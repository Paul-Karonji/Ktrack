import React from 'react';
import { Search, Filter } from 'lucide-react';

const TaskFilters = ({ searchTerm, filterStatus, onSearchChange, onFilterChange }) => {
    return (
        <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search by client name or task description..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
            </div>
            <div className="flex items-center gap-2">
                <Filter size={20} className="text-gray-400" />
                <select
                    value={filterStatus}
                    onChange={(e) => onFilterChange(e.target.value)}
                    className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                >
                    <option value="all">All Tasks</option>
                    <option value="paid">Paid Only</option>
                    <option value="pending">Pending Only</option>
                </select>
            </div>
        </div>
    );
};

export default TaskFilters;
