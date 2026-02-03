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
const { errorHandler, notFound } = require('./middleware/errorHandler');
const requestIdMiddleware = require('./middleware/requestId');

const app = express();
const PORT = process.env.PORT || 3001;

// Test database connection on startup
testConnection();

// Request ID Middleware (for tracking and debugging)
app.use(requestIdMiddleware);

// Security middleware
app.use(
  helmet({
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

// Rate limiting - Separate limiters for auth vs general API
// Auth limiter: Strict to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Relaxed to 100 to prevent lockout during testing
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    success: false,
    error: 'Too many login attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter: More lenient for normal usage
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 2000, // Increased from 1000 to 2000
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

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
// Auth routes get strict rate limiting
app.use('/api/auth', authLimiter, authRoutes);

// Other API routes get general rate limiting
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/tasks', apiLimiter, taskRoutes);
app.use('/api/messages', apiLimiter, messageRoutes);
app.use('/api/public', require('./routes/public')); // No rate limit for public stats
app.use('/api/files', apiLimiter, filesRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
// Serve local uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Serve frontend build ONLY IF it exists (backend-only friendly) ---
const buildDir = path.join(__dirname, '../frontend/build');
if (fs.existsSync(buildDir)) {
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
