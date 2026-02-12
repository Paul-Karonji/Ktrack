import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PaymentStatusChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Status</h3>
                <p className="text-gray-500 text-center py-8">No payment data available</p>
            </div>
        );
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value || 0);
    };

    const COLORS = {
        paid: '#10b981',      // green
        pending: '#f59e0b',   // yellow/orange
        overdue: '#ef4444'    // red
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Status Breakdown</h3>

            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        stroke="#9ca3af"
                    />
                    <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="#9ca3af"
                        tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Legend />
                    <Bar
                        dataKey="paid"
                        stackId="a"
                        fill={COLORS.paid}
                        name="Paid"
                        radius={[0, 0, 0, 0]}
                    />
                    <Bar
                        dataKey="pending"
                        stackId="a"
                        fill={COLORS.pending}
                        name="Pending"
                        radius={[0, 0, 0, 0]}
                    />
                    <Bar
                        dataKey="overdue"
                        stackId="a"
                        fill={COLORS.overdue}
                        name="Overdue"
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Total Paid</p>
                    <p className="text-lg font-bold text-green-600">
                        {formatCurrency(data.reduce((sum, item) => sum + (item.paid || 0), 0))}
                    </p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Total Pending</p>
                    <p className="text-lg font-bold text-yellow-600">
                        {formatCurrency(data.reduce((sum, item) => sum + (item.pending || 0), 0))}
                    </p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Total Overdue</p>
                    <p className="text-lg font-bold text-red-600">
                        {formatCurrency(data.reduce((sum, item) => sum + (item.overdue || 0), 0))}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentStatusChart;
