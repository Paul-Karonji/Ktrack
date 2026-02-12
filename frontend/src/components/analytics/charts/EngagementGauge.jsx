import React from 'react';
import GaugeChart from 'react-gauge-chart';

const EngagementGauge = ({ score }) => {
    // Score is 0-100, GaugeChart expects 0-1
    const percent = (score || 0) / 100;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center">
            <h3 className="text-lg font-bold text-gray-800 mb-2 w-full text-left">Client Retention Rate</h3>

            <div className="w-full max-w-[250px] mt-4">
                <GaugeChart
                    id="retention-gauge"
                    nrOfLevels={3}
                    colors={['#ef4444', '#f59e0b', '#10b981']}
                    arcWidth={0.3}
                    percent={percent}
                    textColor="#1f2937"
                    needleColor="#4b5563"
                    needleBaseColor="#4b5563"
                    formatTextValue={val => val + '%'}
                />
            </div>

            <div className="text-center mt-4">
                <p className="text-3xl font-bold text-gray-900">{score}%</p>
                <p className="text-sm text-gray-500 mt-1">Clients with multiple projects</p>
            </div>

            <div className="mt-6 w-full grid grid-cols-3 text-center text-xs text-gray-400">
                <div>Churn Risk</div>
                <div>Stable</div>
                <div>Loyal</div>
            </div>
        </div>
    );
};

export default EngagementGauge;
