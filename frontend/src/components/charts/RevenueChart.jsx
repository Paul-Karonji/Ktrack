import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const RevenueChart = ({ tasks }) => {
    const revenueData = useMemo(() => {
        // Group tasks by month
        const monthlyData = {};

        tasks.forEach(task => {
            const date = task.date_commissioned || task.created_at;
            if (!date) return;

            const monthKey = new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    month: monthKey,
                    expected: 0,
                    actual: 0
                };
            }

            monthlyData[monthKey].expected += parseFloat(task.expected_amount || 0);
            if (task.is_paid) {
                monthlyData[monthKey].actual += parseFloat(task.expected_amount || 0);
            }
        });

        return Object.values(monthlyData).sort((a, b) => {
            return new Date(a.month) - new Date(b.month);
        });
    }, [tasks]);

    if (tasks.length === 0 || revenueData.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                No revenue data to display
            </div>
        );
    }

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border-2 border-gray-200 rounded-lg shadow-lg">
                    <p className="font-semibold">{payload[0].payload.month}</p>
                    <p className="text-sm text-indigo-600">
                        Expected: {formatCurrency(payload[0].value, false)}
                    </p>
                    <p className="text-sm text-green-600">
                        Actual: {formatCurrency(payload[1].value, false)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Revenue Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="expected" stroke="#6366f1" strokeWidth={2} name="Expected Revenue" />
                    <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} name="Actual Revenue" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default RevenueChart;
