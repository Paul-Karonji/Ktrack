const R2Service = require('../services/r2Service');
const Task = require('../models/Task');

const FileController = {
    // Upload file(s) - supports both single and multiple files
    async uploadFile(req, res) {
        try {
            const { taskId } = req.params;
            const files = req.files || (req.file ? [req.file] : []);

            console.log(`[FileController] Uploading ${files.length} file(s) for Task ${taskId}`);

            if (files.length === 0) {
                console.log('[FileController] No files provided');
                return res.status(400).json({ error: 'No files uploaded' });
            }

            // Check if task exists
            const task = await Task.findById(taskId);
            if (!task) {
                console.log('[FileController] Task not found');
                return res.status(404).json({ error: 'Task not found' });
            }

            console.log('[FileController] Task found:', { id: task.id, client_id: task.client_id, client_name: task.client_name });
            console.log('[FileController] User:', { id: req.user.id, role: req.user.role, name: req.user.full_name });

            // Check ownership (admins can upload to any, clients only to theirs)
            const isOwner = task.client_id === req.user.id || task.client_name === req.user.full_name;

            if (req.user.role !== 'admin' && !isOwner) {
                console.log('[FileController] Auth failed. isOwner:', isOwner);
                return res.status(403).json({ error: 'Not authorized to upload files for this task' });
            }

            console.log('[FileController] Starting R2 Upload for', files.length, 'file(s)...');

            // Upload all files
            const uploadPromises = files.map(file => R2Service.uploadFile(file, taskId, req.user.id));
            const results = await Promise.all(uploadPromises);

            console.log('[FileController] Upload success:', results.length, 'file(s) uploaded');

            res.status(201).json({
                message: `${results.length} file(s) uploaded successfully`,
                files: results
            });
        } catch (error) {
            console.error('Upload Controller Error:', error);
            res.status(500).json({ error: 'Failed to upload file(s)', details: error.message });
        }
    },

    // Get file download URL
    async getDownloadUrl(req, res) {
        try {
            const { fileId } = req.params;
            const { url, filename } = await R2Service.getDownloadUrl(fileId);
            res.json({ url, filename });
        } catch (error) {
            console.error('Download URL Error:', error);
            res.status(404).json({ error: 'File not found' });
        }
    },

    // Get all files for a task
    async getTaskFiles(req, res) {
        try {
            const { taskId } = req.params;
            const files = await R2Service.getTaskFiles(taskId);
            res.json(files);
        } catch (error) {
            console.error('Get Files Error:', error);
            res.status(500).json({ error: 'Failed to fetch files' });
        }
    },

    // Delete file
    async deleteFile(req, res) {
        try {
            const { fileId } = req.params;

            // Only admins or maybe the uploader can delete?
            // For now, let's restrict deletion to admins only
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Only admins can delete files' });
            }

            const success = await R2Service.deleteFile(fileId);
            if (!success) {
                return res.status(404).json({ error: 'File not found' });
            }

            res.json({ message: 'File deleted successfully' });
        } catch (error) {
            console.error('Delete File Error:', error);
            res.status(500).json({ error: 'Failed to delete file' });
        }
    }
};

module.exports = FileController;
