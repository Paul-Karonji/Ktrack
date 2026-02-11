import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const TaskPipelineFunnel = ({ data }) => {
    const stageColors = {
        'pending_quote': '#f59e0b',
        'quote_sent': '#8b5cf6',
        'in_progress': '#3b82f6',
        'review': '#f97316',
        'completed': '#10b981'
    };

    const stageLabels = {
        'pending_quote': 'Pending Quote',
        'quote_sent': 'Quote Sent',
        'in_progress': 'In Progress',
        'review': 'Review',
        'completed': 'Completed'
    };

    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Task Pipeline</h3>
                <p className="text-gray-500 text-center py-8">No pipeline data available</p>
            </div>
        );
    }

    // Format data for display
    const formattedData = data.map(item => ({
        ...item,
        stage: stageLabels[item.stage] || item.stage
    }));

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Task Pipeline</h3>

            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={formattedData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        type="number"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        stroke="#9ca3af"
                    />
                    <YAxis
                        dataKey="stage"
                        type="category"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        stroke="#9ca3af"
                        width={120}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                    />
                    <Bar dataKey="count" name="Tasks" radius={[0, 8, 8, 0]}>
                        {formattedData.map((entry, index) => {
                            const originalStage = data[index].stage;
                            return (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={stageColors[originalStage] || '#6366f1'}
                                />
                            );
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Conversion Rates */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
                {formattedData.map((stage, index) => (
                    <div key={index} className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 truncate">{stage.stage}</p>
                        <p className="text-lg font-bold text-gray-900">{stage.count}</p>
                        {stage.conversion && (
                            <p className="text-xs text-green-600">{stage.conversion}%</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TaskPipelineFunnel;
