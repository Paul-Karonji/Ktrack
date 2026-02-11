import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

const DateRangeFilter = ({ value, onChange }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [showCustom, setShowCustom] = useState(false);
    const dropdownRef = useRef(null);

    const presets = [
        { label: 'Today', days: 0 },
        { label: 'Last 7 days', days: 7 },
        { label: 'Last 30 days', days: 30 },
        { label: 'Last 90 days', days: 90 },
        { label: 'This Year', days: 365 },
        { label: 'Custom Range', days: null }
    ];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePresetClick = (days) => {
        if (days === null) {
            setShowCustom(true);
            return;
        }

        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        onChange({ start, end });
        setShowDropdown(false);
        setShowCustom(false);
    };

    const handleCustomDateChange = (type, dateString) => {
        const newDate = new Date(dateString);
        if (type === 'start') {
            onChange({ ...value, start: newDate });
        } else {
            onChange({ ...value, end: newDate });
        }
    };

    const formatDateRange = () => {
        if (!value?.start || !value?.end) return 'Select Date Range';

        const startStr = value.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = value.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return `${startStr} - ${endStr}`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white border border-white/20"
            >
                <Calendar size={18} />
                <span className="hidden sm:inline text-sm font-medium">
                    {formatDateRange()}
                </span>
                <ChevronDown size={16} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Quick Select</p>
                        <div className="space-y-1">
                            {presets.map((preset, index) => (
                                <button
                                    key={index}
                                    onClick={() => handlePresetClick(preset.days)}
                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-indigo-50 text-sm text-gray-700 hover:text-indigo-700 transition-colors"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Date Inputs */}
                    {showCustom && (
                        <div className="border-t border-gray-200 p-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Custom Range</p>
                            <div className="space-y-2">
                                <div>
                                    <label className="text-xs text-gray-600 block mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={value?.start?.toISOString().split('T')[0] || ''}
                                        onChange={(e) => handleCustomDateChange('start', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-600 block mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={value?.end?.toISOString().split('T')[0] || ''}
                                        onChange={(e) => handleCustomDateChange('end', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <button
                                    onClick={() => setShowDropdown(false)}
                                    className="w-full px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DateRangeFilter;
