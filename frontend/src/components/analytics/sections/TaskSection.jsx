import React from 'react';
import { Activity, Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

const TaskSection = ({ data }) => {
    if (!data) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Task Performance</h2>
                <p className="text-gray-500 text-center py-8">No task data available</p>
            </div>
        );
    }

    const statusColors = {
        'not_started': 'bg-gray-100 text-gray-600',
        'in_progress': 'bg-blue-100 text-blue-600',
        'review': 'bg-orange-100 text-orange-600',
        'completed': 'bg-green-100 text-green-600'
    };

    const performanceMetrics = [
        {
            label: 'Active Tasks',
            value: data.activeTasks || 0,
            icon: Activity,
            color: 'blue'
        },
        {
            label: 'Completed (MTD)',
            value: data.completedThisMonth || 0,
            icon: CheckCircle,
            color: 'green'
        },
        {
            label: 'Avg Completion Time',
            value: `${data.avgCompletionTime || 0} days`,
            icon: Clock,
            color: 'indigo'
        },
        {
            label: 'On-Time Rate',
            value: `${data.onTimeRate || 0}%`,
            icon: TrendingUp,
            color: 'emerald'
        }
    ];

    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        indigo: 'bg-indigo-100 text-indigo-600',
        emerald: 'bg-emerald-100 text-emerald-600',
        orange: 'bg-orange-100 text-orange-600'
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Task Performance</h2>
                <div className="text-sm text-gray-500">
                    Last updated: {new Date().toLocaleTimeString()}
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {performanceMetrics.map((metric, index) => {
                    const Icon = metric.icon;
                    return (
                        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div className={`inline-flex p-2 rounded-lg ${colorClasses[metric.color]} mb-3`}>
                                <Icon size={20} />
                            </div>
                            <p className="text-xs text-gray-600 mb-1">{metric.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* Task Status Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Task Status Distribution</h3>
                <div className="space-y-3">
                    {data.statusDistribution?.map((status, index) => (
                        <div key={index}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status.status] || 'bg-gray-100 text-gray-600'}`}>
                                        {status.label}
                                    </span>
                                    <span className="text-sm text-gray-600">{status.count} tasks</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900">{status.percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-indigo-600 h-2 rounded-full transition-all"
                                    style={{ width: `${status.percentage}%` }}
                                />
                            </div>
                        </div>
                    )) || (
                            <p className="text-gray-500 text-center py-4">No status data available</p>
                        )}
                </div>
            </div>

            {/* Priority Breakdown & Completion Trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Priority Breakdown</h3>
                    <div className="space-y-3">
                        {data.priorityBreakdown?.map((priority, index) => (
                            <div key={index} className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${priority.priority === 'urgent' ? 'bg-red-500' :
                                            priority.priority === 'high' ? 'bg-orange-500' :
                                                priority.priority === 'medium' ? 'bg-yellow-500' :
                                                    'bg-green-500'
                                        }`} />
                                    <span className="text-sm text-gray-700 capitalize">{priority.priority}</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900">{priority.count}</span>
                            </div>
                        )) || (
                                <p className="text-gray-500 text-center py-4">No priority data available</p>
                            )}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Completion Metrics</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Completed On Time</span>
                            <span className="text-sm font-bold text-green-600">{data.completedOnTime || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Completed Late</span>
                            <span className="text-sm font-bold text-orange-600">{data.completedLate || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Avg Response Time</span>
                            <span className="text-sm font-bold text-gray-900">{data.avgResponseTime || 0} hrs</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Avg Review Time</span>
                            <span className="text-sm font-bold text-gray-900">{data.avgReviewTime || 0} hrs</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quote Performance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Quote Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Acceptance Rate</p>
                        <p className="text-2xl font-bold text-gray-900">{data.quoteAcceptanceRate || 0}%</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Pending Quotes</p>
                        <p className="text-2xl font-bold text-gray-900">{data.pendingQuotes || 0}</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Avg Response Time</p>
                        <p className="text-2xl font-bold text-gray-900">{data.avgQuoteResponseTime || 0} days</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskSection;
