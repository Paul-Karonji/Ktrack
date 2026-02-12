import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const EngagementGauge = ({ score }) => {
    // Score is 0-100
    const value = score || 0;

    // Determine color based on score
    let color = '#10b981'; // Green
    if (value < 33) color = '#ef4444'; // Red
    else if (value < 66) color = '#f59e0b'; // Orange

    const data = [
        { name: 'Score', value: value },
        { name: 'Remaining', value: 100 - value }
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center">
            <h3 className="text-lg font-bold text-gray-800 mb-2 w-full text-left">Client Retention Rate</h3>

            <div className="w-full h-[200px] relative mt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="70%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell key="cell-score" fill={color} />
                            <Cell key="cell-remaining" fill="#f3f4f6" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                {/* Centered Score */}
                <div className="absolute top-[65%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-4xl font-bold text-gray-900">{value}%</p>
                    <p className="text-xs text-gray-500">Retention</p>
                </div>
            </div>

            <div className="mt-2 text-center">
                <p className="text-sm text-gray-500">Clients with multiple projects</p>
            </div>

            <div className="mt-6 w-full grid grid-cols-3 text-center text-xs text-gray-400">
                <div className={value < 33 ? "font-bold text-red-500" : ""}>Churn Risk</div>
                <div className={value >= 33 && value < 66 ? "font-bold text-orange-500" : ""}>Stable</div>
                <div className={value >= 66 ? "font-bold text-green-500" : ""}>Loyal</div>
            </div>
        </div>
    );
};

export default EngagementGauge;
