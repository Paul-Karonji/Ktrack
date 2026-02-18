import React from 'react';

const gradientMap = {
    indigo: 'from-indigo-500 to-violet-600',
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-emerald-500 to-teal-500',
    orange: 'from-orange-400 to-amber-500',
    purple: 'from-violet-500 to-purple-600',
    rose: 'from-rose-400 to-pink-500',
};

const ringMap = {
    indigo: 'ring-indigo-400',
    blue: 'ring-blue-400',
    green: 'ring-emerald-400',
    orange: 'ring-orange-400',
    purple: 'ring-violet-400',
    rose: 'ring-rose-400',
};

const shadowMap = {
    indigo: 'hover:shadow-indigo-200',
    blue: 'hover:shadow-blue-200',
    green: 'hover:shadow-emerald-200',
    orange: 'hover:shadow-orange-200',
    purple: 'hover:shadow-violet-200',
    rose: 'hover:shadow-rose-200',
};

// variant="gradient" → coloured card (client dashboard)
// variant="default"  → white card (admin dashboard, existing behaviour)
const StatCard = ({ title, value, icon: Icon, color = 'indigo', subtitle, badge, onClick, active, variant = 'default' }) => {
    const gradient = gradientMap[color] || gradientMap.indigo;
    const ring = ringMap[color] || ringMap.indigo;
    const shadow = shadowMap[color] || shadowMap.indigo;

    if (variant === 'gradient') {
        return (
            <div
                onClick={onClick}
                className={`
                    relative overflow-hidden rounded-xl md:rounded-2xl p-4 md:p-5
                    bg-gradient-to-br ${gradient}
                    text-white shadow-lg
                    transform transition-all duration-300
                    ${onClick ? `cursor-pointer hover:-translate-y-1 hover:shadow-xl ${shadow}` : ''}
                    ${active ? `ring-2 ${ring} ring-offset-2 -translate-y-1 shadow-xl` : ''}
                `}
            >
                {/* Decorative circles */}
                <div className="absolute -top-3 -right-3 w-16 h-16 md:w-24 md:h-24 bg-white/10 rounded-full" />
                <div className="absolute -bottom-4 -left-4 w-14 h-14 md:w-20 md:h-20 bg-white/10 rounded-full" />

                <div className="relative flex items-start justify-between mb-3">
                    <div className="p-2 md:p-2.5 bg-white/20 rounded-lg md:rounded-xl backdrop-blur-sm">
                        <Icon size={18} className="text-white" strokeWidth={2.5} />
                    </div>
                    {badge && (
                        <span className="text-[9px] md:text-[10px] font-bold bg-white/25 text-white px-1.5 md:px-2 py-0.5 md:py-1 rounded-full uppercase tracking-wider leading-none">
                            {badge}
                        </span>
                    )}
                </div>
                <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wider mb-0.5">{title}</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white animate-count-up truncate">{value}</p>
                {subtitle && <p className="text-white/60 text-[10px] md:text-xs mt-1 font-medium truncate">{subtitle}</p>}
            </div>
        );
    }

    // ── Default (white) variant — unchanged admin behaviour ──────────────────
    const colorClasses = {
        indigo: { border: 'border-indigo-200', iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600', badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700', activeRing: 'ring-2 ring-indigo-400 ring-offset-2', hoverShadow: 'hover:shadow-indigo-100' },
        blue: { border: 'border-blue-200', iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', activeRing: 'ring-2 ring-blue-400 ring-offset-2', hoverShadow: 'hover:shadow-blue-100' },
        green: { border: 'border-emerald-200', iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', activeRing: 'ring-2 ring-emerald-400 ring-offset-2', hoverShadow: 'hover:shadow-emerald-100' },
        orange: { border: 'border-orange-200', iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600', badgeBg: 'bg-orange-100', badgeText: 'text-orange-700', activeRing: 'ring-2 ring-orange-400 ring-offset-2', hoverShadow: 'hover:shadow-orange-100' },
        purple: { border: 'border-purple-200', iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700', activeRing: 'ring-2 ring-purple-400 ring-offset-2', hoverShadow: 'hover:shadow-purple-100' },
    };
    const colors = colorClasses[color] || colorClasses.indigo;

    return (
        <div
            onClick={onClick}
            className={`
                bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border ${colors.border}
                p-8 transform transition-all duration-300
                ${onClick ? `cursor-pointer hover:-translate-y-1 hover:shadow-lg ${colors.hoverShadow}` : ''}
                ${active ? `${colors.activeRing} -translate-y-1 shadow-lg` : ''}
            `}
        >
            <div className="flex items-start justify-between mb-6">
                <div className={`p-4 ${colors.iconBg} rounded-2xl shadow-lg`}>
                    <Icon className="text-white" size={32} strokeWidth={2.5} />
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
