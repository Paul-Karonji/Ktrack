const express = require('express');
const router = express.Router();
const TaskController = require('../controllers/taskController');
const FileController = require('../controllers/fileController');
const { validateTask, validateId } = require('../middleware/validation');
const { authenticate: auth } = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const upload = require('../middleware/upload');

// Apply authentication to all routes
router.use(auth);

router.get('/', TaskController.getAllTasks);
router.post('/', validateTask, TaskController.createTask);
router.put('/:id', validateId, validateTask, TaskController.updateTask);
router.patch('/:id/toggle-payment', validateId, TaskController.togglePayment);
router.delete('/:id', validateId, TaskController.deleteTask);
router.post('/:id/quote', authorize(['admin']), validateId, TaskController.sendQuote);
router.post('/:id/quote/respond', validateId, TaskController.respondToQuote);

// File routes mounted under /api/tasks
router.post('/:taskId/files', validateId, upload.array('files', 10), FileController.uploadFile);
router.get('/:taskId/files', validateId, FileController.getTaskFiles);

module.exports = router;