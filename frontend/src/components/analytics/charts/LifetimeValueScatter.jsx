import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { formatCurrency } from '../../../utils/formatters';

const LifetimeValueScatter = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Client Value Distribution</h3>
                <p className="text-gray-500 text-center py-8">No value data available</p>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl text-xs">
                    <p className="font-bold text-gray-800">{data.name}</p>
                    <div className="mt-1 space-y-1 text-gray-600">
                        <p>Revenue: <span className="font-semibold text-indigo-600">{formatCurrency(data.revenue)}</span></p>
                        <p>Projects: {data.projects}</p>
                        <p className="text-gray-400 text-[10px]">Last Active: {new Date(data.lastActive).toLocaleDateString()}</p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Client Value Distribution</h3>
            <p className="text-sm text-gray-500 mb-6">Revenue vs. Project Count per Client</p>

            <div className="h-[350px]">
                <ResponsiveContainer width="100%" height={350}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            type="number"
                            dataKey="projects"
                            name="Projects"
                            unit=" projects"
                            stroke="#9ca3af"
                            tick={{ fontSize: 12 }}
                            label={{ value: 'Project Count', position: 'bottom', offset: 0, fill: '#9ca3af', fontSize: 12 }}
                        />
                        <YAxis
                            type="number"
                            dataKey="revenue"
                            name="Revenue"
                            unit="$"
                            stroke="#9ca3af"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(val) => `$${val / 1000}k`}
                            label={{ value: 'Lifetime Revenue', angle: -90, position: 'left', offset: 0, fill: '#9ca3af', fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Clients" data={data} fill="#6366f1">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.projects > 5 ? '#4f46e5' : '#818cf8'} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default LifetimeValueScatter;
