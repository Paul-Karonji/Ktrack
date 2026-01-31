import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const TaskPriorityChart = ({ tasks }) => {
    const priorityData = useMemo(() => {
        const counts = {
            low: 0,
            medium: 0,
            high: 0,
            urgent: 0
        };

        tasks.forEach(task => {
            const priority = task.priority || 'medium';
            counts[priority]++;
        });

        return [
            { name: '🟢 Low', value: counts.low, color: '#10b981' },
            { name: '🟡 Medium', value: counts.medium, color: '#f59e0b' },
            { name: '🟠 High', value: counts.high, color: '#f97316' },
            { name: '🔴 Urgent', value: counts.urgent, color: '#ef4444' }
        ].filter(item => item.value > 0);
    }, [tasks]);

    if (tasks.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                No tasks to display
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Tasks by Priority</h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {priorityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TaskPriorityChart;
