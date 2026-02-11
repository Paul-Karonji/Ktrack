import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';

const ExportOptions = ({ data, filename = 'analytics-report' }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [exporting, setExporting] = useState(false);
    const dropdownRef = useRef(null);

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

    const exportToCSV = () => {
        if (!data) return;

        try {
            setExporting(true);

            // Convert data to CSV format
            let csvContent = '';

            // Add KPIs section
            if (data.kpis) {
                csvContent += 'KEY PERFORMANCE INDICATORS\n';
                csvContent += 'Metric,Value\n';
                Object.entries(data.kpis).forEach(([key, value]) => {
                    csvContent += `${key},${value}\n`;
                });
                csvContent += '\n';
            }

            // Create blob and download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setShowDropdown(false);
        } catch (error) {
            console.error('CSV export error:', error);
            alert('Failed to export CSV. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const exportToJSON = () => {
        if (!data) return;

        try {
            setExporting(true);

            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.json`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setShowDropdown(false);
        } catch (error) {
            console.error('JSON export error:', error);
            alert('Failed to export JSON. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const exportToPDF = () => {
        // PDF export would require jsPDF library
        alert('PDF export coming soon! For now, please use Print (Ctrl+P) to save as PDF.');
        setShowDropdown(false);
    };

    const exportOptions = [
        {
            label: 'Export as CSV',
            description: 'Spreadsheet format',
            icon: FileSpreadsheet,
            color: 'text-green-600',
            onClick: exportToCSV
        },
        {
            label: 'Export as JSON',
            description: 'Raw data format',
            icon: File,
            color: 'text-blue-600',
            onClick: exportToJSON
        },
        {
            label: 'Export as PDF',
            description: 'Print-ready report',
            icon: FileText,
            color: 'text-red-600',
            onClick: exportToPDF
        }
    ];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                disabled={exporting || !data}
                className={`
          flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border
          ${exporting || !data
                        ? 'bg-white/10 text-white/50 cursor-not-allowed border-white/10'
                        : 'bg-white/20 hover:bg-white/30 text-white border-white/20'
                    }
        `}
            >
                <Download size={18} className={exporting ? 'animate-bounce' : ''} />
                <span className="hidden sm:inline text-sm font-medium">
                    {exporting ? 'Exporting...' : 'Export'}
                </span>
            </button>

            {/* Dropdown Menu */}
            {showDropdown && !exporting && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase px-3 py-2">
                            Export Analytics Data
                        </p>
                        <div className="space-y-1">
                            {exportOptions.map((option, index) => {
                                const Icon = option.icon;
                                return (
                                    <button
                                        key={index}
                                        onClick={option.onClick}
                                        className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <Icon size={20} className={`${option.color} mt-0.5`} />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-700">
                                                    {option.label}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {option.description}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Info Footer */}
                    <div className="border-t border-gray-200 px-3 py-2 bg-gray-50 rounded-b-lg">
                        <p className="text-xs text-gray-600">
                            Exports include all data from current date range
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportOptions;
