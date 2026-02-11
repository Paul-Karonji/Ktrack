import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const TaskStatusDonut = ({ data }) => {
    const COLORS = {
        'pending_quote': '#f59e0b',
        'quote_sent': '#8b5cf6',
        'in_progress': '#3b82f6',
        'review': '#f97316',
        'completed': '#10b981'
    };

    const STATUS_LABELS = {
        'pending_quote': 'Pending Quote',
        'quote_sent': 'Quote Sent',
        'in_progress': 'In Progress',
        'review': 'Review',
        'completed': 'Completed'
    };

    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Task Status Distribution</h3>
                <p className="text-gray-500 text-center py-8">No task status data available</p>
            </div>
        );
    }

    // Format data for display
    const formattedData = data.map(item => ({
        ...item,
        name: STATUS_LABELS[item.status] || item.status,
        value: item.count
    }));

    const total = formattedData.reduce((sum, item) => sum + item.value, 0);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            const percentage = ((data.value / total) * 100).toFixed(1);
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-semibold text-gray-900">{data.name}</p>
                    <p className="text-sm text-gray-600">
                        {data.value} tasks ({percentage}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Task Status Distribution</h3>

            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={formattedData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                    >
                        {formattedData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={COLORS[data[index].status] || '#6366f1'}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value, entry) => {
                            const percentage = ((entry.payload.value / total) * 100).toFixed(0);
                            return `${value} (${percentage}%)`;
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Total in center */}
            <div className="text-center -mt-48 pointer-events-none">
                <p className="text-3xl font-bold text-gray-900">{total}</p>
                <p className="text-sm text-gray-500">Total Tasks</p>
            </div>
        </div>
    );
};

export default TaskStatusDonut;
