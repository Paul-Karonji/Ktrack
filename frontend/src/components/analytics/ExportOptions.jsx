import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

    const escapeXml = (value) => {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    };

    const toSheetName = (name) => {
        return String(name || 'Sheet')
            .replace(/[:\\/?*[\]]/g, ' ')
            .trim()
            .slice(0, 31) || 'Sheet';
    };

    const rowsToWorksheet = (name, rows) => {
        if (!rows.length) return '';
        const tableRows = rows.map((row) => {
            const cells = row.map((cell) => {
                const isNumber = typeof cell === 'number' && Number.isFinite(cell);
                return `<Cell><Data ss:Type="${isNumber ? 'Number' : 'String'}">${escapeXml(cell)}</Data></Cell>`;
            }).join('');
            return `<Row>${cells}</Row>`;
        }).join('');

        return `<Worksheet ss:Name="${escapeXml(toSheetName(name))}"><Table>${tableRows}</Table></Worksheet>`;
    };

    const objectRowsToWorksheet = (name, rows) => {
        if (!Array.isArray(rows) || rows.length === 0) return '';
        const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row || {}))));
        const worksheetRows = [
            headers,
            ...rows.map((row) => headers.map((header) => row?.[header] ?? ''))
        ];
        return rowsToWorksheet(name, worksheetRows);
    };

    const exportToExcel = () => {
        if (!data) return;
        setExporting(true);
        try {
            const worksheets = [];

            // 1. Overview Sheet
            if (data.kpis) {
                worksheets.push(rowsToWorksheet('Overview', [
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
                ]));
            }

            // 2. Financials Detail
            if (data.revenue && Array.isArray(data.revenue.breakdown)) {
                worksheets.push(objectRowsToWorksheet('Revenue Breakdown', data.revenue.breakdown));
            } else if (data.financials) {
                worksheets.push(rowsToWorksheet('Financials', [
                    ['Metric', 'Value'],
                    ...Object.entries(data.financials)
                ]));
            }

            // 3. Clients
            if (data.clients && Array.isArray(data.clients.list)) {
                worksheets.push(objectRowsToWorksheet('Clients', data.clients.list));
            }

            // 4. File Storage
            if (data.storage && Array.isArray(data.storage.fileTypes)) {
                worksheets.push(objectRowsToWorksheet('Storage Files', data.storage.fileTypes));
            }

            if (worksheets.filter(Boolean).length === 0) {
                worksheets.push(rowsToWorksheet('Report', [['Metric', 'Value'], ['Generated On', new Date().toLocaleString()]]));
            }

            const workbookXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${worksheets.filter(Boolean).join('')}
</Workbook>`;

            const blob = new Blob([workbookXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}-${new Date().toISOString().split('T')[0]}.xls`;
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
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
