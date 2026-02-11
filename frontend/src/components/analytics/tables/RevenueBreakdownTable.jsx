import React, { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const RevenueBreakdownTable = ({ data }) => {
    const [sortField, setSortField] = useState('revenue');
    const [sortDirection, setSortDirection] = useState('desc');

    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Revenue Breakdown</h3>
                <p className="text-gray-500 text-center py-8">No revenue data available</p>
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

    const totalRevenue = data.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const totalExpected = data.reduce((sum, item) => sum + (item.expected || 0), 0);
    const totalPaid = data.reduce((sum, item) => sum + (item.paid || 0), 0);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Revenue Breakdown by Client</h3>

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
                            <th className="px-4 py-3 text-center">
                                <button
                                    onClick={() => handleSort('projectCount')}
                                    className="flex items-center gap-2 font-semibold text-gray-700 hover:text-indigo-600 transition-colors mx-auto"
                                >
                                    Projects
                                    <SortIcon field="projectCount" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-right">
                                <button
                                    onClick={() => handleSort('expected')}
                                    className="flex items-center gap-2 font-semibold text-gray-700 hover:text-indigo-600 transition-colors ml-auto"
                                >
                                    Expected
                                    <SortIcon field="expected" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-right">
                                <button
                                    onClick={() => handleSort('paid')}
                                    className="flex items-center gap-2 font-semibold text-gray-700 hover:text-indigo-600 transition-colors ml-auto"
                                >
                                    Paid
                                    <SortIcon field="paid" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-right">
                                <button
                                    onClick={() => handleSort('revenue')}
                                    className="flex items-center gap-2 font-semibold text-gray-700 hover:text-indigo-600 transition-colors ml-auto"
                                >
                                    Total Revenue
                                    <SortIcon field="revenue" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-center">
                                <span className="font-semibold text-gray-700">Collection %</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {sortedData.map((item, index) => {
                            const collectionRate = item.expected > 0
                                ? ((item.paid / item.expected) * 100).toFixed(1)
                                : 0;

                            return (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900">{item.client}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{item.projectCount || 0}</td>
                                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(item.expected)}</td>
                                    <td className="px-4 py-3 text-right font-medium text-green-600">{formatCurrency(item.paid)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(item.revenue)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${collectionRate >= 80 ? 'bg-green-100 text-green-700' :
                                                collectionRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {collectionRate}%
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr className="font-bold">
                            <td className="px-4 py-3 text-gray-900">Total</td>
                            <td className="px-4 py-3 text-center text-gray-900">{data.length}</td>
                            <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(totalExpected)}</td>
                            <td className="px-4 py-3 text-right text-green-600">{formatCurrency(totalPaid)}</td>
                            <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(totalRevenue)}</td>
                            <td className="px-4 py-3 text-center text-gray-900">
                                {totalExpected > 0 ? ((totalPaid / totalExpected) * 100).toFixed(1) : 0}%
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default RevenueBreakdownTable;
