import React, { useMemo } from 'react';
import { DollarSign, CheckCircle, Clock, User, TrendingUp, XCircle } from 'lucide-react';
import StatCard from './StatCard';
import { formatCurrency } from '../../utils/formatters';

const Analytics = ({ tasks, hideAmounts }) => {
    // Calculate analytics
    const analytics = useMemo(() => {
        const totalExpected = tasks.reduce((sum, task) => sum + parseFloat(task.expected_amount || 0), 0);
        const totalPaid = tasks.filter(task => task.is_paid).reduce((sum, task) => sum + parseFloat(task.expected_amount || 0), 0);
        const totalPending = totalExpected - totalPaid;
        const paidCount = tasks.filter(task => task.is_paid).length;
        const pendingCount = tasks.filter(task => !task.is_paid).length;
        const paymentRate = tasks.length > 0 ? ((paidCount / tasks.length) * 100).toFixed(1) : 0;
        const uniqueClients = new Set(tasks.map(t => t.client_name)).size;

        return {
            totalExpected,
            totalPaid,
            totalPending,
            paidCount,
            pendingCount,
            paymentRate,
            uniqueClients,
            totalTasks: tasks.length
        };
    }, [tasks]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Expected Card */}
            <StatCard
                title="Total Expected"
                value={formatCurrency(analytics.totalExpected, hideAmounts)}
                icon={DollarSign}
                color="indigo"
                subtitle={`${analytics.totalTasks} total tasks`}
            />

            {/* Total Paid Card */}
            <StatCard
                title="Total Paid"
                value={formatCurrency(analytics.totalPaid, hideAmounts)}
                icon={CheckCircle}
                color="green"
                subtitle={`${analytics.paidCount} paid tasks`}
                badge={`${analytics.paymentRate}%`}
            />

            {/* Pending Payment Card */}
            <StatCard
                title="Pending Payment"
                value={formatCurrency(analytics.totalPending, hideAmounts)}
                icon={Clock}
                color="orange"
                subtitle={`${analytics.pendingCount} pending tasks`}
            />

            {/* Active Clients Card */}
            <StatCard
                title="Active Clients"
                value={analytics.uniqueClients}
                icon={User}
                color="purple"
                subtitle="Unique clients"
            />
        </div>
    );
};

export default Analytics;
