const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, requireAdmin, requireClient } = require('../middleware/auth');

/**
 * @route POST /api/payments/initialize
 * @desc  Create a server-side payment intent before opening Paystack popup.
 *        Returns a nonce + server-computed amount to embed in Paystack metadata.
 * @access Private (Client/Admin)
 */
router.post('/initialize', authenticate, (req, res) => paymentController.initializePayment(req, res));

/**
 * @route POST /api/payments/verify
 * @desc Verify a transaction after frontend completion
 * @access Private (Client/Admin)
 */
router.post('/verify', authenticate, (req, res) => paymentController.verifyPayment(req, res));

router.get('/outstanding-summary', authenticate, requireClient, (req, res) => paymentController.getOutstandingSummary(req, res));
router.post('/initialize-bulk', authenticate, requireClient, (req, res) => paymentController.initializeBulkPayment(req, res));
router.post('/verify-bulk', authenticate, requireClient, (req, res) => paymentController.verifyBulkPayment(req, res));

/**
 * @route POST /api/payments/webhook
 * @desc Handle Paystack Webhooks
 * @access Public (Signature verified in controller)
 */
router.post('/webhook', (req, res) => paymentController.handleWebhook(req, res));

/**
 * @route GET /api/payments
 * @desc Fetch all successful project payments
 * @access Private (Admin only) — F-04 fix: added requireAdmin
 */
router.get('/', authenticate, requireAdmin, (req, res) => paymentController.getPayments(req, res));
router.get('/settings', authenticate, requireAdmin, (req, res) => paymentController.getPaymentSettings(req, res));
router.put('/settings', authenticate, requireAdmin, (req, res) => paymentController.updatePaymentSettings(req, res));

module.exports = router;
