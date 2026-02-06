import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const ClientGrowthChart = ({ users = [], guests = [] }) => {
    const data = useMemo(() => {
        const monthlyData = {};

        // Process registered users
        users.forEach(user => {
            const date = new Date(user.created_at);
            if (isNaN(date.getTime())) return;
            const key = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

            if (!monthlyData[key]) {
                monthlyData[key] = { name: key, users: 0, guests: 0, total: 0, sortDate: date };
            }
            monthlyData[key].users += 1;
            monthlyData[key].total += 1;
        });

        // Process guests
        guests.forEach(guest => {
            const date = new Date(guest.created_at);
            if (isNaN(date.getTime())) return;
            const key = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

            if (!monthlyData[key]) {
                monthlyData[key] = { name: key, users: 0, guests: 0, total: 0, sortDate: date };
            }
            monthlyData[key].guests += 1;
            monthlyData[key].total += 1;
        });

        return Object.values(monthlyData).sort((a, b) => a.sortDate - b.sortDate);
    }, [users, guests]);

    if (data.length === 0) {
        return <div className="flex justify-center items-center h-64 text-gray-500">No client data available</div>;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Client Acquisition</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend />
                        <Bar dataKey="users" name="Registered" stackId="a" fill="#6366f1" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="guests" name="Guests" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ClientGrowthChart;
