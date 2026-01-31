const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/messageController');
const { authenticate: auth } = require('../middleware/auth');
const { validateId } = require('../middleware/validation');

// Get messages for a task
router.get('/tasks/:taskId', auth, MessageController.getMessages);

// Send message
router.post('/tasks/:taskId', auth, MessageController.sendMessage);

// Mark messages as read
router.put('/tasks/:taskId/read', auth, MessageController.markRead);

module.exports = router;
