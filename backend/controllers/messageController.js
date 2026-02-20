const Message = require('../models/Message');
const Task = require('../models/Task');
const User = require('../models/User');
const EmailService = require('../services/emailService');
const templates = require('../templates/emailTemplates');
const Notification = require('../models/Notification');
const r2Service = require('../services/r2Service');

class MessageController {
    static async getMessages(req, res) {
        try {
            const taskId = req.params.taskId;

            // Security Check
            const task = await Task.findById(taskId);
            if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

            if (req.user.role !== 'admin' && task.client_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            const messages = await Message.findByTaskId(taskId);

            // Decorate messages with full file URL
            const decoratedMessages = messages.map(msg => {
                if (msg.file_url) {
                    return {
                        ...msg,
                        file_url: `/api/messages/file/${msg.id}`
                    };
                }
                return msg;
            });

            res.json(decoratedMessages);
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

            // Security Check
            const task = await Task.findById(taskId);
            if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

            if (req.user.role !== 'admin' && task.client_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied' });
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

            // Security Check
            const task = await Task.findById(taskId);
            if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

            if (req.user.role !== 'admin' && task.client_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            await Message.markAsRead(taskId, userId);
            res.json({ success: true });
        } catch (error) {
            console.error('Error marking messages as read:', error);
            res.status(500).json({ success: false, message: 'Failed to mark messages as read' });
        }
    }

    static async uploadFile(req, res) {
        try {
            const { taskId } = req.params;
            const senderId = req.user.id;
            const file = req.file;

            if (!file) {
                return res.status(400).json({ success: false, message: 'No file provided' });
            }

            // Security Check
            const task = await Task.findById(taskId);
            if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

            if (req.user.role !== 'admin' && task.client_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            // Upload to storage (R2/Local)
            const { fileUrl, storedFilename } = await r2Service.uploadToStorage(file, taskId);

            // Create message with file
            const newMessage = await Message.create({
                taskId,
                senderId,
                message: '[File]',
                fileUrl,
                fileName: file.originalname,
                fileSize: file.size,
                fileType: file.mimetype
            });

            res.status(201).json({ success: true, message: newMessage });

            // Send notifications (similar to text messages)
            try {
                if (req.user.role === 'client') {
                    const { subject, html } = templates.newMessage(req.user.full_name, `Sent a file: ${file.originalname}`, taskId);
                    EmailService.notifyAdmin({ subject, html }).catch(e => console.error('Failed to notify admin:', e));
                } else if (req.user.role === 'admin') {
                    const task = await Task.findById(taskId);
                    if (task && task.client_id) {
                        const client = await User.findById(task.client_id);
                        if (client && client.email) {
                            const { subject, html } = templates.newMessageClient(client.full_name, `Sent a file: ${file.originalname}`, taskId);
                            EmailService.sendEmail({ to: client.email, subject, html }).catch(e => console.error('Failed to notify client:', e));
                        }
                    }
                }
            } catch (emailError) {
                console.error('File notification error:', emailError);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            res.status(500).json({ success: false, message: 'Failed to upload file' });
        }
    }

    static async downloadFile(req, res) {
        try {
            const { messageId } = req.params;
            const message = await Message.findById(messageId);

            if (!message || !message.file_url) {
                return res.status(404).json({ success: false, message: 'File not found' });
            }

            // Security Check
            const task = await Task.findById(message.task_id);
            if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

            if (req.user.role !== 'admin' && task.client_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            // Get file from storage
            const fileStream = await r2Service.getFileStream(message.file_url);

            // If it's an image, we want the browser to show it inline
            const isImage = message.file_type && message.file_type.startsWith('image/');

            if (isImage) {
                res.setHeader('Content-Disposition', 'inline');
            } else {
                res.setHeader('Content-Disposition', `attachment; filename="${message.file_name}"`);
            }

            res.setHeader('Content-Type', message.file_type || 'application/octet-stream');

            fileStream.pipe(res);
        } catch (error) {
            console.error('Error downloading file:', error);
            res.status(500).json({ success: false, message: 'Failed to download file' });
        }
    }
}

module.exports = MessageController;
