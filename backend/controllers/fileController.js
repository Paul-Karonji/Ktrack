const R2Service = require('../services/r2Service');
const Task = require('../models/Task');

const FileController = {
    // Upload file
    async uploadFile(req, res) {
        try {
            const { taskId } = req.params;
            const file = req.file;

            console.log(`[FileController] Uploading file for Task ${taskId}`, file ? file.originalname : 'No File');

            if (!file) {
                console.log('[FileController] No file provided');
                return res.status(400).json({ error: 'No file uploaded' });
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
            // Fix: Check client_id OR client_name match
            const isOwner = task.client_id === req.user.id || task.client_name === req.user.full_name;

            if (req.user.role !== 'admin' && !isOwner) {
                console.log('[FileController] Auth failed. isOwner:', isOwner);
                return res.status(403).json({ error: 'Not authorized to upload files for this task' });
            }

            console.log('[FileController] Starting R2 Upload...');
            const result = await R2Service.uploadFile(file, taskId);
            console.log('[FileController] Upload success:', result);

            res.status(201).json({
                message: 'File uploaded successfully',
                file: result
            });
        } catch (error) {
            console.error('Upload Controller Error:', error);
            res.status(500).json({ error: 'Failed to upload file', details: error.message });
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
