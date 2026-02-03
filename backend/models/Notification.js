const { pool } = require('../config/database');

class Notification {
    static async create({ userId, type, message }) {
        const [result] = await pool.execute(
            'INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
            [userId, type, message]
        );
        return result.insertId;
    }

    static async findByUserId(userId) {
        const [rows] = await pool.execute(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        return rows;
    }

    static async markAsRead(id, userId) {
        await pool.execute(
            'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return true;
    }

    static async markAllAsRead(userId) {
        await pool.execute(
            'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL',
            [userId]
        );
        return true;
    }

    static async getUnreadCount(userId) {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL',
            [userId]
        );
        return rows[0].count;
    }
}

module.exports = Notification;
