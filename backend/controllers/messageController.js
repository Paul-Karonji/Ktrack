const Message = require('../models/Message');

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
