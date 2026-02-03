const Notification = require('../models/Notification');

class NotificationController {
    static async getNotifications(req, res) {
        try {
            const notifications = await Notification.findByUserId(req.user.id);
            res.json(notifications);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    }

    static async getUnreadCount(req, res) {
        try {
            const count = await Notification.getUnreadCount(req.user.id);
            res.json({ count });
        } catch (error) {
            console.error('Error fetching unread count:', error);
            res.status(500).json({ error: 'Failed to fetch count' });
        }
    }

    static async markRead(req, res) {
        try {
            await Notification.markAsRead(req.params.id, req.user.id);
            res.json({ success: true });
        } catch (error) {
            console.error('Error marking notification read:', error);
            res.status(500).json({ error: 'Failed to mark read' });
        }
    }

    static async markAllRead(req, res) {
        try {
            await Notification.markAllAsRead(req.user.id);
            res.json({ success: true });
        } catch (error) {
            console.error('Error marking all read:', error);
            res.status(500).json({ error: 'Failed to mark all read' });
        }
    }

    static async sendTestEmail(req, res) {
        try {
            const EmailService = require('../services/emailService');
            // Allow sending to specific email or default to current user
            const to = req.body.to || req.user.email;

            if (!to) {
                return res.status(400).json({ error: 'Recipient email required' });
            }

            await EmailService.sendTestEmail(to);
            res.json({ success: true, message: `Test email sent to ${to}` });
        } catch (error) {
            console.error('Test email error:', error);
            res.status(500).json({ error: 'Failed to send test email' });
        }
    }
}

module.exports = NotificationController;
