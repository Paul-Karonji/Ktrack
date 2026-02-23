import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';

const AnalyticsContext = createContext();

export const AnalyticsProvider = ({ children }) => {
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
        end: new Date()
    });
    const [refreshInterval, setRefreshInterval] = useState(null); // null, 30, 60, 300 (seconds)
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { user } = useAuth();

    const fillGaps = useCallback((data, start, end, format = 'month') => {
        if (!data || !Array.isArray(data)) return [];
        const result = [];
        let current = new Date(start);
        const finish = new Date(end);

        while (current <= finish ||
            (format === 'month' && current.getMonth() === finish.getMonth() && current.getFullYear() === finish.getFullYear())) {
            const period = format === 'day'
                ? current.toISOString().split('T')[0]
                : current.getFullYear() + '-' + String(current.getMonth() + 1).padStart(2, '0');

            // Avoid duplicate periods
            if (result.some(r => r.period === period)) {
                if (format === 'day') current.setDate(current.getDate() + 1);
                else current.setMonth(current.getMonth() + 1);
                continue;
            }

            const existing = data.find(d => d.period === period);
            if (existing) {
                result.push(existing);
            } else {
                result.push({
                    period,
                    expected: 0,
                    actual: 0,
                    task_count: 0,
                    registered: 0,
                    guests: 0,
                    count: 0,
                    size: 0
                });
            }

            if (format === 'day') {
                current.setDate(current.getDate() + 1);
            } else {
                current.setMonth(current.getMonth() + 1);
            }
        }
        return result;
    }, []);

    const fetchAnalytics = useCallback(async () => {
        // Only admins have access to analytics endpoints — skip silently for clients
        if (!user || user.role !== 'admin') return;

        setLoading(true);
        setError(null);

        try {
            // Prepare date range parameters
            const params = {
                startDate: dateRange.start.toISOString(),
                endDate: dateRange.end.toISOString()
            };

            console.log('📊 Fetching analytics with params:', params);

            // Debug: Check if new API methods exist (verifies frontend code sync)
            if (typeof apiService.analytics.getFinancialStats !== 'function') {
                console.error('❌ CRITICAL: apiService.analytics.getFinancialStats is NOT a function! Frontend code is outdated.');
                throw new Error('Frontend code outdated - missing API methods');
            }

            // Fetch all analytics data in parallel
            const [
                kpis,
                revenue,
                pipeline,
                clientGrowth,
                taskStatus,
                financialStats,
                clientStats,
                storageStats
            ] = await Promise.all([
                apiService.analytics.getKPIs(params),
                apiService.analytics.getRevenue(params),
                apiService.analytics.getPipeline(params),
                apiService.analytics.getClientGrowth(params),
                apiService.analytics.getTaskStatus(params),
                apiService.analytics.getFinancialStats(params),
                apiService.analytics.getClientStats(params),
                apiService.analytics.getStorageAnalytics(params)
            ]);

            console.log('✅ API Responses received:', {
                kpis, revenue, pipeline, clientGrowth, taskStatus, financialStats, clientStats
            });

            // Fill gaps in time-series data
            const filledRevenue = fillGaps(revenue, dateRange.start, dateRange.end, 'month');
            const filledGrowth = fillGaps(clientGrowth, dateRange.start, dateRange.end, 'month');

            // Build comprehensive analytics data with section-specific data
            const analyticsData = {
                kpis,
                revenue: filledRevenue,
                clientGrowth: filledGrowth,
                pipeline,
                taskStatus,

                // Financial Section Data - From Real DB
                financial: {
                    totalRevenue: parseFloat(kpis.actualRevenue) || 0,
                    expectedRevenue: parseFloat(kpis.expectedRevenue) || 0,
                    outstanding: kpis.outstanding || 0,
                    paidThisMonth: kpis.paidThisMonth || 0,
                    revenueChange: kpis.revenueTrend || '+0%',
                    paidChange: kpis.paymentTrend || '+0%',
                    collectionRate: kpis.collectionRate || 0,
                    overdueCount: financialStats.overduePayments?.length || 0,
                    paid: kpis.paidThisMonth || 0,
                    pending: kpis.outstanding || 0,
                    overdue: kpis.overdue || 0,
                    avgDaysToPayment: financialStats.avgDaysToPayment || 0,
                    overdueRate: financialStats.overdueRate || 0,
                    // Real data from new endpoints
                    revenueBreakdown: financialStats.revenueByClient,
                    paymentStatusByMonth: financialStats.paymentStatusByMonth,
                    overduePayments: financialStats.overduePayments
                },

                // Tasks Section Data - Calculated from KPIs & Task Status
                tasks: {
                    activeTasks: kpis.activeTasks || 0,
                    completedThisMonth: kpis.completedThisPeriod || 0,
                    avgCompletionTime: kpis.avgCompletionTime || 0,
                    onTimeRate: kpis.onTimeRate || 0,
                    statusDistribution: taskStatus.map(t => ({
                        status: t.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        count: t.count,
                        percentage: taskStatus.reduce((sum, s) => sum + s.count, 0) > 0
                            ? Math.round((t.count / taskStatus.reduce((sum, s) => sum + s.count, 0)) * 100)
                            : 0
                    })),
                    priorityBreakdown: kpis.priorityBreakdown ? [
                        { priority: 'urgent', count: kpis.priorityBreakdown.urgent || 0 },
                        { priority: 'high', count: kpis.priorityBreakdown.high || 0 },
                        { priority: 'medium', count: kpis.priorityBreakdown.medium || 0 },
                        { priority: 'low', count: kpis.priorityBreakdown.low || 0 }
                    ] : [],
                    completedOnTime: kpis.completedOnTime || 0,
                    completedLate: (kpis.completedThisPeriod || 0) - (kpis.completedOnTime || 0),
                    avgResponseTime: kpis.avgResponseTime || 0,
                    avgReviewTime: 0,
                    quotePerformance: {
                        totalQuotes: (kpis.pendingQuotes || 0) + (kpis.completedThisPeriod || 0),
                        approved: kpis.completedThisPeriod || 0,
                        pending: kpis.pendingQuotes || 0,
                        rejected: 0,
                        acceptanceRate: kpis.quoteAcceptanceRate || 0,
                        avgResponseTime: kpis.avgQuoteResponseTime || 0
                    }
                },

                // Clients Section Data - From Real DB
                clients: {
                    totalClients: kpis.totalClients || 0,
                    newThisMonth: clientGrowth.length > 0 ? (Number(clientGrowth[clientGrowth.length - 1].registered) + Number(clientGrowth[clientGrowth.length - 1].guests)) : 0,
                    activeClients: kpis.registeredClients || 0,
                    growthRate: parseFloat(kpis.clientGrowth) || 0,
                    registeredClients: kpis.registeredClients || 0,
                    guestClients: kpis.guestClients || 0,
                    inactiveClients: (kpis.totalClients || 0) - (kpis.registeredClients || 0),
                    // Real data from new endpoints
                    topClients: clientStats.topClients,
                    acquisitionChannels: clientStats.acquisitionChannels,
                    avgProjectsPerClient: kpis.totalClients > 0 ? ((kpis.activeTasks + kpis.completedThisPeriod) / kpis.totalClients).toFixed(1) : 0,
                    avgLifetimeValue: kpis.totalClients > 0 ? (kpis.actualRevenue / kpis.totalClients).toFixed(0) : 0,
                    avgClientResponseTime: kpis.avgQuoteResponseTime || 0,
                    retentionRate: clientStats.retentionRate || 0,
                    repeatClientRate: clientStats.retentionRate || 0
                },

                storage: storageStats,
                lastUpdated: new Date()
            };

            console.log('📈 Setting analytics data:', analyticsData);
            setAnalyticsData(analyticsData);
        } catch (err) {
            console.error('❌ Analytics fetch error:', err);
            console.error('Error message:', err.message);
            console.error('Error response:', err.response?.data);
            console.error('Error status:', err.response?.status);

            setError(err.message || 'Failed to fetch analytics data');
        } finally {
            setLoading(false);
        }
    }, [dateRange, user]);

    // Initial fetch
    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    // Auto-refresh
    useEffect(() => {
        if (!refreshInterval) return;

        const interval = setInterval(() => {
            fetchAnalytics();
        }, refreshInterval * 1000);

        return () => clearInterval(interval);
    }, [refreshInterval, fetchAnalytics]);

    return (
        <AnalyticsContext.Provider value={{
            dateRange,
            setDateRange,
            refreshInterval,
            setRefreshInterval,
            analyticsData,
            loading,
            error,
            refresh: fetchAnalytics
        }}>
            {children}
        </AnalyticsContext.Provider>
    );
};

export const useAnalytics = () => {
    const context = useContext(AnalyticsContext);
    if (!context) {
        throw new Error('useAnalytics must be used within AnalyticsProvider');
    }
    return context;
};
