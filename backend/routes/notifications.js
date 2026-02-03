const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate); // Protect all routes

router.get('/', NotificationController.getNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);
router.put('/:id/read', NotificationController.markRead);
router.put('/:id/read', NotificationController.markRead);
router.put('/read-all', NotificationController.markAllRead);
router.post('/test-email', NotificationController.sendTestEmail);

module.exports = router;
