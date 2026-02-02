const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Public routes (No auth required)
router.get('/stats', publicController.getPublicStats);

module.exports = router;
