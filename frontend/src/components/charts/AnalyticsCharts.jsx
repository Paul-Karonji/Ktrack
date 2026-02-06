import React from 'react';
import TaskPriorityChart from './TaskPriorityChart';
import TaskStatusChart from './TaskStatusChart';
import RevenueChart from './RevenueChart';
import ClientGrowthChart from './ClientGrowthChart';
import { Users, DollarSign, CheckCircle, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const MetricCard = ({ title, value, subtext, icon: Icon, color }) => (
    <div className="bg-white rounded-xl shadow border border-gray-100 p-6 flex items-start justify-between">
        <div>
            <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
            <h4 className="text-2xl font-bold text-gray-800">{value}</h4>
            {subtext && <p className={`text-xs mt-2 ${subtext.includes('+') ? 'text-green-600' : 'text-gray-400'}`}>{subtext}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
            <Icon size={24} className="text-white" />
        </div>
    </div>
);

const AnalyticsCharts = ({ tasks, users = [], guests = [] }) => {
    // Calculate metrics
    const totalRevenue = tasks.filter(t => t.is_paid).reduce((sum, t) => sum + parseFloat(t.expected_amount || 0), 0);
    const pendingRevenue = tasks.filter(t => !t.is_paid).reduce((sum, t) => sum + parseFloat(t.expected_amount || 0), 0);
    const totalClients = users.length + guests.length;
    const completionRate = tasks.length > 0
        ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* 1. Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Revenue"
                    value={formatCurrency(totalRevenue)}
                    subtext={`+${formatCurrency(pendingRevenue)} pending`}
                    icon={DollarSign}
                    color="bg-green-500"
                />
                <MetricCard
                    title="Total Clients"
                    value={totalClients}
                    subtext={`${guests.length} Guest Clients`}
                    icon={Users}
                    color="bg-blue-500"
                />
                <MetricCard
                    title="Completion Rate"
                    value={`${completionRate}%`}
                    subtext={`${tasks.filter(t => t.status === 'completed').length} completed tasks`}
                    icon={CheckCircle}
                    color="bg-indigo-500"
                />
                <MetricCard
                    title="Active Tasks"
                    value={tasks.filter(t => t.status === 'in_progress' || t.status === 'pending').length}
                    subtext="Currently active"
                    icon={TrendingUp}
                    color="bg-orange-500"
                />
            </div>

            {/* 2. Primary Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RevenueChart tasks={tasks} />
                </div>
                <div>
                    <TaskStatusChart tasks={tasks} />
                </div>
            </div>

            {/* 3. Secondary Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ClientGrowthChart users={users} guests={guests} />
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Task Priority Distribution</h3>
                    <div className="h-64">
                        <TaskPriorityChart tasks={tasks} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsCharts;
