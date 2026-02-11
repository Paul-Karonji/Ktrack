import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Star, TrendingUp } from 'lucide-react';

const TopClientsChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Top Clients by Revenue</h3>
                <p className="text-gray-500 text-center py-8">No client data available</p>
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

    // Sort by revenue and take top 10
    const topClients = [...data]
        .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
        .slice(0, 10);

    const COLORS = [
        '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
        '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4'
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Top Clients by Revenue</h3>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                    <TrendingUp size={16} />
                    <span>Top 10</span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={400}>
                <BarChart
                    data={topClients}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        type="number"
                        tick={{ fontSize: 12 }}
                        stroke="#9ca3af"
                        tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        stroke="#9ca3af"
                        width={90}
                    />
                    <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Bar
                        dataKey="revenue"
                        name="Revenue"
                        radius={[0, 4, 4, 0]}
                    >
                        {topClients.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Client Details Table */}
            <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Rank</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Client</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Revenue</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Projects</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Rating</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {topClients.map((client, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3">
                                    <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                            index === 1 ? 'bg-gray-100 text-gray-700' :
                                                index === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-gray-50 text-gray-600'}
                  `}>
                                        {index + 1}
                                    </div>
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-900">{client.name}</td>
                                <td className="px-4 py-3 text-right font-bold text-gray-900">
                                    {formatCurrency(client.revenue)}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-600">{client.projectCount || 0}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                        <Star size={14} className="text-yellow-500" fill="currentColor" />
                                        <span className="text-gray-700 font-medium">{client.rating || 'N/A'}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TopClientsChart;
