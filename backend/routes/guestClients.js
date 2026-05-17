const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin, requireSuperadmin } = require('../middleware/auth');
const {
    getAllGuestClients,
    createGuestClient,
    updateGuestClient,
    deleteGuestClient,
    upgradeToRegistered
} = require('../controllers/guestClientController');

// Routes require authenticating and role-scoped permissions
router.get('/', authenticate, requireAdmin, getAllGuestClients);
router.post('/', authenticate, requireSuperadmin, createGuestClient);
router.put('/:id', authenticate, requireSuperadmin, updateGuestClient);
router.delete('/:id', authenticate, requireSuperadmin, deleteGuestClient);
router.post('/:id/upgrade', authenticate, requireSuperadmin, upgradeToRegistered);

module.exports = router;
