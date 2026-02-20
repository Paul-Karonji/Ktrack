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
app.set('trust proxy', 'loopback, linklocal, uniquelocal'); // Standard for safely handling cloud load balancers (Render/Heroku)

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

// Note: CSRF protection is not required here because this API uses JWT Bearer tokens
// in Authorization headers (not cookies). Browsers enforce same-origin policy on
// headers — a cross-site attacker cannot read localStorage or set Authorization headers,
// making the app inherently CSRF-safe. Cookie-based CSRF breaks cross-origin SPA deployments.
app.use(cookieParser());

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
