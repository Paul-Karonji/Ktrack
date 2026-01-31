import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TaskStatusChart = ({ tasks }) => {
    const statusData = useMemo(() => {
        const counts = {
            not_started: { total: 0, paid: 0, pending: 0 },
            in_progress: { total: 0, paid: 0, pending: 0 },
            review: { total: 0, paid: 0, pending: 0 },
            completed: { total: 0, paid: 0, pending: 0 }
        };

        tasks.forEach(task => {
            const status = task.status || 'not_started';
            counts[status].total++;
            if (task.is_paid) {
                counts[status].paid++;
            } else {
                counts[status].pending++;
            }
        });

        return [
            { name: 'Not Started', total: counts.not_started.total, paid: counts.not_started.paid, pending: counts.not_started.pending },
            { name: 'In Progress', total: counts.in_progress.total, paid: counts.in_progress.paid, pending: counts.in_progress.pending },
            { name: 'Under Review', total: counts.review.total, paid: counts.review.paid, pending: counts.review.pending },
            { name: 'Completed', total: counts.completed.total, paid: counts.completed.paid, pending: counts.completed.pending }
        ];
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
            <h3 className="text-lg font-bold text-gray-800 mb-4">Tasks by Status</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="paid" stackId="a" fill="#10b981" name="Paid" />
                    <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TaskStatusChart;
