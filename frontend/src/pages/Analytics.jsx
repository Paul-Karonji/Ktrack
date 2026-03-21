import React, { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { BarChart3, RefreshCw, DollarSign, CheckSquare, Users, HardDrive, Menu } from 'lucide-react';
import ExecutiveKPICards from '../components/analytics/ExecutiveKPICards';
import DateRangeFilter from '../components/analytics/DateRangeFilter';
import RefreshControl from '../components/analytics/RefreshControl';
import ExportOptions from '../components/analytics/ExportOptions';
import RevenueTrendsChart from '../components/analytics/charts/RevenueTrendsChart';
import TaskPipelineFunnel from '../components/analytics/charts/TaskPipelineFunnel';
import ClientGrowthChart from '../components/analytics/charts/ClientGrowthChart';
import TaskStatusDonut from '../components/analytics/charts/TaskStatusDonut';
import FinancialSection from '../components/analytics/sections/FinancialSection';
import TaskSection from '../components/analytics/sections/TaskSection';
import ClientSection from '../components/analytics/sections/ClientSection';
import StorageAnalytics from '../components/analytics/sections/StorageAnalytics';
import { useAnalytics } from '../context/AnalyticsContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';

const Analytics = () => {
    const { user, logout } = useAuth();
    const { openSidebar } = useNavigation();
    const [activeTab, setActiveTab] = useState('overview');

    const {
        dateRange,
        setDateRange,
        refreshInterval,
        setRefreshInterval,
        analyticsData,
        loading,
        refresh
    } = useAnalytics();

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'financial', label: 'Financial', icon: DollarSign },
        { id: 'tasks', label: 'Tasks', icon: CheckSquare },
        { id: 'clients', label: 'Clients', icon: Users },
        { id: 'storage', label: 'Storage', icon: HardDrive }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar user={user} onLogout={logout} />

            <div className="lg:ml-64 min-h-screen transition-all duration-300">
                <div className="p-3 md:p-6 lg:p-8 max-w-[1920px] mx-auto space-y-6 overflow-x-hidden">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 md:p-8 text-white relative">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <button
                                        onClick={openSidebar}
                                        className="lg:hidden p-1 hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                        <Menu size={28} className="text-white" />
                                    </button>
                                    <BarChart3 size={32} className="hidden lg:block" />
                                    <h1 className="text-2xl md:text-4xl font-bold">Analytics Dashboard</h1>
                                </div>
                                <p className="text-indigo-100">Comprehensive business intelligence and insights</p>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 w-full sm:w-auto">
                                <DateRangeFilter value={dateRange} onChange={setDateRange} />
                                <RefreshControl
                                    interval={refreshInterval}
                                    onChange={setRefreshInterval}
                                    onManualRefresh={refresh}
                                    lastUpdated={analyticsData?.lastUpdated}
                                />
                                <ExportOptions data={analyticsData} filename="ktrack-analytics" />
                            </div>
                        </div>
                    </div>

                    {loading && (
                        <div className="bg-white rounded-xl shadow p-8 text-center">
                            <RefreshCw className="animate-spin mx-auto mb-4 text-indigo-600" size={48} />
                            <p className="text-gray-600">Loading analytics data...</p>
                        </div>
                    )}

                    {!loading && analyticsData && (
                        <>
                            <ExecutiveKPICards data={analyticsData.kpis} />

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                <div className="border-b border-gray-200 overflow-x-auto">
                                    <nav className="flex space-x-1 p-2" aria-label="Tabs">
                                        {tabs.map((tab) => {
                                            const Icon = tab.icon;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id)}
                                                    className={`
                                                        flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm
                                                        whitespace-nowrap transition-all
                                                        ${activeTab === tab.id
                                                            ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                        }
                                                    `}
                                                >
                                                    <Icon size={18} />
                                                    <span className="hidden sm:inline">{tab.label}</span>
                                                </button>
                                            );
                                        })}
                                    </nav>
                                </div>

                                <div className="p-6">
                                    {activeTab === 'overview' && (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                <RevenueTrendsChart data={analyticsData.revenue} />
                                                <TaskPipelineFunnel data={analyticsData.pipeline} />
                                                <ClientGrowthChart data={analyticsData.clientGrowth} />
                                                <TaskStatusDonut data={analyticsData.taskStatus} />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'financial' && (
                                        <FinancialSection data={analyticsData.financial} />
                                    )}

                                    {activeTab === 'tasks' && (
                                        <TaskSection data={analyticsData.tasks} dateRange={dateRange} />
                                    )}

                                    {activeTab === 'clients' && (
                                        <ClientSection data={analyticsData.clients} dateRange={dateRange} />
                                    )}

                                    {activeTab === 'storage' && (
                                        <StorageAnalytics />
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
