import React, { useState } from 'react';
import TaskPriorityChart from './TaskPriorityChart';
import TaskStatusChart from './TaskStatusChart';
import RevenueChart from './RevenueChart';

const AnalyticsCharts = ({ tasks }) => {
    const [chartType, setChartType] = useState('priority');

    return (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Analytics Overview</h3>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {['priority', 'status', 'revenue'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setChartType(type)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${chartType === type
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-80 w-full">
                {chartType === 'priority' && <TaskPriorityChart tasks={tasks} />}
                {chartType === 'status' && <TaskStatusChart tasks={tasks} />}
                {chartType === 'revenue' && <RevenueChart tasks={tasks} />}
            </div>
        </div>
    );
};

export default AnalyticsCharts;
