const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

// Authenticate user middleware
const authenticate = async (req, res, next) => {
    try {
        // Get token from header or cookie
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.accessToken;

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Verify token
        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Get user from database
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Check if user is approved
        if (user.status !== 'approved') {
            return res.status(403).json({ error: 'Account not approved' });
        }

        // Attach user to request
        req.user = user;
        console.log(`[DEBUG] Auth PASSED for user ${user.email} (${user.role})`);
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

// Require admin role
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Require client role
const requireClient = (req, res, next) => {
    if (req.user.role !== 'client') {
        return res.status(403).json({ error: 'Client access required' });
    }
    next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.accessToken;

        if (token) {
            const decoded = verifyToken(token);
            if (decoded) {
                const user = await User.findById(decoded.id);
                if (user && user.status === 'approved') {
                    req.user = user;
                }
            }
        }
    } catch (error) {
        // Silently fail for optional auth
    }
    next();
};

module.exports = {
    authenticate,
    requireAdmin,
    requireClient,
    optionalAuth
};
