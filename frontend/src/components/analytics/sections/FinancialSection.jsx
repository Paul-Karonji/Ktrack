import React from 'react';
import { BanknoteArrowDown, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
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
            label: 'Offline Revenue',
            value: formatCurrency(data.offlineRevenue),
            subtext: `Platform: ${formatCurrency(data.platformRevenue)}`,
            icon: BanknoteArrowDown,
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
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Financial Analytics</h2>
                <div className="text-sm text-gray-500">
                    Last updated: {new Date().toLocaleTimeString()}
                </div>
            </div>

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
                                    <div className={`flex items-center gap-1 text-xs font-medium ${metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">Collected By Milestone</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Deposits</span>
                            <span className="font-bold text-blue-700">{formatCurrency(data.depositRevenue)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Balances</span>
                            <span className="font-bold text-indigo-700">{formatCurrency(data.balanceRevenue)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Full Payments</span>
                            <span className="font-bold text-violet-700">{formatCurrency(data.fullRevenue)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">Outstanding Mix</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Deposit Due</span>
                            <span className="font-bold text-orange-700">{formatCurrency(data.outstandingDeposit)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Balance Due</span>
                            <span className="font-bold text-blue-700">{formatCurrency(data.outstandingBalance)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Full Due</span>
                            <span className="font-bold text-amber-700">{formatCurrency(data.outstandingFull)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">Collection Metrics</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Collection Rate</span>
                            <span className="font-bold text-gray-900">{data.collectionRate}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Avg Days to Payment</span>
                            <span className="font-bold text-gray-900">{data.avgDaysToPayment} days</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Overdue Rate</span>
                            <span className="font-bold text-gray-900">{data.overdueRate}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <PaymentStatusChart data={data.paymentStatusByMonth} />

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Revenue Sources</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Platform Revenue</span>
                            <span className="text-sm font-bold text-green-600">{formatCurrency(data.platformRevenue)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Offline Revenue</span>
                            <span className="text-sm font-bold text-amber-600">{formatCurrency(data.offlineRevenue)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Collected This Month</span>
                            <span className="text-sm font-bold text-indigo-600">{formatCurrency(data.paidThisMonth)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Current Liability Snapshot</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Current Due</span>
                            <span className="text-sm font-bold text-yellow-700">{formatCurrency(data.pending)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Overdue</span>
                            <span className="text-sm font-bold text-red-600">{formatCurrency(data.overdue)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Recognized Revenue</span>
                            <span className="text-sm font-bold text-green-600">{formatCurrency(data.paid)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <RevenueBreakdownTable data={data.revenueByClient} />
            <OverduePaymentsTable data={data.overduePayments} />
        </div>
    );
};

export default FinancialSection;
