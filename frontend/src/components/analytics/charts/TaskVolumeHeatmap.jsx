import React, { useState, useEffect } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Tooltip } from 'react-tooltip';
import { apiService } from '../../../services/api';

const TaskVolumeHeatmap = ({ dateRange }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Determine start/end for heatmap (default to 1 year or range)
                // Heatmap usually looks best with a full year context
                const response = await apiService.analytics.getActivityHeatmap({
                    startDate: dateRange.start.toISOString(),
                    endDate: dateRange.end.toISOString()
                });
                setData(response || []);
            } catch (error) {
                console.error('Failed to fetch heatmap', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange]);

    if (loading) return <div className="h-48 flex items-center justify-center text-gray-400">Loading activity...</div>;

    // Shift dates for heatmap display
    const today = new Date();
    const startDate = new Date();
    startDate.setFullYear(today.getFullYear() - 1);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                Activity Heatmap
                <span className="text-xs font-normal text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">Last 12 Months</span>
            </h3>

            <div className="relative">
                <CalendarHeatmap
                    startDate={startDate}
                    endDate={today}
                    values={data}
                    classForValue={(value) => {
                        if (!value) {
                            return 'fill-gray-100';
                        }
                        // Simple scale logic
                        return `fill-indigo-${Math.min(value.count * 200, 800)}`;
                        // Note: CalendarHeatmap uses classes like `color-scale-1` etc by default.
                        // We need to override CSS or use the class mapping.
                        // Actually, better to use standard classes and custom styles.
                    }}
                    tooltipDataAttrs={value => {
                        return {
                            'data-tooltip-id': 'heatmap-tooltip',
                            'data-tooltip-content': value.date ? `${value.date}: ${value.count} tasks` : 'No activity',
                        };
                    }}
                    showWeekdayLabels
                />
                <Tooltip id="heatmap-tooltip" />
            </div>

            {/* Custom Legend/Styles injection because we can't easily import CSS modules here */}
            <style>{`
                .react-calendar-heatmap text {
                    font-size: 10px;
                    fill: #9CA3AF;
                }
                .react-calendar-heatmap .react-calendar-heatmap-month-labels {
                    display: none; /* Hide top labels if messy on mobile */
                }
                @media (min-width: 768px) {
                    .react-calendar-heatmap .react-calendar-heatmap-month-labels {
                        display: block;
                    }
                }
                /* Custom Color Scale */
                .fill-gray-100 { fill: #F3F4F6; }
                .fill-indigo-200 { fill: #C7D2FE; } // 1 task
                .fill-indigo-400 { fill: #818CF8; } // 2 tasks
                .fill-indigo-600 { fill: #4F46E5; } // 3 tasks
                .fill-indigo-800 { fill: #3730A3; } // 4+ tasks
            `}</style>
        </div>
    );
};

export default TaskVolumeHeatmap;
