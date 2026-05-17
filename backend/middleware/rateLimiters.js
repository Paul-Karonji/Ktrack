const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Strict rate limiter for file uploads (resource-heavy DDOS protection)
const fileUploadLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 15, // Max 15 file uploads per 10 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many file uploads from this IP. Please try again in 10 minutes.'
    },
    handler: (req, res, _next, options) => {
        logger.security('File upload rate limit exceeded', { ip: req.ip, userId: req.user?.id });
        res.status(options.statusCode).json(options.message);
    }
});

// Rate limiter for chat messages (prevents automated chat flooding/spam)
const chatMessageLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // Max 30 messages per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'You are sending messages too quickly. Please slow down and try again shortly.'
    },
    handler: (req, res, _next, options) => {
        logger.security('Chat message rate limit exceeded', { ip: req.ip, userId: req.user?.id });
        res.status(options.statusCode).json(options.message);
    }
});

// Rate limiter for payment initializations and verifications (prevents endpoint flooding)
const paymentActivityLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 15, // Max 15 payment transactions attempts per 5 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many payment verification attempts. Please wait a few minutes and try again.'
    },
    handler: (req, res, _next, options) => {
        logger.security('Payment activity rate limit exceeded', { ip: req.ip, userId: req.user?.id });
        res.status(options.statusCode).json(options.message);
    }
});

module.exports = {
    fileUploadLimiter,
    chatMessageLimiter,
    paymentActivityLimiter
};
