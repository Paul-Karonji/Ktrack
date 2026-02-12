import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { subDays, startOfYear, startOfMonth, subMonths, endOfMonth, format, isSameDay, isValid } from 'date-fns';

const DateRangeFilter = ({ value, onChange }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [showCustom, setShowCustom] = useState(false);
    const [tempCustomRange, setTempCustomRange] = useState({ start: '', end: '' });
    const dropdownRef = useRef(null);

    const presets = [
        {
            label: 'Today',
            getValue: () => ({ start: new Date(), end: new Date() })
        },
        {
            label: 'Yesterday',
            getValue: () => ({ start: subDays(new Date(), 1), end: subDays(new Date(), 1) })
        },
        {
            label: 'Last 7 Days',
            getValue: () => ({ start: subDays(new Date(), 6), end: new Date() })
        },
        {
            label: 'Last 30 Days',
            getValue: () => ({ start: subDays(new Date(), 29), end: new Date() })
        },
        {
            label: 'This Month',
            getValue: () => ({ start: startOfMonth(new Date()), end: new Date() })
        },
        {
            label: 'Last Month',
            getValue: () => ({
                start: startOfMonth(subMonths(new Date(), 1)),
                end: endOfMonth(subMonths(new Date(), 1))
            })
        },
        {
            label: 'This Year',
            getValue: () => ({ start: startOfYear(new Date()), end: new Date() })
        },
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

    const handlePresetClick = (preset) => {
        const range = preset.getValue();
        onChange(range);
        setShowDropdown(false);
        setShowCustom(false);
    };

    const handleCustomApply = () => {
        const start = new Date(tempCustomRange.start);
        const end = new Date(tempCustomRange.end);

        if (isValid(start) && isValid(end)) {
            // Ensure end date includes the full day
            end.setHours(23, 59, 59, 999);
            onChange({ start, end });
            setShowDropdown(false);
            setShowCustom(false);
        }
    };

    const formatDateRange = () => {
        if (!value?.start || !value?.end) return 'Select Date Range';

        // Check if it matches a preset
        const matchingPreset = presets.find(p => {
            const range = p.getValue();
            return isSameDay(range.start, value.start) && isSameDay(range.end, value.end);
        });

        if (matchingPreset) return matchingPreset.label;

        return `${format(value.start, 'MMM d')} - ${format(value.end, 'MMM d')}`;
    };

    return (
        <div className="relative w-full sm:w-auto" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className={`
                    w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 px-4 py-2 rounded-lg transition-colors border
                    ${showDropdown
                        ? 'bg-white text-indigo-700 border-indigo-200 ring-2 ring-indigo-500/20'
                        : 'bg-white/20 hover:bg-white/30 text-white border-white/20'
                    }
                `}
            >
                <Calendar size={18} />
                <span className="hidden sm:inline text-sm font-medium">
                    {formatDateRange()}
                </span>
                <ChevronDown size={16} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                    <div className="flex">
                        {/* Presets Column */}
                        <div className="w-1/2 border-r border-gray-100 bg-gray-50 p-2 space-y-1">
                            {presets.map((preset, index) => {
                                const range = preset.getValue();
                                const isActive = value?.start && isSameDay(range.start, value.start) && isSameDay(range.end, value.end);

                                return (
                                    <button
                                        key={index}
                                        onClick={() => handlePresetClick(preset)}
                                        className={`
                                            w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                                            ${isActive
                                                ? 'bg-indigo-100 text-indigo-700 font-medium'
                                                : 'text-gray-600 hover:bg-white hover:shadow-sm'
                                            }
                                        `}
                                    >
                                        {preset.label}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setShowCustom(true)}
                                className={`
                                    w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                                    ${showCustom
                                        ? 'bg-indigo-100 text-indigo-700 font-medium'
                                        : 'text-gray-600 hover:bg-white hover:shadow-sm'
                                    }
                                `}
                            >
                                Custom Range
                            </button>
                        </div>

                        {/* Custom Input Column */}
                        <div className="w-1/2 p-4 flex flex-col justify-center">
                            {showCustom ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs uppercase font-semibold text-gray-500 mb-1 block">Start Date</label>
                                        <input
                                            type="date"
                                            value={tempCustomRange.start}
                                            onChange={(e) => setTempCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase font-semibold text-gray-500 mb-1 block">End Date</label>
                                        <input
                                            type="date"
                                            value={tempCustomRange.end}
                                            onChange={(e) => setTempCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                    <button
                                        onClick={handleCustomApply}
                                        className="w-full py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                                    >
                                        Apply Range
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center text-gray-400 py-8">
                                    <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Select a preset or custom range</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateRangeFilter;
