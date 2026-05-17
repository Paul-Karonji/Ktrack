const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');
const { authenticate, requireSuperadmin } = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Apply authentication to all routes
router.use(authenticate);

// Personal payout requests (Tutors / Admins with assigned tasks)
router.post('/request', authorize(['tutor', 'superadmin']), (req, res) => payoutController.createPayoutRequest(req, res));
router.get('/my-requests', authorize(['tutor', 'superadmin']), (req, res) => payoutController.getMyPayoutRequests(req, res));

// Superadmin Payout Administration
router.get('/admin/all', requireSuperadmin, (req, res) => payoutController.getAllPayoutRequests(req, res));
router.patch('/admin/:id/resolve', requireSuperadmin, (req, res) => payoutController.resolvePayoutRequest(req, res));

module.exports = router;
