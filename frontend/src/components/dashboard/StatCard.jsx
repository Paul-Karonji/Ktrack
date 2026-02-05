import React from 'react';

const StatCard = ({ title, value, icon: Icon, color, subtitle, badge, onClick, active }) => {
    // Map abstract color names to gradient classes
    const colorClasses = {
        indigo: {
            border: 'border-indigo-200',
            iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
            iconColor: 'text-white',
            badgeBg: 'bg-indigo-100',
            badgeText: 'text-indigo-700',
            activeRing: 'ring-2 ring-indigo-400 ring-offset-2',
            hoverShadow: 'hover:shadow-indigo-100'
        },
        blue: {
            border: 'border-blue-200',
            iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
            iconColor: 'text-white',
            badgeBg: 'bg-blue-100',
            badgeText: 'text-blue-700',
            activeRing: 'ring-2 ring-blue-400 ring-offset-2',
            hoverShadow: 'hover:shadow-blue-100'
        },
        green: {
            border: 'border-emerald-200',
            iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
            iconColor: 'text-white',
            badgeBg: 'bg-emerald-100',
            badgeText: 'text-emerald-700',
            activeRing: 'ring-2 ring-emerald-400 ring-offset-2',
            hoverShadow: 'hover:shadow-emerald-100'
        },
        orange: {
            border: 'border-orange-200',
            iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
            iconColor: 'text-white',
            badgeBg: 'bg-orange-100',
            badgeText: 'text-orange-700',
            activeRing: 'ring-2 ring-orange-400 ring-offset-2',
            hoverShadow: 'hover:shadow-orange-100'
        },
        purple: {
            border: 'border-purple-200',
            iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
            iconColor: 'text-white',
            badgeBg: 'bg-purple-100',
            badgeText: 'text-purple-700',
            activeRing: 'ring-2 ring-purple-400 ring-offset-2',
            hoverShadow: 'hover:shadow-purple-100'
        }
    };

    // Fallback if full tailwind class string was passed instead of key (legacy support)
    const colors = colorClasses[color] || colorClasses.indigo;

    return (
        <div
            onClick={onClick}
            className={`
                bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border ${colors.border}
                p-8
                transform transition-all duration-300 
                ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg' : ''}
                ${active ? `${colors.activeRing} -translate-y-1 shadow-lg` : ''}
                ${colors.hoverShadow}
            `}
        >
            <div className="flex items-start justify-between mb-6">
                <div className={`p-4 ${colors.iconBg} rounded-2xl shadow-lg`}>
                    <Icon className={colors.iconColor} size={32} strokeWidth={2.5} />
                </div>
                {badge && (
                    <span className={`text-xs font-bold ${colors.badgeBg} ${colors.badgeText} px-3 py-1.5 rounded-full uppercase tracking-wider`}>
                        {badge}
                    </span>
                )}
            </div>
            <h3 className="text-gray-500 text-sm font-semibold mb-2 uppercase tracking-wide">{title}</h3>
            <p className="text-5xl font-bold text-gray-900 mb-1">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-2 font-medium">{subtitle}</p>}
        </div>
    );
};

export default StatCard;
