import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
        if (!data) return;
        setExporting(true);
        try {
            const doc = new jsPDF();

            // Branding & Header
            doc.setFillColor(79, 70, 229); // Indigo 600
            doc.rect(0, 0, 210, 10, 'F'); // Top bar

            doc.setFontSize(22);
            doc.setTextColor(79, 70, 229);
            doc.text('Analytics Report', 14, 25);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);
            doc.text(`K-Track System`, 14, 37);

            let yPos = 45;

            // 1. Executive KPIs
            if (data.kpis) {
                doc.setFontSize(14);
                doc.setTextColor(0);
                doc.text('Executive KPIs', 14, yPos);
                yPos += 5;

                const kpiData = [
                    ['Total Revenue', `$${(data.kpis.actualRevenue || 0).toLocaleString()}`],
                    ['Active Projects', data.kpis.activeTasks || 0],
                    ['Pending Tasks', data.kpis.pendingReview || 0],
                    ['Client Growth', data.kpis.clientGrowth || '0%'],
                    ['Avg Project Value', `$${data.kpis.completedThisPeriod > 0
                        ? Math.round(data.kpis.actualRevenue / data.kpis.completedThisPeriod).toLocaleString()
                        : '0'}`],
                    ['Retention Rate', `${data.clients?.retentionRate || 0}%`]
                ];

                autoTable(doc, {
                    startY: yPos,
                    head: [['Metric', 'Value']],
                    body: kpiData,
                    theme: 'striped',
                    headStyles: { fillColor: [79, 70, 229] },
                    styles: { fontSize: 10 }
                });

                yPos = doc.lastAutoTable.finalY + 15;
            }

            // 2. Financial Summary
            if (data.financials) {
                doc.setFontSize(14);
                doc.text('Financial Summary', 14, yPos);
                yPos += 5;

                const finData = [
                    ['Total Invoiced', `$${data.financials.totalInvoiced?.toLocaleString()}`],
                    ['Total Paid', `$${data.financials.totalPaid?.toLocaleString()}`],
                    ['Total Pending', `$${data.financials.totalPending?.toLocaleString()}`],
                    ['Overdue Amount', `$${data.financials.totalOverdue?.toLocaleString()}`]
                ];

                autoTable(doc, {
                    startY: yPos,
                    head: [['Category', 'Amount']],
                    body: finData,
                    theme: 'grid',
                    headStyles: { fillColor: [16, 185, 129] } // Green
                });

                yPos = doc.lastAutoTable.finalY + 15;
            }

            // 3. Storage
            if (data.storage) {
                // Check if we need a new page
                if (yPos > 200) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.setFontSize(14);
                doc.text('Storage Usage', 14, yPos);
                yPos += 5;

                const storageData = [
                    ['Total Files', data.storage.totalFiles?.toLocaleString()],
                    ['Used Storage', `${(data.storage.usedStorage / 1024 / 1024).toFixed(2)} MB`],
                    ['Utilization', `${data.storage.utilization}%`],
                    ['Files This Month', `+${data.storage.filesThisMonth || 0}`]
                ];

                autoTable(doc, {
                    startY: yPos,
                    head: [['Metric', 'Value']],
                    body: storageData,
                    theme: 'striped',
                    headStyles: { fillColor: [245, 158, 11] } // Orange (Amber)
                });
            }

            doc.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);
            setShowDropdown(false);
        } catch (error) {
            console.error('PDF export error:', error);
            alert('Failed to export PDF');
        } finally {
            setExporting(false);
        }
    };

    const exportToExcel = () => {
        if (!data) return;
        setExporting(true);
        try {
            const wb = XLSX.utils.book_new();

            // 1. Overview Sheet
            if (data.kpis) {
                const wsData = [
                    ['Metric', 'Value'],
                    ['Total Revenue', data.kpis.actualRevenue || 0],
                    ['Active Projects', data.kpis.activeTasks || 0],
                    ['Pending Tasks', data.kpis.pendingReview || 0],
                    ['Client Growth %', data.kpis.clientGrowth || '0%'],
                    ['Avg Project Value', data.kpis.completedThisPeriod > 0
                        ? Math.round(data.kpis.actualRevenue / data.kpis.completedThisPeriod)
                        : 0],
                    ['Retention Rate %', data.clients?.retentionRate || 0],
                    [],
                    ['Generated On', new Date().toLocaleString()]
                ];
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                XLSX.utils.book_append_sheet(wb, ws, "Overview");
            }

            // 2. Financials Detail
            if (data.revenue && Array.isArray(data.revenue.breakdown)) {
                const ws = XLSX.utils.json_to_sheet(data.revenue.breakdown);
                XLSX.utils.book_append_sheet(wb, ws, "Revenue Breakdown");
            } else if (data.financials) {
                const wsData = Object.entries(data.financials).map(([k, v]) => ({ Metric: k, Value: v }));
                const ws = XLSX.utils.json_to_sheet(wsData);
                XLSX.utils.book_append_sheet(wb, ws, "Financials");
            }

            // 3. Clients
            if (data.clients && Array.isArray(data.clients.list)) {
                const ws = XLSX.utils.json_to_sheet(data.clients.list);
                XLSX.utils.book_append_sheet(wb, ws, "Clients");
            }

            // 4. File Storage
            if (data.storage && Array.isArray(data.storage.fileTypes)) {
                const ws = XLSX.utils.json_to_sheet(data.storage.fileTypes);
                XLSX.utils.book_append_sheet(wb, ws, "Storage Files");
            }

            XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
            setShowDropdown(false);
        } catch (error) {
            console.error('Excel export error:', error);
            alert('Failed to export Excel');
        } finally {
            setExporting(false);
        }
    };

    const exportOptions = [
        {
            label: 'Export as CSV',
            description: 'Simple data summary',
            icon: File,
            color: 'text-gray-600',
            onClick: exportToCSV
        },
        {
            label: 'Export as Excel',
            description: 'Detailed multi-sheet report',
            icon: FileSpreadsheet,
            color: 'text-green-600',
            onClick: exportToExcel
        },
        {
            label: 'Export as PDF',
            description: 'Print-ready presentation',
            icon: FileText,
            color: 'text-red-600',
            onClick: exportToPDF
        }
    ];

    return (
        <div className="relative w-full sm:w-auto" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                disabled={exporting || !data}
                className={`
          w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 px-4 py-2 rounded-lg transition-colors border
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
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase px-3 py-2">
                            Download Report
                        </p>
                        <div className="space-y-1">
                            {exportOptions.map((option, index) => {
                                const Icon = option.icon;
                                return (
                                    <button
                                        key={index}
                                        onClick={option.onClick}
                                        className="w-full text-left px-3 py-3 rounded-md hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg bg-gray-50 group-hover:bg-white group-hover:shadow-sm transition-all`}>
                                                <Icon size={20} className={`${option.color}`} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-700">
                                                    {option.label}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
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
                    <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 rounded-b-lg">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <p className="text-xs text-gray-600 font-medium">
                                Exports include currently filtered data
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportOptions;
