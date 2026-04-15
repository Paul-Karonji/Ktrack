const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Strict rate limiter for login only — skipSuccessfulRequests: true so legitimate users aren't locked out
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 failed attempts per 15 minutes
    skipSuccessfulRequests: true,
    message: {
        success: false,
        error: 'Too many login attempts. Please try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limiter for registration — every successful registration counts (no skipSuccessfulRequests)
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 5,                    // max 5 registration attempts per IP per hour
    skipSuccessfulRequests: false,
    message: {
        success: false,
        error: 'Too many registration attempts from this IP. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Public routes with strict rate limiting
router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.all('/login', (req, res) => res.status(405).json({ message: 'Method Not Allowed' }));

// Public routes without strict rate limiting (uses general API limiter from server.js)
router.post('/logout', authController.logout);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);
router.delete('/users/:id', authenticate, authController.rejectUser);

// Settings routes (authenticated users only)
router.put('/profile', authenticate, authController.updateProfile);
router.put('/password', authenticate, authController.changePassword);
router.put('/email', authenticate, authController.updateEmail);

module.exports = router;
