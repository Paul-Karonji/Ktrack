const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { pool } = require('../config/database');

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

const R2Service = {
    // Upload file to R2 (with Local Fallback)
    async uploadFile(file, taskId, userId) {
        const fileExtension = file.originalname.split('.').pop();
        const storedFilename = `${taskId}-${Date.now()}.${fileExtension}`;
        const fileContent = file.buffer;
        let storageType = 'r2';

        try {
            console.log('[R2Service] Attempting R2 Upload...');

            // Create a timeout signal (5 seconds)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const command = new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: storedFilename,
                Body: fileContent,
                ContentType: file.mimetype,
            });

            await s3Client.send(command, { abortSignal: controller.signal });
            clearTimeout(timeoutId);
            console.log('[R2Service] R2 Upload Successful');
        } catch (error) {
            console.error('[R2Service] R2 Upload Failed:', error.message);
            if (error.name === 'AbortError') {
                console.log('[R2Service] Upload timed out - switching to local storage');
            }
            console.log('[R2Service] Falling back to LOCAL storage...');

            // Fallback to local storage
            storageType = 'local';
            const fs = require('fs');
            const path = require('path');
            const uploadsDir = path.join(__dirname, '../uploads');

            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            fs.writeFileSync(path.join(uploadsDir, storedFilename), fileContent);
            console.log('[R2Service] Local Upload Successful');
        }

        try {
            // Save metadata to database
            const [result] = await pool.execute(
                `INSERT INTO task_files 
         (task_id, original_filename, stored_filename, file_path, file_type, file_size, uploaded_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    taskId,
                    file.originalname,
                    storedFilename,
                    // Store prefix to distinguish storage type, or just filename if we check both
                    storageType === 'local' ? `local:${storedFilename}` : storedFilename,
                    file.mimetype,
                    file.size,
                    userId
                ]
            );

            // Update task to show it has a file
            await pool.execute('UPDATE tasks SET has_file = TRUE WHERE id = ?', [taskId]);

            return {
                id: result.insertId,
                taskId,
                originalFilename: file.originalname,
                storedFilename,
                storageType, // Helper for frontend/debug
                fileType: file.mimetype,
                fileSize: file.size
            };
        } catch (dbError) {
            console.error('[R2Service] Database Error:', dbError);
            throw dbError;
        }
    },

    // Get signed download URL
    async getDownloadUrl(fileId) {
        // Get file info from database
        const [rows] = await pool.execute('SELECT * FROM task_files WHERE id = ?', [fileId]);
        if (rows.length === 0) throw new Error('File not found');

        const file = rows[0];
        const filePath = file.file_path || file.stored_filename;

        // Check if local file
        if (filePath.startsWith('local:')) {
            const filename = filePath.replace('local:', '');
            // Return a direct URL to the backend static file route
            // Should be /uploads/filename
            // Assuming BACKEND_URL is available or relative path
            return {
                url: `${process.env.API_URL || 'http://localhost:3001'}/uploads/${filename}`,
                filename: file.original_filename,
                isLocal: true
            };
        }

        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: file.stored_filename,
        });

        // URL expires in 1 hour (3600 seconds)
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return { url, filename: file.original_filename };
    },

    // Get files for a task with uploader info
    async getTaskFiles(taskId) {
        const [rows] = await pool.execute(
            `SELECT 
                tf.*,
                u.full_name as uploader_name,
                u.role as uploader_role
            FROM task_files tf
            LEFT JOIN users u ON tf.uploaded_by = u.id
            WHERE tf.task_id = ? 
            ORDER BY tf.uploaded_at DESC`,
            [taskId]
        );
        return rows;
    },

    // Delete file
    async deleteFile(fileId) {
        // Get file info
        const [rows] = await pool.execute('SELECT * FROM task_files WHERE id = ?', [fileId]);
        if (rows.length === 0) return false;

        const file = rows[0];

        // Delete from R2
        try {
            const command = new DeleteObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: file.stored_filename,
            });
            await s3Client.send(command);
        } catch (error) {
            console.error('R2 Delete Error:', error);
            // Proceed to delete from DB even if R2 delete fails (orphan file handling optional later)
        }

        // Delete from database
        await pool.execute('DELETE FROM task_files WHERE id = ?', [fileId]);

        // Check if task has other files
        const [remaining] = await pool.execute('SELECT COUNT(*) as count FROM task_files WHERE task_id = ?', [file.task_id]);
        if (remaining[0].count === 0) {
            await pool.execute('UPDATE tasks SET has_file = FALSE WHERE id = ?', [file.task_id]);
        }

        return true;
    }
};

module.exports = R2Service;
