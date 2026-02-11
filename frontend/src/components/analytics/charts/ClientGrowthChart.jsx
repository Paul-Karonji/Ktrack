import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ClientGrowthChart = ({ data }) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Client Growth</h3>
                <p className="text-gray-500 text-center py-8">No client growth data available</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Client Growth</h3>
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-indigo-500 rounded"></div>
                        <span className="text-gray-600">Registered</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded"></div>
                        <span className="text-gray-600">Guests</span>
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="period"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        stroke="#9ca3af"
                    />
                    <YAxis
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        stroke="#9ca3af"
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                    />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="registered"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ fill: '#6366f1', r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Registered Clients"
                    />
                    <Line
                        type="monotone"
                        dataKey="guests"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={{ fill: '#f97316', r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Guest Clients"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ClientGrowthChart;
