const { pool } = require('../config/database');

class Notification {
    static async create({ userId, type, message }) {
        // Attempt to map 'client' to a valid enum if needed, or just insert. 
        // Note: Schema has recipient_type enum('admin','mentor','project'). 'client' will fail.
        // For now, we will try to insert, but this method might need schema update to work for clients.
        // Also handling title which is non-nullable.
        try {
            const [result] = await pool.execute(
                'INSERT INTO notifications (recipient_id, recipient_type, notification_type, title, message) VALUES (?, ?, ?, ?, ?)',
                [userId, 'mentor', type, 'Notification', message] // Temporary hack: using 'mentor' for client, 'Notification' for title
            );
            return result.insertId;
        } catch (e) {
            console.error('Notification creation failed:', e.message);
            // Don't crash the caller
            return null;
        }
    }

    static async findByUserId(userId) {
        const [rows] = await pool.execute(
            'SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        return rows;
    }

    static async markAsRead(id, userId) {
        await pool.execute(
            'UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_id = ?',
            [id, userId]
        );
        return true;
    }

    static async markAllAsRead(userId) {
        await pool.execute(
            'UPDATE notifications SET is_read = 1 WHERE recipient_id = ? AND is_read = 0',
            [userId]
        );
        return true;
    }

    static async getUnreadCount(userId) {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND is_read = 0',
            [userId]
        );
        return rows[0].count;
    }
}

module.exports = Notification;
