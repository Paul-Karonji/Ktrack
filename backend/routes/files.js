const express = require('express');
const router = express.Router();
const FileController = require('../controllers/fileController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All file routes require authentication
router.use(authenticate);

// Note: Task-related file routes have been moved to routes/tasks.js
// - POST /tasks/:taskId/files
// - GET /tasks/:taskId/files

// Get download URL for a file
router.get('/files/:fileId/download', FileController.getDownloadUrl);

// Delete file (admin only check in controller)
router.delete('/files/:fileId', FileController.deleteFile);

module.exports = router;
