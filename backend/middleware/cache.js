const NodeCache = require('node-cache');
// Cache with default TTL of 5 minutes (300 seconds)
const cache = new NodeCache({ stdTTL: 300 });

/**
 * Middleware to cache API responses
 * @param {number} duration - Cache duration in seconds
 * @returns {Array} Middleware function array
 */
const cacheMiddleware = (duration = 300) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Generate cache key based on URL and query params
        // Include user role/ID if specific data is user-dependent (but analytics is admin-wide usually)
        // For date range queries, the query string is essential
        const key = `__express__${req.originalUrl || req.url}`;

        const cachedResponse = cache.get(key);

        if (cachedResponse) {
            return res.json(cachedResponse);
        } else {
            // Override res.json to intercept the response and cache it
            const originalSend = res.json;
            res.json = (body) => {
                cache.set(key, body, duration);
                return originalSend.call(res, body);
            };
            next();
        }
    };
};

/**
 * Invalidate cache for specific routes or keys
 * @param {string} pattern - Keyword or pattern to clear
 */
const invalidateCache = (pattern) => {
    if (!pattern) {
        cache.flushAll();
        return;
    }

    const keys = cache.keys();
    const keysToDelete = keys.filter(key => key.includes(pattern));

    if (keysToDelete.length > 0) {
        cache.del(keysToDelete);
        console.log(`Cleared ${keysToDelete.length} cache keys matching '${pattern}'`);
    }
};

module.exports = {
    cache,
    cacheMiddleware,
    invalidateCache
};
