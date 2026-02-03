import React from 'react';

const StatCard = ({ title, value, icon: Icon, color, subtitle, badge, onClick, active }) => {
    // Map abstract color names to gradient classes
    const colorClasses = {
        indigo: {
            border: 'border-indigo-500',
            iconBg: 'bg-gradient-to-br from-indigo-100 to-indigo-50',
            iconColor: 'text-indigo-600',
            badgeBg: 'bg-indigo-100',
            badgeText: 'text-indigo-600',
            activeRing: 'ring-2 ring-indigo-500 ring-offset-2'
        },
        blue: {
            border: 'border-blue-500',
            iconBg: 'bg-gradient-to-br from-blue-100 to-blue-50',
            iconColor: 'text-blue-600',
            badgeBg: 'bg-blue-100',
            badgeText: 'text-blue-600',
            activeRing: 'ring-2 ring-blue-500 ring-offset-2'
        },
        green: {
            border: 'border-emerald-500',
            iconBg: 'bg-gradient-to-br from-emerald-100 to-emerald-50',
            iconColor: 'text-emerald-600',
            badgeBg: 'bg-emerald-100',
            badgeText: 'text-emerald-600',
            activeRing: 'ring-2 ring-emerald-500 ring-offset-2'
        },
        orange: {
            border: 'border-orange-500',
            iconBg: 'bg-gradient-to-br from-orange-100 to-orange-50',
            iconColor: 'text-orange-600',
            badgeBg: 'bg-orange-100',
            badgeText: 'text-orange-600',
            activeRing: 'ring-2 ring-orange-500 ring-offset-2'
        },
        purple: {
            border: 'border-purple-500',
            iconBg: 'bg-gradient-to-br from-purple-100 to-purple-50',
            iconColor: 'text-purple-600',
            badgeBg: 'bg-purple-100',
            badgeText: 'text-purple-600',
            activeRing: 'ring-2 ring-purple-500 ring-offset-2'
        }
    };

    // Fallback if full tailwind class string was passed instead of key (legacy support)
    const colors = colorClasses[color] || colorClasses.indigo;

    return (
        <div
            onClick={onClick}
            className={`
                bg-white rounded-2xl shadow-lg p-6 border-l-4 ${colors.border} 
                transform transition-all duration-300 
                ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-xl' : ''}
                ${active ? `${colors.activeRing} scale-105 shadow-xl` : 'hover:scale-102'}
            `}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${colors.iconBg} rounded-xl shadow-inner`}>
                    <Icon className={colors.iconColor} size={28} />
                </div>
                {badge && (
                    <span className={`text-xs font-bold ${colors.badgeBg} ${colors.badgeText} px-3 py-1 rounded-full uppercase tracking-wider`}>
                        {badge}
                    </span>
                )}
            </div>
            <h3 className="text-gray-500 text-sm font-semibold mb-1 uppercase tracking-wide">{title}</h3>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-2 font-medium">{subtitle}</p>}
        </div>
    );
};

export default StatCard;
