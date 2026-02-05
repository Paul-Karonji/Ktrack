import React from 'react';
import { Download, Trash2, File, Image, FileText } from 'lucide-react';

const FileList = ({ files, onDownload, onDelete, userRole }) => {
    const getFileIcon = (fileType) => {
        if (!fileType) return <File className="text-gray-500" size={20} />;

        if (fileType.includes('image')) {
            return <Image className="text-blue-500" size={20} />;
        } else if (fileType.includes('pdf')) {
            return <FileText className="text-red-500" size={20} />;
        } else if (fileType.includes('word')) {
            return <FileText className="text-blue-600" size={20} />;
        } else if (fileType.includes('sheet') || fileType.includes('excel')) {
            return <FileText className="text-green-600" size={20} />;
        }
        return <File className="text-gray-500" size={20} />;
    };

    const formatBytes = (bytes) => {
        if (!bytes) return 'Unknown';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
    };

    if (files.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                <File className="mx-auto text-gray-300 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No files found</h3>
                <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                File
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Task
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Size
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Uploaded
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                By
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {files.map((file) => (
                            <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {getFileIcon(file.file_type)}
                                        <div>
                                            <p className="font-semibold text-gray-900 truncate max-w-xs">
                                                {file.original_filename}
                                            </p>
                                            <p className="text-xs text-gray-500">{file.file_type?.split('/')[1] || 'file'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-medium text-indigo-600">
                                        {file.task_name || `Task #${file.task_id}`}
                                    </p>
                                    {file.client_name && (
                                        <p className="text-xs text-gray-500">{file.client_name}</p>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700">
                                    {formatBytes(file.file_size)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700">
                                    {formatDate(file.uploaded_at)}
                                </td>
                                <td className="px-6 py-4">
                                    {file.uploader_name && (
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${file.uploader_role === 'admin'
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-blue-100 text-blue-800'
                                            }`}>
                                            {file.uploader_role === 'admin' ? '👨‍💼' : '👤'} {file.uploader_name}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => onDownload(file.id, file.original_filename)}
                                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                            title="Download"
                                        >
                                            <Download size={18} />
                                        </button>
                                        {userRole === 'admin' && (
                                            <button
                                                onClick={() => onDelete(file.id)}
                                                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                                title="Delete (Admin only)"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FileList;
