import React from 'react';
import { Download } from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils/formatters';

const ExportButton = ({ tasks, isOnline }) => {
    const exportToCSV = () => {
        if (tasks.length === 0) {
            alert('No tasks to export');
            return;
        }

        // CSV headers
        const headers = [
            'Client Name',
            'Task Description',
            'Date Commissioned',
            'Date Delivered',
            'Expected Amount',
            'Payment Status',
            'Priority',
            'Status',
            'Notes',
            'Created At'
        ];

        // Convert tasks to CSV rows
        const rows = tasks.map(task => [
            task.client_name,
            `"${task.task_description.replace(/"/g, '""')}"`, // Escape quotes
            formatDate(task.date_commissioned),
            formatDate(task.date_delivered),
            task.expected_amount,
            task.is_paid ? 'Paid' : 'Pending',
            task.priority || 'medium',
            task.status || 'not_started',
            task.notes ? `"${task.notes.replace(/"/g, '""')}"` : '',
            formatDate(task.created_at)
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `tasks_export_${timestamp}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <button
            onClick={exportToCSV}
            disabled={!isOnline || tasks.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${isOnline && tasks.length > 0
                    ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            title="Export tasks to CSV"
        >
            <Download size={18} />
            Export CSV
        </button>
    );
};

export default ExportButton;
