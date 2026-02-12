import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, differenceInDays } from 'date-fns';
import { apiService } from '../../../services/api';

const WorkflowTimeline = ({ dateRange }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await apiService.analytics.getProjectTimeline({
                    startDate: dateRange.start.toISOString(),
                    endDate: dateRange.end.toISOString()
                });

                // Transform for Recharts:
                // We need a "stacked" bar where the first stack is transparent (start time offset)
                // and the second stack is the duration.
                // However, Recharts BarChart with XAxis type="number" requires numeric data.
                // We'll convert dates to timestamps or days from a base date.

                if (!response || response.length === 0) {
                    setData([]);
                    setLoading(false);
                    return;
                }

                // Find global min date to normalize
                const minDate = Math.min(...response.map(d => new Date(d.start).getTime()));

                const processData = response.map(item => {
                    const start = new Date(item.start).getTime();
                    const end = new Date(item.end).getTime();
                    const duration = end - start;
                    const offset = start - minDate;

                    return {
                        ...item,
                        minDate, // store for tooltip
                        offsetDuration: offset, // Transparent bar
                        realDuration: duration  // Colored bar
                    };
                });

                setData(processData);
            } catch (error) {
                console.error('Failed to fetch timeline', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange]);

    if (loading) return <div className="h-64 flex items-center justify-center text-gray-400">Loading timeline...</div>;
    if (data.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400">No project history in this period</div>;

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[1]?.payload || payload[0]?.payload; // payload[1] is the visible bar
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl text-xs">
                    <p className="font-bold text-gray-800">{data.name}</p>
                    <p className="text-gray-500">{data.client}</p>
                    <div className="mt-2 text-gray-600 space-y-1">
                        <p>Start: {format(new Date(data.start), 'MMM dd, yyyy')}</p>
                        <p>End: {format(new Date(data.end), 'MMM dd, yyyy')}</p>
                        <p className="font-semibold text-indigo-600">
                            Duration: {differenceInDays(new Date(data.end), new Date(data.start))} days
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Recent Project Timeline</h3>
            <div className="h-[400px]">
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                        data={data}
                        layout="vertical"
                        barSize={20}
                        margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                        <XAxis
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            tickFormatter={(unixTime) => {
                                // Reconstruct date from offset? No, the axis is duration based? 
                                // Actually, if we stacked offset + duration, the total length is correct relative to start.
                                // But the generic axis labels won't be dates unless we format them.
                                // Since we centered on 0 being minDate, checking exact tick value is hard.
                                // Let's just hide ticks or simpler view.
                                return '';
                            }}
                            hide // Hide X axis for cleaner look, tooltip has dates
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={100}
                            tick={{ fontSize: 11, fill: '#6B7280' }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />

                        {/* Transparent Bar for Offset */}
                        <Bar dataKey="offsetDuration" stackId="a" fill="transparent" />

                        {/* Visible Bar for Duration */}
                        <Bar
                            dataKey="realDuration"
                            stackId="a"
                            fill="#6366f1"
                            radius={[0, 4, 4, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default WorkflowTimeline;
