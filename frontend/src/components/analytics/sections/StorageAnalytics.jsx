import React from 'react';
import { useAnalytics } from '../../../context/AnalyticsContext';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
    AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
    HardDrive, File, Database, Cloud,
    TrendingUp, AlertTriangle, FileText, Image, Film, Music
} from 'lucide-react';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const StorageAnalytics = () => {
    const { analyticsData, loading } = useAnalytics();

    if (loading || !analyticsData?.storage) {
        return <div className="p-8 text-center text-gray-500">Loading storage analytics...</div>;
    }

    const {
        totalFiles,
        usedStorage,
        storageLimit,
        utilization,
        fileTypes,
        storageTrend
    } = analyticsData.storage;

    const remainingStorage = storageLimit - usedStorage;

    // Helper to get icon for file type
    const getFileIcon = (type) => {
        if (type.includes('image')) return <Image size={16} />;
        if (type.includes('video')) return <Film size={16} />;
        if (type.includes('audio')) return <Music size={16} />;
        if (type.includes('pdf') || type.includes('text')) return <FileText size={16} />;
        return <File size={16} />;
    };

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Used Storage */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Used Storage</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatBytes(usedStorage)}</h3>
                            <p className="text-sm text-gray-500 mt-1">of {formatBytes(storageLimit)}</p>
                        </div>
                        <div className="p-3 bg-indigo-50 rounded-lg">
                            <Database className="w-6 h-6 text-indigo-600" />
                        </div>
                    </div>
                </div>

                {/* Total Files */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Files</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">{totalFiles.toLocaleString()}</h3>
                            <p className="text-sm text-green-600 flex items-center mt-1">
                                <TrendingUp size={14} className="mr-1" />
                                +{analyticsData.operations?.filesThisMonth || 0} this month
                            </p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <File className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                {/* Storage Utilization */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Utilization</p>
                            <h3 className={`text-2xl font-bold mt-2 ${utilization > 90 ? 'text-red-600' : 'text-gray-900'}`}>
                                {utilization}%
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">{formatBytes(remainingStorage)} free</p>
                        </div>
                        <div className={`p-3 rounded-lg ${utilization > 90 ? 'bg-red-50' : 'bg-green-50'}`}>
                            {utilization > 90 ? (
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            ) : (
                                <HardDrive className="w-6 h-6 text-green-600" />
                            )}
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                        <div
                            className={`h-2 rounded-full transition-all duration-500 ${utilization > 90 ? 'bg-red-500' : utilization > 70 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                            style={{ width: `${utilization}%` }}
                        />
                    </div>
                </div>

                {/* Cloud Status (Mock) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Cloud Status</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">Active</h3>
                            <p className="text-sm text-gray-500 mt-1">R2 Storage Synced</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                            <Cloud className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* File Type Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">File Type Distribution</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={fileTypes}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="size"
                                >
                                    {fileTypes.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    formatter={(value) => formatBytes(value)}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* List Breakdown */}
                    <div className="mt-4 space-y-3">
                        {fileTypes.map((type, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center text-sm text-gray-600">
                                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                    <span className="flex items-center gap-2">
                                        {getFileIcon(type.file_type)}
                                        {type.file_type}
                                    </span>
                                </div>
                                <div className="text-sm font-medium">
                                    {formatBytes(type.size)} ({type.count} files)
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Storage Growth Trend */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Storage Growth</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={storageTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="period"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    tickFormatter={(value) => formatBytes(value, 0)}
                                />
                                <RechartsTooltip
                                    formatter={(value) => formatBytes(value)}
                                    labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#4F46E5"
                                    fill="rgba(79, 70, 229, 0.1)"
                                    strokeWidth={3}
                                    name="Total Storage"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 text-center text-sm text-gray-500">
                        Cumulative storage usage over the selected period
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StorageAnalytics;
