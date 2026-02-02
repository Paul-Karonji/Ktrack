const User = require('../models/User');

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

const { sendApprovalEmail } = require('../services/emailService');

// Approve user (admin only)
const approveUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.approve(id, req.user.id);

        // Send email notification
        if (user.email) {
            // Run asynchronously, don't block response
            sendApprovalEmail(user.email, user.full_name || 'Client').catch(err =>
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
        res.json({
            message: 'User suspended',
            user
        });
    } catch (error) {
        console.error('Suspend user error:', error);
        res.status(500).json({ error: 'Failed to suspend user' });
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
    getUserStats
};
