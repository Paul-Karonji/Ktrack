import React from 'react';
import { Activity, Zap, Clock, Database, Server, AlertCircle } from 'lucide-react';

const OperationsSection = ({ data }) => {
    if (!data) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Operational Metrics</h2>
                <p className="text-gray-500 text-center py-8">No operational data available</p>
            </div>
        );
    }

    const operationalMetrics = [
        {
            label: 'System Uptime',
            value: `${data.systemUptime || 99.9}%`,
            icon: Server,
            color: 'green'
        },
        {
            label: 'Avg Response Time',
            value: `${data.avgResponseTime || 0}ms`,
            icon: Zap,
            color: 'yellow'
        },
        {
            label: 'Active Sessions',
            value: data.activeSessions || 0,
            icon: Activity,
            color: 'blue'
        },
        {
            label: 'Storage Used',
            value: `${data.storageUsed || 0}%`,
            icon: Database,
            color: 'purple'
        }
    ];

    const colorClasses = {
        green: 'bg-green-100 text-green-600',
        yellow: 'bg-yellow-100 text-yellow-600',
        blue: 'bg-blue-100 text-blue-600',
        purple: 'bg-purple-100 text-purple-600',
        orange: 'bg-orange-100 text-orange-600'
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Operational Metrics</h2>
                <div className="text-sm text-gray-500">
                    Last updated: {new Date().toLocaleTimeString()}
                </div>
            </div>

            {/* Operational Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {operationalMetrics.map((metric, index) => {
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

            {/* Workflow Efficiency */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Workflow Efficiency</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Clock size={24} className="mx-auto mb-2 text-indigo-600" />
                        <p className="text-sm text-gray-600 mb-1">Avg Task Duration</p>
                        <p className="text-xl font-bold text-gray-900">{data.avgTaskDuration || 0} days</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Activity size={24} className="mx-auto mb-2 text-green-600" />
                        <p className="text-sm text-gray-600 mb-1">Tasks per Day</p>
                        <p className="text-xl font-bold text-gray-900">{data.tasksPerDay || 0}</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Zap size={24} className="mx-auto mb-2 text-yellow-600" />
                        <p className="text-sm text-gray-600 mb-1">Automation Rate</p>
                        <p className="text-xl font-bold text-gray-900">{data.automationRate || 0}%</p>
                    </div>
                </div>
            </div>

            {/* System Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">System Performance</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">API Response Time</span>
                            <span className="text-sm font-bold text-gray-900">{data.apiResponseTime || 0}ms</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Database Query Time</span>
                            <span className="text-sm font-bold text-gray-900">{data.dbQueryTime || 0}ms</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Page Load Time</span>
                            <span className="text-sm font-bold text-gray-900">{data.pageLoadTime || 0}ms</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Error Rate</span>
                            <span className="text-sm font-bold text-gray-900">{data.errorRate || 0}%</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Resource Usage</h3>
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm text-gray-600">Storage</span>
                                <span className="text-sm font-bold text-gray-900">{data.storageUsed || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-purple-600 h-2 rounded-full transition-all"
                                    style={{ width: `${data.storageUsed || 0}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm text-gray-600">Bandwidth</span>
                                <span className="text-sm font-bold text-gray-900">{data.bandwidthUsed || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${data.bandwidthUsed || 0}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm text-gray-600">API Calls</span>
                                <span className="text-sm font-bold text-gray-900">{data.apiCallsUsed || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-green-600 h-2 rounded-full transition-all"
                                    style={{ width: `${data.apiCallsUsed || 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* File Management */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">File Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Total Files</p>
                        <p className="text-xl font-bold text-gray-900">{data.totalFiles || 0}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Files This Month</p>
                        <p className="text-xl font-bold text-gray-900">{data.filesThisMonth || 0}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Avg File Size</p>
                        <p className="text-xl font-bold text-gray-900">{data.avgFileSize || 0} MB</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Storage Growth</p>
                        <p className="text-xl font-bold text-gray-900">{data.storageGrowth || 0}%</p>
                    </div>
                </div>
            </div>

            {/* Communication Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Communication Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">Messages Sent</p>
                        <p className="text-2xl font-bold text-gray-900">{data.messagesSent || 0}</p>
                        <p className="text-xs text-gray-500 mt-1">This month</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">Avg Response Time</p>
                        <p className="text-2xl font-bold text-gray-900">{data.avgMessageResponseTime || 0} hrs</p>
                        <p className="text-xs text-gray-500 mt-1">Client messages</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">Unread Messages</p>
                        <p className="text-2xl font-bold text-gray-900">{data.unreadMessages || 0}</p>
                        <p className="text-xs text-gray-500 mt-1">Requires attention</p>
                    </div>
                </div>
            </div>

            {/* System Health Alerts */}
            {data.systemAlerts && data.systemAlerts.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <AlertCircle size={20} className="text-orange-600" />
                        System Alerts
                    </h3>
                    <div className="space-y-2">
                        {data.systemAlerts.map((alert, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <AlertCircle size={18} className="text-orange-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                                    <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                                </div>
                                <span className="text-xs text-gray-500">{alert.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OperationsSection;
