import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';

const AnalyticsContext = createContext();

const toNumber = (value) => Number(value || 0);

const titleize = (value) => String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const AnalyticsProvider = ({ children }) => {
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)),
        end: new Date()
    });
    const [refreshInterval, setRefreshInterval] = useState(null);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { user } = useAuth();

    const fillGaps = useCallback((data, start, end, format = 'month') => {
        if (!Array.isArray(data)) return [];

        const result = [];
        const existingByPeriod = new Map(data.map((item) => [item.period, item]));
        const current = new Date(start);
        const finish = new Date(end);

        while (
            current <= finish
            || (format === 'month' && current.getMonth() === finish.getMonth() && current.getFullYear() === finish.getFullYear())
        ) {
            const period = format === 'day'
                ? current.toISOString().split('T')[0]
                : `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;

            result.push(existingByPeriod.get(period) || {
                period,
                expected: 0,
                actual: 0,
                task_count: 0,
                registered: 0,
                guests: 0,
                count: 0,
                size: 0
            });

            if (format === 'day') {
                current.setDate(current.getDate() + 1);
            } else {
                current.setMonth(current.getMonth() + 1);
            }
        }

        return result;
    }, []);

    const fetchAnalytics = useCallback(async () => {
        if (!user || user.role !== 'admin') return;

        setLoading(true);
        setError(null);

        try {
            const params = {
                startDate: dateRange.start.toISOString(),
                endDate: dateRange.end.toISOString()
            };

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

            const filledRevenue = fillGaps(revenue, dateRange.start, dateRange.end, 'month');
            const filledGrowth = fillGaps(clientGrowth, dateRange.start, dateRange.end, 'month');
            const totalStatuses = taskStatus.reduce((sum, status) => sum + toNumber(status.count), 0);

            setAnalyticsData({
                kpis,
                revenue: filledRevenue,
                clientGrowth: filledGrowth,
                pipeline,
                taskStatus,
                financial: {
                    totalRevenue: toNumber(financialStats.totalRevenue ?? kpis.actualRevenue),
                    expectedRevenue: toNumber(kpis.expectedRevenue),
                    outstanding: toNumber(financialStats.outstanding ?? kpis.outstanding),
                    outstandingDeposit: toNumber(financialStats.outstandingDeposit),
                    outstandingBalance: toNumber(financialStats.outstandingBalance),
                    outstandingFull: toNumber(financialStats.outstandingFull),
                    paidThisMonth: toNumber(kpis.paidThisMonth),
                    revenueChange: kpis.revenueTrend || '0%',
                    paidChange: kpis.paymentTrend || '0%',
                    collectionRate: toNumber(kpis.collectionRate),
                    overdueCount: financialStats.overduePayments?.length || 0,
                    paid: toNumber(financialStats.totalRevenue),
                    pending: toNumber(financialStats.outstanding),
                    overdue: toNumber(kpis.overdue),
                    avgDaysToPayment: toNumber(financialStats.avgDaysToPayment),
                    overdueRate: toNumber(financialStats.overdueRate),
                    platformRevenue: toNumber(financialStats.platformRevenue),
                    offlineRevenue: toNumber(financialStats.offlineRevenue),
                    depositRevenue: toNumber(financialStats.depositRevenue),
                    balanceRevenue: toNumber(financialStats.balanceRevenue),
                    fullRevenue: toNumber(financialStats.fullRevenue),
                    revenueBreakdown: financialStats.revenueBreakdown || [],
                    paymentStatusByMonth: financialStats.paymentStatusByMonth || [],
                    overduePayments: financialStats.overduePayments || [],
                    revenueByClient: financialStats.revenueByClient || []
                },
                tasks: {
                    activeTasks: toNumber(kpis.activeTasks),
                    completedThisMonth: toNumber(kpis.completedThisPeriod),
                    avgCompletionTime: toNumber(kpis.avgCompletionTime),
                    onTimeRate: toNumber(kpis.onTimeRate),
                    statusDistribution: taskStatus.map((item) => ({
                        status: item.status,
                        label: titleize(item.status),
                        count: toNumber(item.count),
                        percentage: totalStatuses > 0
                            ? Math.round((toNumber(item.count) / totalStatuses) * 100)
                            : 0
                    })),
                    priorityBreakdown: kpis.priorityBreakdown ? [
                        { priority: 'urgent', count: toNumber(kpis.priorityBreakdown.urgent) },
                        { priority: 'high', count: toNumber(kpis.priorityBreakdown.high) },
                        { priority: 'medium', count: toNumber(kpis.priorityBreakdown.medium) },
                        { priority: 'low', count: toNumber(kpis.priorityBreakdown.low) }
                    ] : [],
                    completedOnTime: toNumber(kpis.completedOnTime),
                    completedLate: Math.max(toNumber(kpis.completedThisPeriod) - toNumber(kpis.completedOnTime), 0),
                    avgResponseTime: toNumber(kpis.avgQuoteResponseTime),
                    avgReviewTime: 0,
                    quotePerformance: {
                        totalQuotes: toNumber(kpis.totalQuotes),
                        approved: toNumber(kpis.approvedQuotes),
                        pending: toNumber(kpis.pendingQuotes),
                        rejected: toNumber(kpis.rejectedQuotes),
                        acceptanceRate: toNumber(kpis.quoteAcceptanceRate),
                        avgResponseTime: toNumber(kpis.avgQuoteResponseTime)
                    }
                },
                clients: {
                    totalClients: toNumber(clientStats.totalClients ?? kpis.totalClients),
                    newThisMonth: filledGrowth.length > 0
                        ? (toNumber(filledGrowth[filledGrowth.length - 1].registered) + toNumber(filledGrowth[filledGrowth.length - 1].guests))
                        : 0,
                    activeClients: toNumber(clientStats.activeClients ?? kpis.totalClients),
                    growthRate: parseFloat(kpis.clientGrowth) || 0,
                    registeredClients: toNumber(kpis.registeredClients),
                    guestClients: toNumber(kpis.guestClients),
                    inactiveClients: toNumber(clientStats.inactiveClients),
                    topClients: clientStats.topClients || [],
                    acquisitionChannels: clientStats.acquisitionChannels || [],
                    clientLoyalty: clientStats.clientLoyalty || [],
                    clientScatter: clientStats.clientScatter || [],
                    avgProjectsPerClient: toNumber(clientStats.totalClients ?? kpis.totalClients) > 0
                        ? ((toNumber(kpis.activeTasks) + toNumber(kpis.completedThisPeriod)) / toNumber(clientStats.totalClients ?? kpis.totalClients)).toFixed(1)
                        : 0,
                    avgLifetimeValue: toNumber(clientStats.totalClients ?? kpis.totalClients) > 0
                        ? (toNumber(kpis.actualRevenue) / toNumber(clientStats.totalClients ?? kpis.totalClients)).toFixed(0)
                        : 0,
                    avgClientResponseTime: toNumber(kpis.avgQuoteResponseTime),
                    retentionRate: toNumber(clientStats.retentionRate),
                    repeatClientRate: toNumber(clientStats.retentionRate)
                },
                storage: storageStats,
                lastUpdated: new Date()
            });
        } catch (err) {
            setError(err.message || 'Failed to fetch analytics data');
        } finally {
            setLoading(false);
        }
    }, [dateRange, fillGaps, user]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

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
