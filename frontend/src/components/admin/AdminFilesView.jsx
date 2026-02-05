import React, { useState, useEffect, useCallback } from 'react';
import { Download, Trash2, FileText, Image, File, Search } from 'lucide-react';
import { apiService } from '../../services/api';

const AdminFilesView = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [sortBy, setSortBy] = useState('date');

    const loadFiles = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                search: searchTerm || undefined,
                type: filterType !== 'all' ? filterType : undefined,
                sort: sortBy
            };
            const data = await apiService.getAllFiles(params);
            setFiles(data);
        } catch (error) {
            console.error('Failed to load files:', error);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, filterType, sortBy]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    const handleDownload = async (fileId, filename) => {
        try {
            const { url } = await apiService.getDownloadUrl(fileId);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download file: ' + error.message);
        }
    };

    const handleDelete = async (fileId) => {
        if (!window.confirm('Are you sure you want to delete this file?')) return;

        try {
            await apiService.deleteFile(fileId);
            await loadFiles();
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete file: ' + error.message);
        }
    };

    const getFileIcon = (filename) => {
        const ext = filename?.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
            return <Image className="text-blue-500" size={20} />;
        } else if (['pdf'].includes(ext)) {
            return <FileText className="text-red-500" size={20} />;
        } else if (['doc', 'docx'].includes(ext)) {
            return <FileText className="text-blue-600" size={20} />;
        } else if (['xls', 'xlsx'].includes(ext)) {
            return <FileText className="text-green-600" size={20} />;
        }
        return <File className="text-gray-500" size={20} />;
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'Unknown';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading files...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 border-2 border-gray-100 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search files by name, task, or client..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        >
                            <option value="all">All Types</option>
                            <option value="image">Images</option>
                            <option value="pdf">PDFs</option>
                            <option value="document">Documents</option>
                            <option value="spreadsheet">Spreadsheets</option>
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        >
                            <option value="date">Newest First</option>
                            <option value="name">Name A-Z</option>
                            <option value="size">Largest First</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Files Table */}
            <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">File</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Task</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Client</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Size</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Uploaded</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {files.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                                        <p className="text-gray-500 font-medium">No files found</p>
                                        <p className="text-sm text-gray-400 mt-1">Files uploaded by clients will appear here</p>
                                    </td>
                                </tr>
                            ) : (
                                files.map((file) => (
                                    <tr key={file.id} className="hover:bg-indigo-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {getFileIcon(file.original_filename)}
                                                <div>
                                                    <div className="font-semibold text-gray-900">{file.original_filename}</div>
                                                    <div className="text-xs text-gray-500">{file.file_type}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{file.task_name || 'Untitled'}</div>
                                            <div className="text-xs text-gray-500">ID: {file.task_id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-700">{file.client_name || 'Unknown'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-600">{formatFileSize(file.file_size)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600">{formatDate(file.created_at)}</div>
                                            <div className="text-xs text-gray-400">by {file.uploader_name || 'Unknown'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleDownload(file.id, file.original_filename)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Download"
                                                >
                                                    <Download size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(file.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer with count */}
                {files.length > 0 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                            Showing <span className="font-semibold">{files.length}</span> file{files.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminFilesView;
