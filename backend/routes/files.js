const express = require('express');
const router = express.Router();
const FileController = require('../controllers/fileController');
const { authenticate: auth } = require('../middleware/auth');

// Apply authentication to all routes
router.use(auth);

// Get all files (with filters)
router.get('/', FileController.getAllFiles);

// Get file statistics
router.get('/stats', FileController.getFileStats);

// Get download URL for a specific file
router.get('/:fileId/download', FileController.getDownloadUrl);

// Delete a file
router.delete('/:fileId', FileController.deleteFile);

module.exports = router;
