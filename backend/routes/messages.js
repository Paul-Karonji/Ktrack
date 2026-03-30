const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/messageController');
const { authenticate: auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get messages for a task
router.get('/tasks/:taskId', auth, MessageController.getMessages);

// Send message
router.post('/tasks/:taskId', auth, MessageController.sendMessage);

// Mark messages as read
router.put('/tasks/:taskId/read', auth, MessageController.markRead);

// Upload file to message
router.post('/tasks/:taskId/file', auth, upload.single('file'), MessageController.uploadFile);

// Download file from message
router.get('/file/:messageId', auth, MessageController.downloadFile);

// --- General Messages ---
// Get general messages for a client
router.get('/general/:clientId', auth, MessageController.getGeneralMessages);

// Send general message
router.post('/general/:clientId', auth, MessageController.sendGeneralMessage);

// Upload file to general message
router.post('/general/:clientId/file', auth, upload.single('file'), MessageController.uploadGeneralFile);

module.exports = router;
