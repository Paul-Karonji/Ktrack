const { pool } = require('../config/database');

/**
 * Notification model — aligned with the live DB schema:
 * id, recipient_type ENUM('admin','mentor','project'), recipient_id,
 * notification_type, title, message, related_project_id, is_read, created_at
 *
 * recipient_type mapping used in this app:
 *   'mentor'  → registered clients (users table)
 *   'admin'   → admin users
 *   'project' → (unused for now)
 */
class Notification {
    /**
     * @param {object} opts
     * @param {number} opts.recipientId      - The user ID to notify
     * @param {string} [opts.recipientType]  - 'mentor' (client) | 'admin'. Defaults to 'mentor'
     * @param {string} opts.type             - notification_type e.g. 'new_task', 'status_update'
     * @param {string} opts.message          - Body text
     * @param {string} [opts.title]          - Title label. Defaults to 'Notification'
     * @param {number} [opts.relatedProjectId] - optional task/project id
     */
    static async create({ recipientId, recipientType = 'mentor', type, message, title = 'Notification', relatedProjectId = null }) {
        try {
            const [result] = await pool.execute(
                `INSERT INTO notifications
                    (recipient_id, recipient_type, notification_type, title, message, related_project_id)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [recipientId, recipientType, type, title, message, relatedProjectId]
            );
            return result.insertId;
        } catch (e) {
            console.error('Notification creation failed:', e.message);
            return null; // Never crash the caller — notifications are non-critical
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
