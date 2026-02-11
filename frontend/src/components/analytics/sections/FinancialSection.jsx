import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import PaymentStatusChart from '../charts/PaymentStatusChart';
import RevenueBreakdownTable from '../tables/RevenueBreakdownTable';
import OverduePaymentsTable from '../tables/OverduePaymentsTable';

const FinancialSection = ({ data }) => {
    if (!data) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Financial Analytics</h2>
                <p className="text-gray-500 text-center py-8">No financial data available</p>
            </div>
        );
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const metrics = [
        {
            label: 'Total Revenue (MTD)',
            value: formatCurrency(data.totalRevenue),
            change: data.revenueChange,
            icon: DollarSign,
            color: 'emerald'
        },
        {
            label: 'Expected Revenue',
            value: formatCurrency(data.expectedRevenue),
            subtext: `${data.collectionRate}% collected`,
            icon: TrendingUp,
            color: 'blue'
        },
        {
            label: 'Outstanding Payments',
            value: formatCurrency(data.outstanding),
            subtext: `${data.overdueCount} overdue`,
            icon: AlertCircle,
            color: 'orange'
        },
        {
            label: 'Paid This Month',
            value: formatCurrency(data.paidThisMonth),
            change: data.paidChange,
            icon: CheckCircle,
            color: 'green'
        }
    ];

    const colorClasses = {
        emerald: 'bg-emerald-100 text-emerald-600',
        blue: 'bg-blue-100 text-blue-600',
        orange: 'bg-orange-100 text-orange-600',
        green: 'bg-green-100 text-green-600'
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Financial Analytics</h2>
                <div className="text-sm text-gray-500">
                    Last updated: {new Date().toLocaleTimeString()}
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric, index) => {
                    const Icon = metric.icon;
                    return (
                        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div className="flex items-start justify-between mb-2">
                                <div className={`p-2 rounded-lg ${colorClasses[metric.color]}`}>
                                    <Icon size={20} />
                                </div>
                                {metric.change && (
                                    <div className={`flex items-center gap-1 text-xs font-medium ${metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {metric.change.startsWith('+') ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {metric.change}
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-600 mb-1">{metric.label}</p>
                            <p className="text-xl font-bold text-gray-900">{metric.value}</p>
                            {metric.subtext && (
                                <p className="text-xs text-gray-500 mt-1">{metric.subtext}</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Payment Status Chart */}
            <PaymentStatusChart data={data.paymentStatusByMonth} />

            {/* Revenue Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Revenue Breakdown</h3>
                <div className="space-y-3">
                    {data.revenueBreakdown?.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-700">{item.category}</span>
                                    <span className="text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-indigo-600 h-2 rounded-full transition-all"
                                        style={{ width: `${item.percentage}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )) || (
                            <p className="text-gray-500 text-center py-4">No breakdown data available</p>
                        )}
                </div>
            </div>

            {/* Payment Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Status</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Paid</span>
                            <span className="text-sm font-bold text-green-600">{formatCurrency(data.paid)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Pending</span>
                            <span className="text-sm font-bold text-yellow-600">{formatCurrency(data.pending)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Overdue</span>
                            <span className="text-sm font-bold text-red-600">{formatCurrency(data.overdue)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Collection Metrics</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Collection Rate</span>
                            <span className="text-sm font-bold text-gray-900">{data.collectionRate}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Avg Days to Payment</span>
                            <span className="text-sm font-bold text-gray-900">{data.avgDaysToPayment} days</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Overdue Rate</span>
                            <span className="text-sm font-bold text-gray-900">{data.overdueRate}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Revenue Breakdown Table */}
            <RevenueBreakdownTable data={data.revenueByClient} />

            {/* Overdue Payments Table */}
            <OverduePaymentsTable data={data.overduePayments} />
        </div>
    );
};

export default FinancialSection;
