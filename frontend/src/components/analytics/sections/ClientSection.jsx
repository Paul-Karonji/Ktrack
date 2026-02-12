import React from 'react';
import { Users, UserPlus, UserCheck, TrendingUp } from 'lucide-react';
import TopClientsChart from '../charts/TopClientsChart';
import LifetimeValueScatter from '../charts/LifetimeValueScatter';
import EngagementGauge from '../charts/EngagementGauge';

const ClientSection = ({ data }) => {
    if (!data) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Client Intelligence</h2>
                <p className="text-gray-500 text-center py-8">No client data available</p>
            </div>
        );
    }

    const clientMetrics = [
        {
            label: 'Total Clients',
            value: data.totalClients || 0,
            icon: Users,
            color: 'purple'
        },
        {
            label: 'New This Month',
            value: data.newThisMonth || 0,
            icon: UserPlus,
            color: 'blue'
        },
        {
            label: 'Active Clients',
            value: data.activeClients || 0,
            icon: UserCheck,
            color: 'green'
        },
        {
            label: 'Growth Rate',
            value: `${data.growthRate || 0}%`,
            icon: TrendingUp,
            color: 'emerald'
        }
    ];

    const colorClasses = {
        purple: 'bg-purple-100 text-purple-600',
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        emerald: 'bg-emerald-100 text-emerald-600',
        yellow: 'bg-yellow-100 text-yellow-600'
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Client Intelligence</h2>
                <div className="text-sm text-gray-500">
                    Last updated: {new Date().toLocaleTimeString()}
                </div>
            </div>

            {/* Client Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {clientMetrics.map((metric, index) => {
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

            {/* Client Engagement & Retention Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LifetimeValueScatter data={data.clientScatter} />
                <EngagementGauge score={data.retentionRate} />
            </div>

            {/* Top Clients Chart */}
            <TopClientsChart data={data.topClients} />

            {/* Client Segmentation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Client Segmentation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">By Type</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Registered</span>
                                <span className="text-sm font-bold text-gray-900">{data.registeredClients || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Guest</span>
                                <span className="text-sm font-bold text-gray-900">{data.guestClients || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">By Status</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Active</span>
                                <span className="text-sm font-bold text-green-600">{data.activeClients || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Inactive</span>
                                <span className="text-sm font-bold text-gray-500">{data.inactiveClients || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Client Loyalty Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Client Project Frequency</h3>
                <div className="space-y-3">
                    {data.clientLoyalty?.map((category, index) => (
                        <div key={index}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-700">{category.name}</span>
                                <span className="text-sm font-bold text-gray-900">{category.count} clients ({category.percentage}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all ${category.name === 'VIP' ? 'bg-indigo-600' :
                                            category.name === 'Returning' ? 'bg-blue-500' : 'bg-gray-400'
                                        }`}
                                    style={{ width: `${category.percentage}%` }}
                                />
                            </div>
                        </div>
                    )) || (
                            <p className="text-gray-500 text-center py-4">No data available</p>
                        )}
                </div>
            </div>
        </div>
    );
};

export default ClientSection;
