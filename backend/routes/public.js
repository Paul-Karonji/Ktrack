const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const publicController = require('../controllers/publicController');
const paymentController = require('../controllers/paymentController');
const logger = require('../utils/logger');

const publicReadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many public requests. Please try again shortly.'
    },
    handler: (req, res, _next, options) => {
        logger.security('Public route rate limit exceeded', { ip: req.ip });
        res.status(options.statusCode).json(options.message);
    }
});

const publicPaymentWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many payment attempts. Please wait a few minutes and try again.'
    },
    handler: (req, res, _next, options) => {
        logger.security('Guest payment public write limit exceeded', { ip: req.ip });
        res.status(options.statusCode).json(options.message);
    }
});

// Public routes (No auth required)
router.get('/stats', publicReadLimiter, publicController.getPublicStats);
router.get('/payments/guest/:token', publicReadLimiter, (req, res) => paymentController.getGuestPaymentLinkDetails(req, res));
router.post('/payments/guest/:token/initialize', publicPaymentWriteLimiter, (req, res) => paymentController.initializeGuestPayment(req, res));
router.post('/payments/guest/:token/verify', publicPaymentWriteLimiter, (req, res) => paymentController.verifyGuestPayment(req, res));

module.exports = router;
