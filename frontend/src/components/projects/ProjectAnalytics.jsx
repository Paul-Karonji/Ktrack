import React from 'react';
import { TrendingUp, DollarSign, CheckCircle, Clock } from 'lucide-react';

const ProjectAnalytics = ({ tasks }) => {
    const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        notStarted: tasks.filter(t => t.status === 'not_started').length,
        totalRevenue: tasks.reduce((sum, t) => sum + (parseFloat(t.expected_amount) || 0), 0),
        completedRevenue: tasks
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + (parseFloat(t.expected_amount) || 0), 0),
        paidRevenue: tasks
            .filter(t => t.is_paid)
            .reduce((sum, t) => sum + (parseFloat(t.expected_amount) || 0), 0)
    };

    const completionRate = stats.total > 0
        ? ((stats.completed / stats.total) * 100).toFixed(1)
        : 0;

    const formatCurrency = (amount) => {
        return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Projects */}
            <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-6 border border-indigo-100 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 rounded-xl">
                        <TrendingUp className="text-indigo-600" size={28} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 font-medium">Total Projects</p>
                        <p className="text-4xl font-bold text-gray-900">{stats.total}</p>
                        <p className="text-xs text-gray-500 mt-1">
                            {stats.notStarted} not started
                        </p>
                    </div>
                </div>
            </div>

            {/* Completed */}
            <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-6 border border-green-100 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-xl">
                        <CheckCircle className="text-green-600" size={28} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 font-medium">Completed</p>
                        <p className="text-4xl font-bold text-gray-900">{stats.completed}</p>
                        <p className="text-xs text-green-600 font-semibold mt-1">
                            {completionRate}% completion rate
                        </p>
                    </div>
                </div>
            </div>

            {/* In Progress */}
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border border-blue-100 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                        <Clock className="text-blue-600" size={28} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 font-medium">In Progress</p>
                        <p className="text-4xl font-bold text-gray-900">{stats.inProgress}</p>
                        <p className="text-xs text-gray-500 mt-1">
                            Active projects
                        </p>
                    </div>
                </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-6 border border-emerald-100 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 rounded-xl">
                        <DollarSign className="text-emerald-600" size={28} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
                        <p className="text-3xl font-bold text-gray-900">
                            {formatCurrency(stats.totalRevenue)}
                        </p>
                        <p className="text-xs text-emerald-600 font-semibold mt-1">
                            {formatCurrency(stats.paidRevenue)} paid
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectAnalytics;
