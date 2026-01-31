// backend/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { testConnection } = require('./config/database');
const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const filesRoutes = require('./routes/files');
const messageRoutes = require('./routes/messages');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Test database connection on startup
testConnection();

// Request Logging Middleware (Added for Debugging)
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

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

// Rate limiting (applies to API routes)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 1000, // Increased to 1000 to handle chat polling
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});
app.use('/api', limiter);

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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api', filesRoutes);
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
