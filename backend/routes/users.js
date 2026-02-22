const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authenticate, requireAdmin);

router.get('/', userController.getAllUsers);
router.get('/pending', userController.getPendingUsers);
router.get('/stats', userController.getUserStats);
router.put('/:id/approve', userController.approveUser);
router.put('/:id/reject', userController.rejectUser);
router.put('/:id/suspend', userController.suspendUser);
router.put('/:id/unsuspend', userController.unsuspendUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

// Guest merging routes
router.get('/guests/search', userController.searchGuests);
router.get('/:id/matches', userController.findPotentialGuestMatches);
router.post('/:id/merge/:guestId', userController.mergeGuestIntoUser);

module.exports = router;
