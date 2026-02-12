import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import apiService from '../services/api';

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

    const fetchAnalytics = useCallback(async () => {
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

            // Build comprehensive analytics data with section-specific data
            const analyticsData = {
                kpis,
                revenue,
                pipeline,
                clientGrowth,
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
                    overdueCount: financialStats.overduePayments.length,
                    paid: kpis.paidThisMonth || 0,
                    pending: kpis.outstanding || 0,
                    overdue: kpis.overdue || 0,
                    avgDaysToPayment: 15, // TODO: Implement real calc
                    overdueRate: 5, // TODO: Implement real calc
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
                    avgReviewTime: 0, // Not currently tracked
                    quotePerformance: {
                        totalQuotes: (kpis.pendingQuotes || 0) + (kpis.completedThisPeriod || 0), // Approx
                        approved: kpis.completedThisPeriod || 0, // Approx
                        pending: kpis.pendingQuotes || 0,
                        rejected: 0,
                        acceptanceRate: kpis.quoteAcceptanceRate || 0,
                        avgResponseTime: kpis.avgQuoteResponseTime || 0
                    }
                },

                // Clients Section Data - From Real DB
                clients: {
                    totalClients: kpis.totalClients || 0,
                    newThisMonth: clientGrowth.length > 0 ? clientGrowth[clientGrowth.length - 1].registered - (clientGrowth.length > 1 ? clientGrowth[clientGrowth.length - 2].registered : 0) : 0,
                    activeClients: kpis.registeredClients || 0,
                    growthRate: parseFloat(kpis.clientGrowth) || 0,
                    registeredClients: kpis.registeredClients || 0,
                    guestClients: kpis.guestClients || 0,
                    inactiveClients: (kpis.totalClients || 0) - (kpis.registeredClients || 0),
                    // Real data from new endpoints
                    topClients: clientStats.topClients,
                    acquisitionChannels: clientStats.acquisitionChannels,

                    // Calculated/Placeholder until more endpoints exist
                    avgProjectsPerClient: kpis.totalClients > 0 ? ((kpis.activeTasks + kpis.completedThisPeriod) / kpis.totalClients).toFixed(1) : 0,
                    avgLifetimeValue: kpis.totalClients > 0 ? (kpis.actualRevenue / kpis.totalClients).toFixed(0) : 0,
                    repeatClientRate: 0,
                    avgClientResponseTime: kpis.avgQuoteResponseTime || 0,
                    retentionRate: 100,
                    churnRate: 0,
                    avgClientTenure: 0,
                    satisfactionScore: 0
                },

                storage: storageStats,

                // Operations Section Data - Mock/Calculated for now
                operations: {
                    systemUptime: 99.9,
                    avgResponseTime: 120,
                    activeSessions: 1,
                    storageUsed: 45,
                    avgTaskDuration: kpis.avgCompletionTime || 0,
                    tasksPerDay: 0,
                    automationRate: 0,
                    apiResponseTime: 150,
                    dbQueryTime: 50,
                    pageLoadTime: 800,
                    errorRate: 0,
                    bandwidthUsed: 20,
                    apiCallsUsed: 0,
                    totalFiles: 0,
                    filesThisMonth: 0,
                    avgFileSize: 0,
                    storageGrowth: 0,
                    messagesSent: 0,
                    avgMessageResponseTime: 0,
                    unreadMessages: 0,
                    systemAlerts: []
                },
                lastUpdated: new Date()
            };

            console.log('📈 Setting analytics data:', analyticsData);
            setAnalyticsData(analyticsData);
        } catch (err) {
            console.error('❌ Analytics fetch error:', err);
            console.error('Error message:', err.message);
            console.error('Error response:', err.response?.data);
            console.error('Error status:', err.response?.status);

            // Fall back to mock data for demo purposes
            console.log('🔄 Falling back to mock data...');
            const mockData = {
                kpis: {
                    actualRevenue: 45000,
                    expectedRevenue: 52000,
                    collectionRate: 87,
                    revenueTrend: '+12%',
                    activeTasks: 24,
                    inProgress: 15,
                    pendingReview: 9,
                    tasksTrend: '+5%',
                    totalClients: 48,
                    registeredClients: 32,
                    guestClients: 16,
                    clientGrowth: '+8%',
                    quoteAcceptanceRate: 78,
                    avgQuoteResponseTime: 2,
                    pendingQuotes: 6,
                    quoteTrend: '+3%',
                    completedThisPeriod: 18,
                    avgCompletionTime: 5,
                    onTimeRate: 92,
                    completionTrend: '+10%',
                    outstanding: 12000,
                    overdue: 3500,
                    paidThisMonth: 28000,
                    paymentTrend: '-5%'
                },
                revenue: [
                    { period: 'Jan', expected: 35000, actual: 32000 },
                    { period: 'Feb', expected: 38000, actual: 36000 },
                    { period: 'Mar', expected: 42000, actual: 40000 },
                    { period: 'Apr', expected: 45000, actual: 43000 },
                    { period: 'May', expected: 48000, actual: 45000 },
                    { period: 'Jun', expected: 52000, actual: 45000 }
                ],
                pipeline: [
                    { stage: 'pending_quote', count: 8, conversion: 100 },
                    { stage: 'quote_sent', count: 6, conversion: 75 },
                    { stage: 'in_progress', count: 15, conversion: 83 },
                    { stage: 'review', count: 9, conversion: 60 },
                    { stage: 'completed', count: 18, conversion: 67 }
                ],
                clientGrowth: [
                    { period: 'Jan', registered: 20, guests: 8 },
                    { period: 'Feb', registered: 23, guests: 10 },
                    { period: 'Mar', registered: 26, guests: 12 },
                    { period: 'Apr', registered: 28, guests: 14 },
                    { period: 'May', registered: 30, guests: 15 },
                    { period: 'Jun', registered: 32, guests: 16 }
                ],
                taskStatus: [
                    { status: 'pending_quote', count: 8 },
                    { status: 'quote_sent', count: 6 },
                    { status: 'in_progress', count: 15 },
                    { status: 'review', count: 9 },
                    { status: 'completed', count: 18 }
                ],
                // Financial Section Data
                financial: {
                    totalRevenue: 45000,
                    expectedRevenue: 52000,
                    outstanding: 12000,
                    paidThisMonth: 28000,
                    revenueChange: '+12%',
                    paidChange: '+8%',
                    collectionRate: 87,
                    overdueCount: 5,
                    paid: 28000,
                    pending: 8500,
                    overdue: 3500,
                    avgDaysToPayment: 18,
                    overdueRate: 8,
                    revenueBreakdown: [
                        { category: 'Web Development', amount: 18000, percentage: 40 },
                        { category: 'Mobile Apps', amount: 13500, percentage: 30 },
                        { category: 'UI/UX Design', amount: 9000, percentage: 20 },
                        { category: 'Consulting', amount: 4500, percentage: 10 }
                    ],
                    paymentStatusByMonth: [
                        { month: 'Jan', paid: 25000, pending: 7000, overdue: 3000 },
                        { month: 'Feb', paid: 27000, pending: 8000, overdue: 3500 },
                        { month: 'Mar', paid: 26000, pending: 9000, overdue: 4000 },
                        { month: 'Apr', paid: 28000, pending: 8500, overdue: 3500 },
                        { month: 'May', paid: 29000, pending: 8000, overdue: 3000 },
                        { month: 'Jun', paid: 28000, pending: 8500, overdue: 3500 }
                    ],
                    revenueByClient: [
                        { client: 'TechCorp Inc', projectCount: 5, expected: 15000, paid: 13500, revenue: 15000 },
                        { client: 'StartupXYZ', projectCount: 3, expected: 8000, paid: 7200, revenue: 8000 },
                        { client: 'Enterprise Solutions', projectCount: 4, expected: 12000, paid: 10800, revenue: 12000 },
                        { client: 'Digital Agency', projectCount: 2, expected: 6000, paid: 5400, revenue: 6000 },
                        { client: 'E-commerce Co', projectCount: 3, expected: 7000, paid: 6300, revenue: 7000 }
                    ],
                    overduePayments: [
                        { client: 'TechCorp Inc', project: 'Website Redesign', amount: 1500, dueDate: '2026-01-15', daysOverdue: 28 },
                        { client: 'StartupXYZ', project: 'Mobile App', amount: 800, dueDate: '2026-01-20', daysOverdue: 23 },
                        { client: 'Digital Agency', project: 'Logo Design', amount: 600, dueDate: '2026-01-10', daysOverdue: 33 },
                        { client: 'E-commerce Co', project: 'API Integration', amount: 400, dueDate: '2026-02-01', daysOverdue: 11 },
                        { client: 'Enterprise Solutions', project: 'Database Migration', amount: 200, dueDate: '2026-02-05', daysOverdue: 7 }
                    ]
                },
                // Tasks Section Data
                tasks: {
                    activeTasks: 24,
                    completedThisMonth: 18,
                    avgCompletionTime: 5,
                    onTimeRate: 92,
                    statusDistribution: [
                        { status: 'Pending Quote', count: 8, percentage: 14 },
                        { status: 'Quote Sent', count: 6, percentage: 11 },
                        { status: 'In Progress', count: 15, percentage: 27 },
                        { status: 'Review', count: 9, percentage: 16 },
                        { status: 'Completed', count: 18, percentage: 32 }
                    ],
                    priorityBreakdown: [
                        { priority: 'Urgent', count: 3, percentage: 13 },
                        { priority: 'High', count: 8, percentage: 33 },
                        { priority: 'Medium', count: 10, percentage: 42 },
                        { priority: 'Low', count: 3, percentage: 13 }
                    ],
                    quotePerformance: {
                        totalQuotes: 14,
                        approved: 11,
                        pending: 6,
                        rejected: 3,
                        acceptanceRate: 78,
                        avgResponseTime: 2
                    }
                },
                // Clients Section Data
                clients: {
                    totalClients: 48,
                    newThisMonth: 4,
                    activeClients: 32,
                    growthRate: 8,
                    registeredClients: 32,
                    guestClients: 16,
                    inactiveClients: 16,
                    topClients: [
                        { name: 'TechCorp Inc', projectCount: 5, revenue: 15000, rating: 4.8 },
                        { name: 'Enterprise Solutions', projectCount: 4, revenue: 12000, rating: 4.9 },
                        { name: 'StartupXYZ', projectCount: 3, revenue: 8000, rating: 4.6 },
                        { name: 'E-commerce Co', projectCount: 3, revenue: 7000, rating: 4.7 },
                        { name: 'Digital Agency', projectCount: 2, revenue: 6000, rating: 4.5 },
                        { name: 'FinTech Solutions', projectCount: 2, revenue: 5500, rating: 4.8 },
                        { name: 'HealthTech Inc', projectCount: 2, revenue: 5000, rating: 4.6 },
                        { name: 'EduPlatform', projectCount: 1, revenue: 4500, rating: 4.9 },
                        { name: 'RetailCo', projectCount: 1, revenue: 4000, rating: 4.4 },
                        { name: 'MediaGroup', projectCount: 1, revenue: 3500, rating: 4.7 }
                    ],
                    avgProjectsPerClient: 2.3,
                    avgLifetimeValue: 3750,
                    repeatClientRate: 65,
                    avgClientResponseTime: 4,
                    retentionRate: 85,
                    churnRate: 15,
                    avgClientTenure: 8,
                    satisfactionScore: 4.7,
                    acquisitionChannels: [
                        { name: 'Referrals', count: 18, percentage: 38 },
                        { name: 'Website', count: 14, percentage: 29 },
                        { name: 'Social Media', count: 10, percentage: 21 },
                        { name: 'Direct Outreach', count: 6, percentage: 13 }
                    ]
                },
                storage: {
                    totalFiles: 1247,
                    usedStorage: 3.4 * 1024 * 1024 * 1024, // 3.4GB
                    storageLimit: 5 * 1024 * 1024 * 1024, // 5GB
                    utilization: 68,
                    fileTypes: [
                        { file_type: 'image/jpeg', count: 450, size: 1.2 * 1024 * 1024 * 1024 },
                        { file_type: 'application/pdf', count: 320, size: 0.8 * 1024 * 1024 * 1024 },
                        { file_type: 'image/png', count: 210, size: 0.6 * 1024 * 1024 * 1024 },
                        { file_type: 'application/zip', count: 50, size: 0.5 * 1024 * 1024 * 1024 },
                        { file_type: 'text/plain', count: 217, size: 0.3 * 1024 * 1024 * 1024 }
                    ],
                    storageTrend: [
                        { period: '2025-08', size: 0.2 * 1024 * 1024 * 1024, total: 1.5 * 1024 * 1024 * 1024, count: 15 },
                        { period: '2025-09', size: 0.3 * 1024 * 1024 * 1024, total: 1.8 * 1024 * 1024 * 1024, count: 20 },
                        { period: '2025-10', size: 0.4 * 1024 * 1024 * 1024, total: 2.2 * 1024 * 1024 * 1024, count: 25 },
                        { period: '2025-11', size: 0.3 * 1024 * 1024 * 1024, total: 2.5 * 1024 * 1024 * 1024, count: 22 },
                        { period: '2025-12', size: 0.5 * 1024 * 1024 * 1024, total: 3.0 * 1024 * 1024 * 1024, count: 30 },
                        { period: '2026-01', size: 0.4 * 1024 * 1024 * 1024, total: 3.4 * 1024 * 1024 * 1024, count: 28 }
                    ]
                },
                // Operations Section Data
                operations: {
                    systemUptime: 99.8,
                    avgResponseTime: 245,
                    activeSessions: 12,
                    storageUsed: 68,
                    avgTaskDuration: 5,
                    tasksPerDay: 3.2,
                    automationRate: 45,
                    apiResponseTime: 180,
                    dbQueryTime: 45,
                    pageLoadTime: 1200,
                    errorRate: 0.5,
                    bandwidthUsed: 52,
                    apiCallsUsed: 38,
                    totalFiles: 1247,
                    filesThisMonth: 89,
                    avgFileSize: 2.3,
                    storageGrowth: 12,
                    messagesSent: 342,
                    avgMessageResponseTime: 2.5,
                    unreadMessages: 8,
                    systemAlerts: [
                        { title: 'Storage Warning', message: 'Storage usage above 65%', time: '2 hours ago' },
                        { title: 'API Rate Limit', message: 'Approaching API rate limit', time: '5 hours ago' }
                    ]
                },
                lastUpdated: new Date()
            };

            setAnalyticsData(mockData);
            setError('Using demo data - backend connection unavailable');
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

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
