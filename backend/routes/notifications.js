const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken); // Protect all routes

router.get('/', NotificationController.getNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);
router.put('/:id/read', NotificationController.markRead);
router.put('/:id/read', NotificationController.markRead);
router.put('/read-all', NotificationController.markAllRead);
router.post('/test-email', NotificationController.sendTestEmail);

module.exports = router;
