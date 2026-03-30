const Message = require('../models/Message');
const Task = require('../models/Task');
const User = require('../models/User');
const EmailService = require('../services/emailService');
const templates = require('../templates/emailTemplates');
const Notification = require('../models/Notification');
const r2Service = require('../services/r2Service');
const { getIo } = require('../services/socketService');

const INLINE_SAFE_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
]);

class MessageController {
    static decorateMessage(message) {
        if (!message?.file_url) {
            return message;
        }

        return {
            ...message,
            file_url: `/api/messages/file/${message.id}`
        };
    }

    static toDownloadFilename(value) {
        return String(value || 'download')
            .replace(/[\r\n"]/g, '_')
            .trim() || 'download';
    }

    static async getMessages(req, res) {
        try {
            const taskId = req.params.taskId;
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;

            // Security Check
            const task = await Task.findById(taskId);
            if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

            if (req.user.role !== 'admin' && task.client_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            const messages = await Message.findByTaskId(taskId, limit, offset);

            // Decorate messages with full file URL
            const decoratedMessages = messages.map((msg) => MessageController.decorateMessage(msg));

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
            const decoratedMessage = MessageController.decorateMessage(newMessage);

            // Emit socket event
            try {
                const io = getIo();
                io.to(`task_${taskId}`).emit('new_message', decoratedMessage);
            } catch (err) {
                console.error('Socket error:', err.message);
            }

            res.status(201).json(decoratedMessage);

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
                            recipientId: admin.id,
                            recipientType: 'admin',
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
                                recipientId: client.id,
                                recipientType: 'mentor',
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
            const { fileUrl } = await r2Service.uploadToStorage(file, taskId);

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
            const decoratedMessage = MessageController.decorateMessage(newMessage);

            // Emit socket event
            try {
                const io = getIo();
                io.to(`task_${taskId}`).emit('new_message', decoratedMessage);
            } catch (err) {
                console.error('Socket error:', err.message);
            }

            res.status(201).json({ success: true, message: decoratedMessage });

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
            if (message.task_id) {
                const task = await Task.findById(message.task_id);
                if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

                if (req.user.role !== 'admin' && task.client_id !== req.user.id) {
                    return res.status(403).json({ success: false, message: 'Access denied' });
                }
            } else if (message.client_id) {
                if (req.user.role !== 'admin' && message.client_id !== req.user.id) {
                    return res.status(403).json({ success: false, message: 'Access denied' });
                }
            } else {
                return res.status(404).json({ success: false, message: 'File not found' });
            }

            // Get file from storage
            const fileStream = await r2Service.getFileStream(message.file_url);

            const fileType = String(message.file_type || '').toLowerCase();
            const safeFilename = MessageController.toDownloadFilename(message.file_name);
            const isInlineSafeImage = INLINE_SAFE_IMAGE_TYPES.has(fileType);

            if (isInlineSafeImage) {
                res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
            } else {
                res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
            }

            res.setHeader('Cache-Control', 'private, no-store');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader(
                'Content-Type',
                isInlineSafeImage ? fileType : 'application/octet-stream'
            );

            fileStream.pipe(res);
        } catch (error) {
            console.error('Error downloading file:', error);
            res.status(500).json({ success: false, message: 'Failed to download file' });
        }
    }

    // --- General Messages ---
    
    static async getGeneralMessages(req, res) {
        try {
            const clientId = parseInt(req.params.clientId);
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;

            if (req.user.role !== 'admin' && req.user.id !== clientId) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            const messages = await Message.findByClientId(clientId, limit, offset);

            const decoratedMessages = messages.map((msg) => MessageController.decorateMessage(msg));

            res.json(decoratedMessages);
        } catch (error) {
            console.error('Error fetching general messages:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch messages' });
        }
    }

    static async sendGeneralMessage(req, res) {
        try {
            const { message } = req.body;
            const clientId = parseInt(req.params.clientId);
            const senderId = req.user.id;

            if (!message || !message.trim()) {
                return res.status(400).json({ success: false, message: 'Message cannot be empty' });
            }

            if (req.user.role !== 'admin' && req.user.id !== clientId) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            const newMessage = await Message.create({
                clientId,
                senderId,
                message
            });
            const decoratedMessage = MessageController.decorateMessage(newMessage);

            try {
                const io = getIo();
                io.to(`general_${clientId}`).emit('new_message', decoratedMessage);
            } catch (err) {
                console.error('Socket error:', err.message);
            }

            res.status(201).json(decoratedMessage);

            // Simple notification logic
            if (req.user.role === 'client') {
                const { subject, html } = templates.newMessage(req.user.full_name, message, 'General Info');
                EmailService.notifyAdmin({ subject, html }).catch(e => console.error(e));
            } else if (req.user.role === 'admin') {
                const client = await User.findById(clientId);
                if (client && client.email) {
                    const { subject, html } = templates.newMessageClient(client.full_name, message, 'General Info');
                    EmailService.sendEmail({ to: client.email, subject, html }).catch(e => console.error(e));
                }
            }
        } catch (error) {
            console.error('Error sending general message:', error);
            res.status(500).json({ success: false, message: 'Failed to send message' });
        }
    }

    static async uploadGeneralFile(req, res) {
        try {
            const clientId = parseInt(req.params.clientId);
            const senderId = req.user.id;
            const file = req.file;

            if (!file) {
                return res.status(400).json({ success: false, message: 'No file provided' });
            }

            if (req.user.role !== 'admin' && req.user.id !== clientId) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            const { fileUrl } = await r2Service.uploadToStorage(file, `general_${clientId}`);

            const newMessage = await Message.create({
                clientId,
                senderId,
                message: '[File]',
                fileUrl,
                fileName: file.originalname,
                fileSize: file.size,
                fileType: file.mimetype
            });
            const decoratedMessage = MessageController.decorateMessage(newMessage);

            try {
                const io = getIo();
                io.to(`general_${clientId}`).emit('new_message', decoratedMessage);
            } catch (err) {
                console.error('Socket error:', err.message);
            }

            res.status(201).json({ success: true, message: decoratedMessage });
        } catch (error) {
            console.error('Error uploading general file:', error);
            res.status(500).json({ success: false, message: 'Failed to upload file' });
        }
    }
}

module.exports = MessageController;
