const User = require('../models/User');
const { invalidateCache } = require('../middleware/cache');

// Get all users (admin only)
const getAllUsers = async (req, res) => {
    try {
        const { status, role } = req.query;
        const users = await User.findAll({ status, role });
        res.json(users);
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Get pending users (admin only)
const getPendingUsers = async (req, res) => {
    try {
        const users = await User.findPending();
        res.json(users);
    } catch (error) {
        console.error('Get pending users error:', error);
        res.status(500).json({ error: 'Failed to fetch pending users' });
    }
};

const EmailService = require('../services/emailService');
const templates = require('../templates/emailTemplates');

// Approve user (admin only)
const approveUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.approve(id, req.user.id);

        // Invalidate analytics cache (client count changed)
        invalidateCache('/analytics');

        // Send approval email — call as a method to preserve `this` context
        if (user.email) {
            EmailService.sendApprovalEmail(user.email, user.full_name || 'Client').catch(err =>
                console.error('Failed to send approval email:', err)
            );
        }

        res.json({
            message: 'User approved successfully',
            user
        });
    } catch (error) {
        console.error('Approve user error:', error);
        res.status(500).json({ error: 'Failed to approve user' });
    }
};

// Reject user (admin only)
const rejectUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.reject(id);

        // Invalidate analytics cache
        invalidateCache('/analytics');

        // Notify the user their account was not approved
        if (user && user.email) {
            const { subject, html } = templates.accountRejected(user.full_name || 'Applicant');
            EmailService.sendEmail({ to: user.email, subject, html }).catch(err =>
                console.error('Failed to send rejection email:', err)
            );
        }

        res.json({
            message: 'User rejected',
            user
        });
    } catch (error) {
        console.error('Reject user error:', error);
        res.status(500).json({ error: 'Failed to reject user' });
    }
};

// Suspend user (admin only)
const suspendUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.suspend(id);

        // Invalidate analytics cache
        invalidateCache('/analytics');

        // Notify user their account has been suspended
        if (user && user.email) {
            const { subject, html } = templates.accountSuspended(user.full_name || 'Client');
            EmailService.sendEmail({ to: user.email, subject, html }).catch(err =>
                console.error('Failed to send suspension email:', err)
            );
        }

        res.json({
            message: 'User suspended',
            user
        });
    } catch (error) {
        console.error('Suspend user error:', error);
        res.status(500).json({ error: 'Failed to suspend user' });
    }
};

// Unsuspend (reactivate) user (admin only)
const unsuspendUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.unsuspend(id);

        // Invalidate analytics cache
        invalidateCache('/analytics');

        // Notify user their account has been reactivated
        if (user && user.email) {
            const { subject, html } = templates.accountReactivated(user.full_name || 'Client');
            EmailService.sendEmail({ to: user.email, subject, html }).catch(err =>
                console.error('Failed to send reactivation email:', err)
            );
        }

        res.json({
            message: 'User reactivated',
            user
        });
    } catch (error) {
        console.error('Unsuspend user error:', error);
        res.status(500).json({ error: 'Failed to reactivate user' });
    }
};

// Hard delete user (admin only)
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'You cannot delete your own account' });
        }

        const user = await User.delete(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Invalidate analytics cache
        invalidateCache('/analytics');

        res.json({
            message: 'User permanently deleted',
            user
        });
    } catch (error) {
        console.error('Delete user error:', error);

        // Handle foreign key constraint errors more gracefully
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(400).json({
                error: 'Cannot delete user because they have associated records (tasks, messages, etc.). Please delete those first or suspend the account instead.'
            });
        }

        res.status(500).json({ error: 'Failed to delete user' });
    }
};

// Get user stats (admin only)
const getUserStats = async (req, res) => {
    try {
        const stats = await User.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
};

module.exports = {
    getAllUsers,
    getPendingUsers,
    approveUser,
    rejectUser,
    suspendUser,
    unsuspendUser,
    deleteUser,
    getUserStats,

    // Update user (admin)
    updateUser: async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Filter allowed fields
            const allowedUpdates = {};
            if (updates.full_name) allowedUpdates.full_name = updates.full_name;
            if (updates.phone_number) allowedUpdates.phone_number = updates.phone_number;
            if (updates.course) allowedUpdates.course = updates.course;

            const user = await User.update(id, allowedUpdates);

            // Invalidate analytics cache (names might change)
            invalidateCache('/analytics');

            res.json(user);
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({ error: 'Failed to update user' });
        }
    },

    // Merge guest into user (admin only)
    mergeGuestIntoUser: async (req, res) => {
        try {
            const { id, guestId } = req.params;

            // Verify user
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            /* Removed status check to allow merging for already approved users */
            // if (user.status !== 'pending') {
            //     return res.status(400).json({ error: 'Can only merge into pending users' });
            // }

            // Verify guest
            const GuestClient = require('../models/GuestClient');
            const guest = await GuestClient.findById(guestId);
            if (!guest) {
                return res.status(404).json({ error: 'Guest not found' });
            }

            if (guest.upgraded_to_user_id) {
                return res.status(400).json({ error: 'Guest already upgraded/merged' });
            }

            // Transfer tasks
            const Task = require('../models/Task');
            const taskCount = await Task.transferGuestTasks(guestId, id);

            // Mark guest as merged
            await GuestClient.markAsUpgraded(guestId, id);

            // Auto-approve user if they were pending
            if (user.status === 'pending') {
                await User.approve(id, req.user.id);
            }

            // Invalidate analytics (count of guests/users changes)
            invalidateCache('/analytics');

            res.json({
                success: true,
                message: `Merged ${taskCount} tasks and approved user`,
                userId: id,
                taskCount
            });

        } catch (error) {
            console.error('Error merging accounts:', error);
            res.status(500).json({ error: 'Failed to merge accounts' });
        }
    },

    // Find potential guest matches (admin only)
    findPotentialGuestMatches: async (req, res) => {
        const requestId = req.id || 'N/A';
        try {
            const { id } = req.params;
            console.log(`[${requestId}] [UserMatch] Finding matches for user ID: ${id}`);

            const user = await User.findById(id);
            if (!user) {
                console.log(`[${requestId}] [UserMatch] User not found: ${id}`);
                return res.status(404).json({ error: 'User not found' });
            }

            const GuestClient = require('../models/GuestClient');
            const matches = await GuestClient.findPotentialMatches(
                user.full_name,
                user.email,
                user.phone_number
            );

            console.log(`[${requestId}] [UserMatch] Found ${matches.length} matches for ${user.full_name}`);
            res.json({ success: true, matches });
        } catch (error) {
            console.error(`[${requestId}] [UserMatch] Error finding matches:`, error);
            res.status(500).json({ error: 'Failed to find matches: ' + error.message });
        }
    },

    // Manual search for guests (admin only)
    searchGuests: async (req, res) => {
        try {
            const { q } = req.query;
            if (!q) {
                return res.json({ success: true, guests: [] });
            }

            const GuestClient = require('../models/GuestClient');
            const guests = await GuestClient.search(q);

            res.json({ success: true, guests });
        } catch (error) {
            console.error('Error searching guests:', error);
            res.status(500).json({ error: 'Failed to search guests' });
        }
    }
};
