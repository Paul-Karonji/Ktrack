const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cache');

// All analytics routes require admin authentication
router.use(authenticate, requireAdmin);

// Executive KPIs
router.get('/kpis', cacheMiddleware(300), analyticsController.getKPIs);

// Revenue Analytics
router.get('/revenue', cacheMiddleware(300), analyticsController.getRevenueAnalytics);

// Task Pipeline
router.get('/pipeline', cacheMiddleware(300), analyticsController.getTaskPipeline);

// Client Analytics
router.get('/clients/growth', cacheMiddleware(300), analyticsController.getClientGrowth);

// Task Analytics
router.get('/tasks/status', cacheMiddleware(300), analyticsController.getTaskStatus);

// Detailed Financial Analytics
router.get('/financial/detailed', cacheMiddleware(300), analyticsController.getFinancialStats);

// Detailed Client Analytics
router.get('/clients/performance', cacheMiddleware(300), analyticsController.getClientStats);

// Project Timeline
router.get('/projects/timeline', cacheMiddleware(300), analyticsController.getProjectTimeline);

// Activity Heatmap
router.get('/activity/heatmap', cacheMiddleware(300), analyticsController.getActivityHeatmap);

// Storage Analytics
router.get('/storage', cacheMiddleware(300), analyticsController.getStorageAnalytics);

module.exports = router;
