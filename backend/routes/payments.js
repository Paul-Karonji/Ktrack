const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

/**
 * @route POST /api/payments/verify
 * @desc Verify a transaction after frontend completion
 * @access Private (Client/Admin)
 */
router.post('/verify', authenticate, (req, res) => paymentController.verifyPayment(req, res));

/**
 * @route POST /api/payments/webhook
 * @desc Handle Paystack Webhooks
 * @access Public (Signature verified in controller)
 */
router.post('/webhook', (req, res) => paymentController.handleWebhook(req, res));

/**
 * @route GET /api/payments
 * @desc Fetch all successful project payments
 * @access Private (Admin)
 */
router.get('/', authenticate, (req, res) => paymentController.getPayments(req, res));

module.exports = router;
