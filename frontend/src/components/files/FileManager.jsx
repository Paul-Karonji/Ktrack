import React, { useState, useEffect, useCallback } from 'react';
import { Download, File, Image, FileText, Trash2, X, Upload as UploadIcon } from 'lucide-react';
import { apiService } from '../../services/api';

const FileManager = ({ taskId, userRole, onClose }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const loadFiles = useCallback(async () => {
        try {
            setLoading(true);
            const taskFiles = await apiService.getTaskFiles(taskId);
            setFiles(taskFiles);
        } catch (error) {
            console.error('Failed to load files:', error);
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    const handleDownload = async (fileId, filename) => {
        try {
            const { url } = await apiService.getDownloadUrl(fileId);
            // Create a temporary link and click it
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

    const handleUpload = async (e) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        setUploading(true);
        const formData = new FormData();
        for (let i = 0; i < selectedFiles.length; i++) {
            formData.append('files', selectedFiles[i]);
        }

        try {
            await apiService.uploadFile(taskId, formData);
            await loadFiles();
            e.target.value = ''; // Reset input
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload files: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const getFileIcon = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
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
        if (!bytes) return 'Unknown size';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown date';
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">File Manager</h2>
                        <p className="text-indigo-100 text-sm">Task #{taskId} - {files.length} file(s)</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Upload Section */}
                <div className="p-4 bg-gray-50 border-b">
                    <label className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer">
                        <UploadIcon size={20} />
                        <span className="font-semibold">
                            {uploading ? 'Uploading...' : 'Upload New Files'}
                        </span>
                        <input
                            type="file"
                            multiple
                            onChange={handleUpload}
                            disabled={uploading}
                            className="hidden"
                            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                        />
                    </label>
                </div>

                {/* Files List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="text-gray-500 mt-4">Loading files...</p>
                        </div>
                    ) : files.length === 0 ? (
                        <div className="text-center py-12">
                            <File className="mx-auto text-gray-300" size={48} />
                            <p className="text-gray-500 mt-4">No files uploaded yet</p>
                            <p className="text-gray-400 text-sm">Upload files using the button above</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {files.map((file) => (
                                <div
                                    key={file.id}
                                    className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:shadow-md transition-all"
                                >
                                    {/* File Icon */}
                                    <div className="flex-shrink-0">
                                        {getFileIcon(file.original_filename)}
                                    </div>

                                    {/* File Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 truncate">
                                            {file.original_filename}
                                        </p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-xs text-gray-500">
                                                {formatFileSize(file.file_size)} • {formatDate(file.uploaded_at)}
                                            </p>
                                            {file.uploader_name && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${file.uploader_role === 'admin'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {file.uploader_role === 'admin' ? '👨‍💼' : '👤'} {file.uploader_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleDownload(file.id, file.original_filename)}
                                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                            title="Download"
                                        >
                                            <Download size={18} />
                                        </button>
                                        {userRole === 'admin' && (
                                            <button
                                                onClick={() => handleDelete(file.id)}
                                                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                                title="Delete (Admin only)"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t">
                    <button
                        onClick={onClose}
                        className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FileManager;
