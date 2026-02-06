const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const authorizeRole = require('../middleware/authorize');
const {
    getAllGuestClients,
    createGuestClient,
    updateGuestClient,
    deleteGuestClient,
    upgradeToRegistered
} = require('../controllers/guestClientController');

// All routes require admin role
router.get('/', authenticate, authorizeRole(['admin']), getAllGuestClients);
router.post('/', authenticate, authorizeRole(['admin']), createGuestClient);
router.put('/:id', authenticate, authorizeRole(['admin']), updateGuestClient);
router.delete('/:id', authenticate, authorizeRole(['admin']), deleteGuestClient);
router.post('/:id/upgrade', authenticate, authorizeRole(['admin']), upgradeToRegistered);

module.exports = router;
