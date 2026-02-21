import React, { useState, useEffect, useCallback } from 'react';
import { Download, File, Image, FileText, Trash2, X, Upload as UploadIcon, CheckCircle } from 'lucide-react';
import { apiService, API_BASE_URL } from '../../services/api';

const FileManager = ({ taskId, userRole, onClose, defaultDeliverable = false }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isDeliverableUpload, setIsDeliverableUpload] = useState(defaultDeliverable);

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

            // If the URL is relative (starts with /api), prepend API_BASE_URL
            const downloadUrl = url.startsWith('http') ? url : `${API_BASE_URL.replace('/api', '')}${url}`;

            // Create a temporary link and click it
            const link = document.createElement('a');
            link.href = downloadUrl;
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

    const handleToggleDeliverable = async (fileId) => {
        try {
            await apiService.toggleDeliverable(fileId);
            await loadFiles();
        } catch (error) {
            console.error('Toggle deliverable failed:', error);
            alert('Failed to update deliverable status: ' + error.message);
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
            // Include isDeliverable flag in formData
            formData.append('isDeliverable', isDeliverableUpload);

            await apiService.uploadFile(taskId, formData);
            await loadFiles();
            e.target.value = ''; // Reset input
            setIsDeliverableUpload(false); // Reset flag
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
                <div className={`p-6 flex justify-between items-center text-white ${isDeliverableUpload ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}>
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            {isDeliverableUpload ? <CheckCircle size={24} /> : <File size={24} />}
                            {isDeliverableUpload ? 'Deliver Work to Client' : 'File Manager'}
                        </h2>
                        <p className={`${isDeliverableUpload ? 'text-emerald-50' : 'text-indigo-100'} text-sm`}>
                            Task #{taskId} - {files.length} file(s)
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Upload Section / Delivery Zone */}
                <div className={`p-6 border-b flex flex-col gap-4 ${isDeliverableUpload ? 'bg-emerald-50/50' : 'bg-gray-50'}`}>
                    {isDeliverableUpload && (
                        <div className="bg-white p-4 rounded-xl border-2 border-dashed border-emerald-200 text-center space-y-3">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                                <UploadIcon size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-emerald-900">Upload Final Results</h3>
                                <p className="text-sm text-emerald-700">The files you upload here will be marked as final deliverables for the client.</p>
                            </div>
                            <label className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all cursor-pointer font-bold shadow-lg shadow-emerald-200">
                                <UploadIcon size={20} />
                                Select Files to Deliver
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
                    )}

                    {!isDeliverableUpload && (
                        <div className="flex items-center gap-4">
                            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer">
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
                    )}

                    {userRole === 'admin' && (
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 px-2">
                                <input
                                    type="checkbox"
                                    id="isDeliverable"
                                    checked={isDeliverableUpload}
                                    onChange={(e) => setIsDeliverableUpload(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="isDeliverable" className="text-sm font-medium text-gray-700 cursor-pointer">
                                    Marking as Final Deliverable(s)
                                </label>
                            </div>

                            {isDeliverableUpload && files.some(f => f.is_deliverable) && (
                                <button
                                    onClick={async () => {
                                        try {
                                            await apiService.updateTask(taskId, { status: 'completed' });
                                            onClose();
                                        } catch (err) {
                                            alert('Failed to complete task: ' + err.message);
                                        }
                                    }}
                                    className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-200 transition-all flex items-center gap-2 border border-emerald-200"
                                >
                                    <CheckCircle size={16} /> Finalize & Complete Task
                                </button>
                            )}
                        </div>
                    )}
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
                                            {file.is_deliverable ? (
                                                <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold flex items-center gap-1 ring-1 ring-emerald-200">
                                                    <CheckCircle size={10} /> Final Deliverable
                                                </span>
                                            ) : userRole === 'admin' && (
                                                <button
                                                    onClick={() => handleToggleDeliverable(file.id)}
                                                    className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-dashed border-gray-300"
                                                >
                                                    Mark as Final
                                                </button>
                                            )}
                                            {file.is_deliverable && userRole === 'admin' && (
                                                <button
                                                    onClick={() => handleToggleDeliverable(file.id)}
                                                    className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors border border-dashed border-red-200"
                                                >
                                                    Unmark Final
                                                </button>
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
