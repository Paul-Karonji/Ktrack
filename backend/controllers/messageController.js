const Message = require('../models/Message');
const Task = require('../models/Task');
const User = require('../models/User');
const EmailService = require('../services/emailService');
const templates = require('../templates/emailTemplates');
const Notification = require('../models/Notification');

class MessageController {
    static async getMessages(req, res) {
        try {
            const messages = await Message.findByTaskId(req.params.taskId);
            res.json(messages);
        } catch (error) {
            console.error('Error fetching messages:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch messages' });
        }
    }

    static async sendMessage(req, res) {
        try {
            const { message } = req.body;
            const taskId = req.params.taskId;
            const senderId = req.user.id; // From auth middleware

            if (!message || !message.trim()) {
                return res.status(400).json({ success: false, message: 'Message cannot be empty' });
            }

            const newMessage = await Message.create({
                taskId,
                senderId,
                message
            });

            res.status(201).json(newMessage);

            // Email Notifications
            try {
                // Determine notification direction
                if (req.user.role === 'client') {
                    // Client sent message -> Notify Admin
                    const { subject, html } = templates.newMessage(req.user.full_name, message, taskId);
                    EmailService.notifyAdmin({ subject, html }).catch(e => console.error('Failed to notify admin of new message:', e));

                    // In-App for all Admins
                    const admins = await User.findAdmins();
                    for (const admin of admins) {
                        Notification.create({
                            userId: admin.id,
                            type: 'new_message',
                            message: `New message from ${req.user.full_name} on Task #${taskId}`
                        }).catch(e => console.error('Failed to create admin notification:', e));
                    }
                } else if (req.user.role === 'admin') {
                    // Admin sent message -> Notify Client
                    const task = await Task.findById(taskId);
                    if (task && task.client_id) {
                        const client = await User.findById(task.client_id);
                        if (client && client.email) {
                            const { subject, html } = templates.newMessageClient(client.full_name, message, taskId);
                            EmailService.sendEmail({ to: client.email, subject, html }).catch(e => console.error('Failed to notify client of new message:', e));

                            // In-App
                            Notification.create({
                                userId: client.id,
                                type: 'new_message',
                                message: `New reply on Task #${taskId} from Admin`
                            }).catch(e => console.error('Failed to create client notification:', e));
                        }
                    }
                }
            } catch (emailError) {
                console.error('Message email error:', emailError);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({ success: false, message: 'Failed to send message' });
        }
    }

    static async markRead(req, res) {
        try {
            const taskId = req.params.taskId;
            const userId = req.user.id;

            await Message.markAsRead(taskId, userId);
            res.json({ success: true });
        } catch (error) {
            console.error('Error marking messages as read:', error);
            res.status(500).json({ success: false, message: 'Failed to mark messages as read' });
        }
    }
}

module.exports = MessageController;
