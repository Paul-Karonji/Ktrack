const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate); // Protect all routes

router.get('/', NotificationController.getNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);
router.put('/:id/read', NotificationController.markRead);
router.put('/read-all', NotificationController.markAllRead);
// F-07 fix: restrict test-email to admins only (was open relay for any authenticated user)
router.post('/test-email', requireAdmin, NotificationController.sendTestEmail);

module.exports = router;
