const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireAdmin, requireSuperadmin } = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Tutors list – accessible to any authenticated user (clients need it to assign tasks)
router.get('/tutors', authenticate, authorize(['client', 'tutor', 'superadmin']), async (req, res) => {
    const User = require('../models/User');
    try {
        const tutors = await User.findTutors();
        res.json(tutors);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch tutors' });
    }
});

// All remaining routes require authentication and admin role
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

// Superadmin specific routes
router.post('/tutors', requireSuperadmin, userController.createTutor);

// Guest merging routes
router.get('/guests/search', userController.searchGuests);
router.get('/:id/matches', userController.findPotentialGuestMatches);
router.post('/:id/merge/:guestId', userController.mergeGuestIntoUser);

module.exports = router;
