import React, { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, Clock } from 'lucide-react';

const OverduePaymentsTable = ({ data }) => {
    const [sortField, setSortField] = useState('daysOverdue');
    const [sortDirection, setSortDirection] = useState('desc');

    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertCircle size={20} className="text-orange-600" />
                    Overdue Payments
                </h3>
                <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-3">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-gray-600 font-medium">No overdue payments!</p>
                    <p className="text-sm text-gray-500 mt-1">All payments are up to date</p>
                </div>
            </div>
        );
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const sortedData = [...data].sort((a, b) => {
        const aValue = a[sortField] || 0;
        const bValue = b[sortField] || 0;

        if (sortDirection === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-400" />;
        return sortDirection === 'asc'
            ? <ArrowUp size={14} className="text-indigo-600" />
            : <ArrowDown size={14} className="text-indigo-600" />;
    };

    const getPriorityBadge = (days) => {
        if (days > 60) return { label: 'Critical', color: 'bg-red-100 text-red-700' };
        if (days > 30) return { label: 'High', color: 'bg-orange-100 text-orange-700' };
        if (days > 14) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' };
        return { label: 'Low', color: 'bg-blue-100 text-blue-700' };
    };

    const totalOverdue = data.reduce((sum, item) => sum + (item.amount || 0), 0);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <AlertCircle size={20} className="text-orange-600" />
                    Overdue Payments
                </h3>
                <div className="text-right">
                    <p className="text-xs text-gray-500">Total Overdue</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(totalOverdue)}</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('client')}
                                    className="flex items-center gap-2 font-semibold text-gray-700 hover:text-indigo-600 transition-colors"
                                >
                                    Client
                                    <SortIcon field="client" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('project')}
                                    className="flex items-center gap-2 font-semibold text-gray-700 hover:text-indigo-600 transition-colors"
                                >
                                    Project
                                    <SortIcon field="project" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-right">
                                <button
                                    onClick={() => handleSort('amount')}
                                    className="flex items-center gap-2 font-semibold text-gray-700 hover:text-indigo-600 transition-colors ml-auto"
                                >
                                    Amount
                                    <SortIcon field="amount" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-center">
                                <button
                                    onClick={() => handleSort('dueDate')}
                                    className="flex items-center gap-2 font-semibold text-gray-700 hover:text-indigo-600 transition-colors mx-auto"
                                >
                                    Due Date
                                    <SortIcon field="dueDate" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-center">
                                <button
                                    onClick={() => handleSort('daysOverdue')}
                                    className="flex items-center gap-2 font-semibold text-gray-700 hover:text-indigo-600 transition-colors mx-auto"
                                >
                                    Days Overdue
                                    <SortIcon field="daysOverdue" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-center">
                                <span className="font-semibold text-gray-700">Priority</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {sortedData.map((item, index) => {
                            const priority = getPriorityBadge(item.daysOverdue || 0);

                            return (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900">{item.client}</td>
                                    <td className="px-4 py-3 text-gray-700">{item.project}</td>
                                    <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(item.amount)}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{formatDate(item.dueDate)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1 text-orange-600 font-medium">
                                            <Clock size={14} />
                                            {item.daysOverdue} days
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${priority.color}`}>
                                            {priority.label}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
                <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Total Items</p>
                    <p className="text-xl font-bold text-gray-900">{data.length}</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Critical (60+ days)</p>
                    <p className="text-xl font-bold text-red-600">
                        {data.filter(item => item.daysOverdue > 60).length}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">High (30-60 days)</p>
                    <p className="text-xl font-bold text-orange-600">
                        {data.filter(item => item.daysOverdue > 30 && item.daysOverdue <= 60).length}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Avg Days Overdue</p>
                    <p className="text-xl font-bold text-gray-900">
                        {Math.round(data.reduce((sum, item) => sum + (item.daysOverdue || 0), 0) / data.length)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OverduePaymentsTable;
