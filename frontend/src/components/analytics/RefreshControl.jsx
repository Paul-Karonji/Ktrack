import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';

const RefreshControl = ({ interval, onChange, onManualRefresh, lastUpdated }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const options = [
        { label: 'Manual Only', value: null, icon: '⏸️' },
        { label: 'Every 30 seconds', value: 30, icon: '⚡' },
        { label: 'Every 1 minute', value: 60, icon: '🔄' },
        { label: 'Every 5 minutes', value: 300, icon: '⏱️' }
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

    const handleOptionClick = (value) => {
        onChange(value);
        setShowDropdown(false);
    };

    const getCurrentLabel = () => {
        const current = options.find(opt => opt.value === interval);
        return current?.label || 'Manual Only';
    };

    const handleRefreshClick = () => {
        if (interval === null && onManualRefresh) {
            onManualRefresh();
        } else {
            setShowDropdown(!showDropdown);
        }
    };

    return (
        <div className="relative w-full sm:w-auto" ref={dropdownRef}>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                {lastUpdated && (
                    <span className="text-xs text-gray-500 hidden lg:inline whitespace-nowrap">
                        Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
                <button
                    onClick={handleRefreshClick}
                    className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white border border-white/20"
                    title={lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : 'Refresh data'}
                >
                    <RefreshCw
                        size={18}
                        className={interval ? 'animate-spin' : 'hover:rotate-180 transition-transform duration-500'}
                    />
                    <span className="hidden sm:inline text-sm font-medium">
                        {getCurrentLabel()}
                    </span>
                    <ChevronDown
                        size={16}
                        className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(!showDropdown);
                        }}
                    />
                </button>
            </div>

            {/* Dropdown Menu */}
            {showDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase px-3 py-2">
                            Auto-Refresh Interval
                        </p>
                        <div className="space-y-1">
                            {options.map((option, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleOptionClick(option.value)}
                                    className={`
                    w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2
                    ${interval === option.value
                                            ? 'bg-indigo-50 text-indigo-700 font-medium'
                                            : 'text-gray-700 hover:bg-gray-50'
                                        }
                  `}
                                >
                                    <span>{option.icon}</span>
                                    <span>{option.label}</span>
                                    {interval === option.value && (
                                        <span className="ml-auto text-indigo-600">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Info Footer */}
                    <div className="border-t border-gray-200 px-3 py-2 bg-gray-50 rounded-b-lg">
                        <p className="text-xs text-gray-600">
                            {interval
                                ? `Data refreshes automatically every ${interval >= 60 ? `${interval / 60} min` : `${interval}s`}`
                                : 'Click refresh icon to update manually'
                            }
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RefreshControl;
