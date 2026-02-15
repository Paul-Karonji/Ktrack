// backend/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Validate environment variables before starting
const { validateEnvironment } = require('./config/validateEnv');
validateEnvironment();

const { testConnection } = require('./config/database');
const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const filesRoutes = require('./routes/files');
const notificationRoutes = require('./routes/notifications');
const messageRoutes = require('./routes/messages');
const analyticsRoutes = require('./routes/analytics');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const requestIdMiddleware = require('./middleware/requestId');

const app = express();
const PORT = process.env.PORT || 3001;

// GLOBAL DEBUG LOGGER - FIRST MIDDLEWARE
app.use((req, res, next) => {
  const fs = require('fs');
  const log = `[${new Date().toISOString()}] ${req.method} ${req.url}\nHeaders: ${JSON.stringify(req.headers)}\n\n`;
  try {
    fs.appendFileSync('debug_global_top.log', log);
  } catch (e) { }
  console.log(`[DEBUG TOP] Received ${req.method} ${req.url}`);
  next();
});

// Test database connection on startup
testConnection();

// Request ID Middleware (for tracking and debugging)
app.use(requestIdMiddleware);

const logger = require('./utils/logger');

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "cdn.jsdelivr.net"],
        fontSrc: ["'self'", "fonts.gstatic.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"]
      }
    },
    frameguard: { action: 'deny' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// Trust proxy (Required for rate limiting behind proxies like Vercel/Render/Ngrok)
// Fixes: ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set('trust proxy', 1);

// Rate limiting - General API limiter for most endpoints
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200, // Reduced from 2000 to 200 per audit
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.security('Rate Limit Exceeded', { ip: req.ip });
    res.status(options.statusCode).json(options.message);
  }
});

// Debug Logging Middleware (Moved to top)
app.use((req, res, next) => {
  const fs = require('fs');
  const log = `[${new Date().toISOString()}] ${req.method} ${req.url}\nHeaders: ${JSON.stringify(req.headers)}\n\n`;
  try {
    fs.appendFileSync('debug_global.log', log);
  } catch (e) { console.error('Logging failed', e); }
  // logger.info(`[DEBUG] Received ${req.method} ${req.url}`); // Optional: use winston instead of console
  console.log(`[DEBUG] Received ${req.method} ${req.url}`);
  console.log('[DEBUG] Body:', JSON.stringify(req.body));
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// JSON Parse Error Handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const fs = require('fs');
    fs.appendFileSync('debug_global.log', `[${new Date().toISOString()}] JSON PARSE ERROR: ${err.message}\n\n`);
    logger.error(`JSON Parse Error: ${err.message}`);
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }
  next();
});

// CSRF Protection
const csrf = require('csurf');
// const cookieParser = require('cookie-parser'); // Already imported at the top

app.use(cookieParser()); // Ensure cookie-parser is used before csrf

// CSRF Middleware - strict cookie setting
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' ? true : false, // Ensure this matches user's deployment (HTTPS)
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // 'none' is required for cross-site if frontend/backend are on different domains, otherwise 'strict' or 'lax'. changing to 'lax' or 'none' might help if domains differ.
  }
});

// Apply CSRF protection to all unsafe methods (POST, PUT, DELETE)
// For safe methods (GET, HEAD, OPTIONS), it just sets the token
// We apply this globally or selectively. For now, let's apply globally but exclude public/webhook routes if any.
// Note: Since this is an API, we must ensure the frontend sends the X-CSRF-Token header.

// New Route to get CSRF Token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Middleware to check CSRF on mutations - Apply to all /api routes except GET
// OR simply applying `csrfProtection` to specific routes.
// A common pattern for SPAs is to apply it globally but handle the error gracefully.
app.use((req, res, next) => {
  // Skip CSRF for specific paths if needed (e.g. webhooks)
  if (req.path === '/api/csrf-token') return next();

  csrfProtection(req, res, next);
});

// CSRF Error Handler
app.use((err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);

  // Handle CSRF token errors here
  logger.security('CSRF Token Invalid/Missing', { ip: req.ip, user: req.user?.email });
  res.status(403);
  res.json({
    error: 'Invalid or missing CSRF token',
    code: 'CSRF_ERROR'
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes with rate limiting
// Auth routes get general rate limiting (login/register have their own strict limiter)
app.use('/api/auth', apiLimiter, authRoutes);

// Other API routes get general rate limiting
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/tasks', apiLimiter, taskRoutes);
app.use('/api/messages', apiLimiter, messageRoutes);
app.use('/api/analytics', apiLimiter, analyticsRoutes);
app.use('/api/public', require('./routes/public')); // No rate limit for public stats
app.use('/api/files', apiLimiter, filesRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/guest-clients', apiLimiter, require('./routes/guestClients')); // Guest Client Routes
// Serve local uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Serve frontend build ONLY IF it exists (backend-only friendly) ---
const buildDir = path.join(__dirname, '../frontend/build');
if (process.env.NODE_ENV === 'production' && fs.existsSync(buildDir)) {
  app.use(express.static(buildDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(buildDir, 'index.html'));
  });
} else {
  // Backend-only root route so hitting the service URL is friendly
  app.get('/', (_req, res) => {
    res.status(200).send('API is running (backend-only deploy)');
  });
}

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
