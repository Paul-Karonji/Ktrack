const R2Service = require('../services/r2Service');
const Task = require('../models/Task');
const User = require('../models/User');
const EmailService = require('../services/emailService');
const templates = require('../templates/emailTemplates');
const Notification = require('../models/Notification');
const { invalidateCache } = require('../middleware/cache');

const FileController = {
    // Get all files (with optional filters)
    async getAllFiles(req, res) {
        try {
            const { search, fileType, taskId, sortBy = 'uploaded_at', order = 'DESC' } = req.query;
            const userId = req.user.id;
            const userRole = req.user.role;

            console.log(`[FileController] Getting all files for user ${userId} (${userRole})`);

            let query = `
                SELECT 
                    tf.id,
                    tf.task_id,
                    tf.original_filename,
                    tf.file_type,
                    tf.file_size,
                    tf.uploaded_at,
                    tf.uploaded_at as created_at,
                    tf.uploaded_by,
                    t.task_name,
                    t.client_name,
                    u.full_name as uploader_name,
                    u.role as uploader_role
                FROM task_files tf
                LEFT JOIN tasks t ON tf.task_id = t.id
                LEFT JOIN users u ON tf.uploaded_by = u.id
                WHERE 1=1
            `;

            const params = [];

            // Role-based filtering
            if (userRole === 'client') {
                query += ' AND (t.client_id = ? OR t.client_name = ?)';
                params.push(userId, req.user.full_name);
            }
            // Admins see all files

            // Search filter
            if (search) {
                query += ' AND tf.original_filename LIKE ?';
                params.push(`%${search}%`);
            }

            // File type filter
            if (fileType) {
                query += ' AND tf.file_type LIKE ?';
                params.push(`%${fileType}%`);
            }

            // Task filter
            if (taskId) {
                query += ' AND tf.task_id = ?';
                params.push(taskId);
            }

            // Sorting
            const validSortFields = ['uploaded_at', 'original_filename', 'file_size', 'file_type'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'uploaded_at';
            const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
            query += ` ORDER BY tf.${sortField} ${sortOrder}`;

            const { pool } = require('../config/database');
            const [files] = await pool.execute(query, params);

            console.log(`[FileController] Found ${files.length} files`);
            res.json(files);
        } catch (error) {
            console.error('Get All Files Error:', error);
            res.status(500).json({ error: 'Failed to fetch files', details: error.message });
        }
    },

    // Get file statistics
    async getFileStats(req, res) {
        try {
            const userId = req.user.id;
            const userRole = req.user.role;
            const { pool } = require('../config/database');

            let whereClause = '';
            const params = [];

            if (userRole === 'client') {
                whereClause = 'WHERE (t.client_id = ? OR t.client_name = ?)';
                params.push(userId, req.user.full_name);
            }

            // Total files and storage
            const [totals] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_files,
                    COALESCE(SUM(tf.file_size), 0) as total_storage
                FROM task_files tf
                LEFT JOIN tasks t ON tf.task_id = t.id
                ${whereClause}
            `, params);

            // Files this month
            const [thisMonth] = await pool.execute(`
                SELECT COUNT(*) as files_this_month
                FROM task_files tf
                LEFT JOIN tasks t ON tf.task_id = t.id
                ${whereClause ? 'AND' : 'WHERE'} tf.uploaded_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `, params);

            // Most used file type
            const [fileTypes] = await pool.execute(`
                SELECT 
                    tf.file_type,
                    COUNT(*) as count
                FROM task_files tf
                LEFT JOIN tasks t ON tf.task_id = t.id
                ${whereClause}
                GROUP BY tf.file_type
                ORDER BY count DESC
                LIMIT 1
            `, params);

            const stats = {
                totalFiles: totals[0].total_files,
                totalStorage: totals[0].total_storage,
                filesThisMonth: thisMonth[0].files_this_month,
                mostUsedType: fileTypes[0]?.file_type || 'N/A',
                mostUsedTypeCount: fileTypes[0]?.count || 0
            };

            console.log('[FileController] Stats:', stats);
            res.json(stats);
        } catch (error) {
            console.error('Get File Stats Error:', error);
            res.status(500).json({ error: 'Failed to fetch statistics', details: error.message });
        }
    },
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

            // 3. Upload to R2 and save metadata
            const results = [];
            const isDeliverable = req.body.isDeliverable === 'true' || req.body.isDeliverable === true;

            for (const file of req.files) {
                const result = await R2Service.uploadFile(file, taskId, req.user.id, isDeliverable);
                results.push(result);
            }

            console.log('[FileController] Upload success:', results.length, 'file(s) uploaded');

            // Invalidate analytics cache (storage changed)
            invalidateCache('/analytics');

            res.status(201).json({
                message: `${results.length} file(s) uploaded successfully`,
                files: results
            });

            // Email Notifications
            try {
                // Determine notification direction
                if (req.user.role === 'client') {
                    // Client uploaded -> Notify Admin (Email + In-App)
                    const { subject, html } = templates.newFileAdmin(req.user.full_name, files[0].originalname + (files.length > 1 ? ` (+${files.length - 1} others)` : ''), taskId);
                    EmailService.notifyAdmin({ subject, html }).catch(e => console.error('Failed to notify admin of file upload:', e));

                    // In-App for all Admins
                    const admins = await User.findAdmins();
                    for (const admin of admins) {
                        Notification.create({
                            userId: admin.id,
                            type: 'new_file',
                            message: `${req.user.full_name} uploaded ${files.length} file(s) to Task #${taskId}`
                        }).catch(e => console.error('Failed to create admin notification:', e));
                    }
                } else if (req.user.role === 'admin') {
                    // Admin uploaded -> Notify Client
                    if (task.client_id) {
                        const client = await User.findById(task.client_id);
                        if (client && client.email) {
                            const { subject, html } = templates.newFileClient(client.full_name, files[0].originalname + (files.length > 1 ? ` (+${files.length - 1} others)` : ''), taskId);
                            EmailService.sendEmail({ to: client.email, subject, html }).catch(e => console.error('Failed to notify client of file upload:', e));

                            // In-App
                            Notification.create({
                                userId: client.id,
                                type: 'new_file',
                                message: `New file(s) uploaded to Task #${taskId}: ${files[0].originalname}${files.length > 1 ? '...' : ''}`
                            }).catch(e => console.error('Failed to create client notification:', e));
                        }
                    }
                }
            } catch (emailError) {
                console.error('File upload email error:', emailError);
            }
        } catch (error) {
            console.error('Upload Controller Error:', error);
            res.status(500).json({ error: 'Failed to upload file(s)', details: error.message });
        }
    },

    // Get file download URL
    async getDownloadUrl(req, res) {
        try {
            const { fileId } = req.params;
            const { pool } = require('../config/database');

            // 1. Get file info to find taskId
            const [rows] = await pool.execute('SELECT task_id FROM task_files WHERE id = ?', [fileId]);
            if (rows.length === 0) return res.status(404).json({ error: 'File not found' });

            const taskId = rows[0].task_id;

            // 2. Security Check on Task
            const task = await Task.findById(taskId);
            if (!task) return res.status(404).json({ error: 'Task not found' });

            if (req.user.role !== 'admin' && task.client_id !== req.user.id) {
                return res.status(403).json({ error: 'Access denied' });
            }

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

            // Security Check
            const task = await Task.findById(taskId);
            if (!task) return res.status(404).json({ error: 'Task not found' });

            if (req.user.role !== 'admin' && task.client_id !== req.user.id) {
                return res.status(403).json({ error: 'Access denied' });
            }

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
            const { pool } = require('../config/database');

            // Get file info to find taskId
            const [rows] = await pool.execute('SELECT task_id FROM task_files WHERE id = ?', [fileId]);
            if (rows.length === 0) return res.status(404).json({ error: 'File not found' });

            const taskId = rows[0].task_id;
            const task = await Task.findById(taskId);

            // Security Check: Admin or Task Owner
            const isOwner = task && task.client_id === req.user.id;
            if (req.user.role !== 'admin' && !isOwner) {
                return res.status(403).json({ error: 'Access denied. Admin or Owner rights required.' });
            }

            const success = await R2Service.deleteFile(fileId);
            if (!success) {
                return res.status(404).json({ error: 'File not found' });
            }

            // Invalidate analytics cache
            invalidateCache('/analytics');

            res.json({ message: 'File deleted successfully' });
        } catch (error) {
            console.error('Delete File Error:', error);
            res.status(500).json({ success: false, message: 'Failed to delete file' });
        }
    },

    async toggleDeliverable(req, res) {
        try {
            const { fileId } = req.params;

            // Security Check: Only admin can toggle deliverable status
            if (req.user.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Only admins can mark files as deliverables' });
            }

            await R2Service.toggleDeliverable(fileId);
            res.json({ success: true, message: 'Deliverable status toggled successfully' });
        } catch (error) {
            console.error('Error toggling deliverable status:', error);
            res.status(500).json({ success: false, message: 'Failed to toggle deliverable status' });
        }
    }
};

module.exports = FileController;
