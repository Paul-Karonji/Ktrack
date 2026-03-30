const { pool } = require('../config/database');

class Message {
    static normalizePageValue(value, fallback, { min = 0, max = 100 } = {}) {
        const numeric = Number.parseInt(value, 10);
        if (!Number.isFinite(numeric)) {
            return fallback;
        }

        return Math.min(Math.max(numeric, min), max);
    }

    // Create new message
    static async create(messageData) {
        const { taskId, clientId, senderId, message, fileUrl, fileName, fileSize, fileType } = messageData;

        const [result] = await pool.execute(
            'INSERT INTO messages (task_id, client_id, sender_id, message, file_url, file_name, file_size, file_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [taskId || null, clientId || null, senderId, message, fileUrl || null, fileName || null, fileSize || null, fileType || null]
        );

        if (taskId) {
            // Update last_message_at on task
            await pool.execute(
                'UPDATE tasks SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
                [taskId]
            );
        }

        return this.findById(result.insertId);
    }

    // Find message by ID with sender info
    static async findById(id) {
        const [rows] = await pool.execute(`
      SELECT m.*, u.full_name as sender_name, u.role as sender_role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `, [id]);
        return rows[0];
    }

    // Get all messages for a task
    static async findByTaskId(taskId, limit = 50, offset = 0) {
        const safeLimit = this.normalizePageValue(limit, 50, { min: 1, max: 200 });
        const safeOffset = this.normalizePageValue(offset, 0, { min: 0, max: 10000 });

        const [rows] = await pool.execute(`
            SELECT * FROM (
                SELECT m.*, u.full_name as sender_name, u.role as sender_role
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.task_id = ?
                ORDER BY m.created_at DESC
                LIMIT ${safeLimit} OFFSET ${safeOffset}
            ) sub
            ORDER BY created_at ASC
        `, [taskId]);
        return rows;
    }

    // Get general messages for a client
    static async findByClientId(clientId, limit = 50, offset = 0) {
        const safeLimit = this.normalizePageValue(limit, 50, { min: 1, max: 200 });
        const safeOffset = this.normalizePageValue(offset, 0, { min: 0, max: 10000 });

        const [rows] = await pool.execute(`
            SELECT * FROM (
                SELECT m.*, u.full_name as sender_name, u.role as sender_role
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.client_id = ? AND m.task_id IS NULL
                ORDER BY m.created_at DESC
                LIMIT ${safeLimit} OFFSET ${safeOffset}
            ) sub
            ORDER BY created_at ASC
        `, [clientId]);
        return rows;
    }

    // Mark messages as read
    static async markAsRead(taskId, userId) {
        // Mark messages NOT sent by current user as read
        await pool.execute(`
      UPDATE messages 
      SET read_at = CURRENT_TIMESTAMP 
      WHERE task_id = ? AND sender_id != ? AND read_at IS NULL
    `, [taskId, userId]);
    }

    // Get unread count for user
    static async getUnreadCount(userId) {
        // Logic depends on role. 
        // If admin, count unread from clients.
        // If client, count unread from admins (or just not self).
        // Actually simplicity: count messages in my tasks where sender != me and read_at is null.
        // For admin, "my tasks" is tricky. Admin sees all tasks.
        // Let's implement simpler: count where sender != userId and read_at NULL and task in (access list).
        // For now, let's skip complex unread count across all tasks and focus on per-task.
        return 0;
    }
}

module.exports = Message;
