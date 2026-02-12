import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Search, Filter, RefreshCw, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import FileStats from '../components/files/FileStats';
import FileList from '../components/files/FileList';

import { useNavigation } from '../context/NavigationContext';

const Files = () => {
    const { user, logout } = useAuth();
    const { openSidebar } = useNavigation();
    const [files, setFiles] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [fileTypeFilter, setFileTypeFilter] = useState('');
    const [sortBy, setSortBy] = useState('uploaded_at');
    const [sortOrder, setSortOrder] = useState('DESC');

    // Load files
    const loadFiles = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                search: searchTerm || undefined,
                fileType: fileTypeFilter || undefined,
                sortBy,
                order: sortOrder
            };
            const data = await apiService.getAllFiles(params);
            setFiles(data);
        } catch (error) {
            console.error('Failed to load files:', error);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, fileTypeFilter, sortBy, sortOrder]);

    // Load stats
    const loadStats = useCallback(async () => {
        try {
            setStatsLoading(true);
            const data = await apiService.getFileStats();
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFiles();
        loadStats();
    }, [loadFiles, loadStats]);

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
            await loadStats();
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete file: ' + error.message);
        }
    };

    const handleRefresh = () => {
        loadFiles();
        loadStats();
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setFileTypeFilter('');
        setSortBy('uploaded_at');
        setSortOrder('DESC');
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Sidebar user={user} onLogout={logout} />

            <main className="flex-1 lg:ml-64 p-4 md:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <button
                                    onClick={openSidebar}
                                    className="lg:hidden p-2 hover:bg-white/50 rounded-lg transition-colors"
                                >
                                    <Menu size={24} className="text-gray-600" />
                                </button>
                                <FileText size={48} className="text-indigo-600 hidden lg:block" />
                                <h1 className="text-3xl md:text-5xl font-bold text-gray-900 flex items-center gap-3">
                                    <FileText size={32} className="text-indigo-600 lg:hidden" />
                                    Files
                                </h1>
                            </div>
                            <p className="text-lg text-gray-500">
                                {loading ? 'Loading...' : `Showing ${files.length} file(s)`}
                            </p>
                        </div>

                        <button
                            onClick={handleRefresh}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl"
                        >
                            <RefreshCw size={20} />
                            Refresh
                        </button>
                    </div>

                    {/* Statistics */}
                    <FileStats stats={stats} loading={statsLoading} />

                    {/* Search & Filters */}
                    <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <Filter size={20} className="text-indigo-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Search & Filter</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Search */}
                            <div className="md:col-span-2 relative">
                                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search files by name..."
                                    className="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                />
                            </div>

                            {/* File Type Filter */}
                            <select
                                value={fileTypeFilter}
                                onChange={(e) => setFileTypeFilter(e.target.value)}
                                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium text-gray-700"
                            >
                                <option value="">All Types</option>
                                <option value="image">Images</option>
                                <option value="pdf">PDFs</option>
                                <option value="word">Word Docs</option>
                                <option value="sheet">Spreadsheets</option>
                            </select>

                            {/* Sort */}
                            <select
                                value={`${sortBy}-${sortOrder}`}
                                onChange={(e) => {
                                    const [field, order] = e.target.value.split('-');
                                    setSortBy(field);
                                    setSortOrder(order);
                                }}
                                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium text-gray-700"
                            >
                                <option value="uploaded_at-DESC">Newest First</option>
                                <option value="uploaded_at-ASC">Oldest First</option>
                                <option value="original_filename-ASC">Name (A-Z)</option>
                                <option value="original_filename-DESC">Name (Z-A)</option>
                                <option value="file_size-DESC">Largest First</option>
                                <option value="file_size-ASC">Smallest First</option>
                            </select>
                        </div>

                        {(searchTerm || fileTypeFilter) && (
                            <div className="mt-4">
                                <button
                                    onClick={handleClearFilters}
                                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Files List */}
                    {loading ? (
                        <div className="bg-white rounded-2xl p-12 text-center border-2 border-gray-100">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                            <p className="text-gray-500">Loading files...</p>
                        </div>
                    ) : (
                        <FileList
                            files={files}
                            onDownload={handleDownload}
                            onDelete={handleDelete}
                            userRole={user?.role}
                        />
                    )}
                </div>
            </main>
        </div>
    );
};

export default Files;
