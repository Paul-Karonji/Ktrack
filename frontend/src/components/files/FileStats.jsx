import React from 'react';
import { HardDrive, File, TrendingUp, Calendar } from 'lucide-react';

const FileStats = ({ stats, loading }) => {
    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const formatFileType = (type) => {
        if (!type || type === 'N/A') return 'None';
        if (type.includes('pdf')) return 'PDF';
        if (type.includes('word')) return 'Word';
        if (type.includes('image')) return 'Images';
        if (type.includes('sheet')) return 'Excel';
        return type.split('/')[1]?.toUpperCase() || 'Files';
    };

    const statCards = [
        {
            icon: File,
            label: 'Total Files',
            value: loading ? '...' : stats?.totalFiles || 0,
            color: 'indigo',
            bgGradient: 'from-indigo-500 to-purple-500'
        },
        {
            icon: HardDrive,
            label: 'Storage Used',
            value: loading ? '...' : formatBytes(stats?.totalStorage),
            color: 'blue',
            bgGradient: 'from-blue-500 to-cyan-500'
        },
        {
            icon: Calendar,
            label: 'This Month',
            value: loading ? '...' : stats?.filesThisMonth || 0,
            color: 'green',
            bgGradient: 'from-green-500 to-emerald-500'
        },
        {
            icon: TrendingUp,
            label: 'Most Used',
            value: loading ? '...' : formatFileType(stats?.mostUsedType),
            color: 'orange',
            bgGradient: 'from-orange-500 to-amber-500'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={index}
                        className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:shadow-lg transition-all"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 bg-gradient-to-br ${stat.bgGradient} rounded-xl`}>
                                <Icon size={24} className="text-white" />
                            </div>
                        </div>
                        <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
                        <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                );
            })}
        </div>
    );
};

export default FileStats;
