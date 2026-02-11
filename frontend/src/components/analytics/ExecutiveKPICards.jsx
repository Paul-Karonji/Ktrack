import React from 'react';
import { DollarSign, Activity, Users, TrendingUp, CheckCircle, CreditCard, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const KPICard = ({ title, value, subValue, trend, icon: Icon, color, onClick }) => {
    const colorClasses = {
        emerald: 'bg-emerald-500',
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
        indigo: 'bg-indigo-500',
        green: 'bg-green-500',
        orange: 'bg-orange-500'
    };

    const trendColor = trend?.startsWith('+') ? 'text-green-600' : 'text-red-600';
    const TrendIcon = trend?.startsWith('+') ? ArrowUp : ArrowDown;

    return (
        <div
            className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900">{value}</h3>
                    {subValue && (
                        <p className="text-sm text-gray-500 mt-1">{subValue}</p>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon size={24} className="text-white" />
                </div>
            </div>
            {trend && (
                <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
                    <TrendIcon size={16} />
                    <span>{trend}</span>
                </div>
            )}
        </div>
    );
};

const ExecutiveKPICards = ({ data }) => {
    if (!data) return null;

    const kpis = [
        {
            title: 'Total Revenue (MTD)',
            value: formatCurrency(data.actualRevenue),
            subValue: `Expected: ${formatCurrency(data.expectedRevenue)} | ${data.collectionRate}% collected`,
            trend: data.revenueTrend,
            icon: DollarSign,
            color: 'emerald'
        },
        {
            title: 'Active Tasks',
            value: data.activeTasks,
            subValue: `${data.inProgress} in progress, ${data.pendingReview} in review`,
            trend: data.tasksTrend,
            icon: Activity,
            color: 'blue'
        },
        {
            title: 'Client Base',
            value: data.totalClients,
            subValue: `${data.registeredClients} registered, ${data.guestClients} guests`,
            trend: data.clientGrowth,
            icon: Users,
            color: 'purple'
        },
        {
            title: 'Quote Performance',
            value: `${data.quoteAcceptanceRate}%`,
            subValue: `Avg response: ${data.avgQuoteResponseTime} days | ${data.pendingQuotes} pending`,
            trend: data.quoteTrend,
            icon: TrendingUp,
            color: 'indigo'
        },
        {
            title: 'Task Completion',
            value: data.completedThisPeriod,
            subValue: `Avg time: ${data.avgCompletionTime} days | ${data.onTimeRate}% on-time`,
            trend: data.completionTrend,
            icon: CheckCircle,
            color: 'green'
        },
        {
            title: 'Payment Health',
            value: formatCurrency(data.outstanding),
            subValue: `Overdue: ${formatCurrency(data.overdue)} | Paid MTD: ${formatCurrency(data.paidThisMonth)}`,
            trend: data.paymentTrend,
            icon: CreditCard,
            color: 'orange'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpis.map((kpi, index) => (
                <KPICard key={index} {...kpi} />
            ))}
        </div>
    );
};

export default ExecutiveKPICards;
