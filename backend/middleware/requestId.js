// backend/middleware/requestId.js
const { v4: uuidv4 } = require('uuid');

/**
 * Request ID Middleware
 * Generates a unique ID for each request for tracking and debugging
 */
const requestIdMiddleware = (req, res, next) => {
    // Generate unique request ID
    const requestId = uuidv4();

    // Attach to request object
    req.requestId = requestId;

    // Add to response headers for client-side tracking
    res.setHeader('X-Request-ID', requestId);

    // Log request with ID
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${requestId}] ${req.method} ${req.url}`);

    next();
};

module.exports = requestIdMiddleware;
