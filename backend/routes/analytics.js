const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, requireAdmin: requireAdminMiddleware } = require('../middleware/auth');

// All analytics routes require authentication
router.use(authenticate);

router.use(requireAdminMiddleware);

// Executive KPIs
router.get('/kpis', analyticsController.getKPIs);

// Revenue Analytics
router.get('/revenue', analyticsController.getRevenueAnalytics);

// Task Pipeline
router.get('/pipeline', analyticsController.getTaskPipeline);

// Client Analytics
router.get('/clients/growth', analyticsController.getClientGrowth);

// Task Analytics
router.get('/tasks/status', analyticsController.getTaskStatus);

module.exports = router;
