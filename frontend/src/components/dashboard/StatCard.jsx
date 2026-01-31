import React from 'react';

const StatCard = ({ title, value, icon: Icon, color, subtitle, badge }) => {
    const colorClasses = {
        indigo: {
            border: 'border-indigo-500',
            iconBg: 'bg-indigo-100',
            iconColor: 'text-indigo-600',
            badgeBg: 'bg-indigo-100',
            badgeText: 'text-indigo-600'
        },
        green: {
            border: 'border-green-500',
            iconBg: 'bg-green-100',
            iconColor: 'text-green-600',
            badgeBg: 'bg-green-100',
            badgeText: 'text-green-600'
        },
        orange: {
            border: 'border-orange-500',
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-600',
            badgeBg: 'bg-orange-100',
            badgeText: 'text-orange-600'
        },
        purple: {
            border: 'border-purple-500',
            iconBg: 'bg-purple-100',
            iconColor: 'text-purple-600',
            badgeBg: 'bg-purple-100',
            badgeText: 'text-purple-600'
        }
    };

    const colors = colorClasses[color] || colorClasses.indigo;

    return (
        <div className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${colors.border} transform transition-all hover:scale-105 hover:shadow-xl`}>
            <div className="flex items-center justify-between mb-2">
                <div className={`p-3 ${colors.iconBg} rounded-lg`}>
                    <Icon className={colors.iconColor} size={24} />
                </div>
                {badge && (
                    <span className={`text-xs font-semibold ${colors.badgeBg} ${colors.badgeText} px-2 py-1 rounded-full`}>
                        {badge}
                    </span>
                )}
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
    );
};

export default StatCard;
