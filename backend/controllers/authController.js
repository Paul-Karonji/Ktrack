const User = require('../models/User');
const { generateTokens } = require('../utils/jwt');

// Register new user (client)
const register = async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const { email, password, fullName, phoneNumber, course } = req.body;

        // Validation
        if (!email || !password || !fullName) {
            console.log(`[${requestId}] [Auth] Registration failed: Missing required fields`);
            return res.status(400).json({ error: 'Email, password, and full name are required' });
        }

        // Strong Password Validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
            });
        }

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            console.log(`[${requestId}] [Auth] Registration failed: Email already exists: ${email}`);
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create user
        const user = await User.create({
            email,
            password,
            fullName,
            phoneNumber,
            course,
            role: 'client'
        });

        console.log(`[${requestId}] [Auth] ✅ User registered successfully: ${user.id} (${email})`);

        // Notify Admin
        const EmailService = require('../services/emailService');
        const templates = require('../templates/emailTemplates');

        try {
            const { subject, html } = templates.newRegistration(user);
            EmailService.notifyAdmin({ subject, html }).catch(err =>
                console.error(`[${requestId}] [Auth] Failed to send admin notification:`, err)
            );
        } catch (emailError) {
            console.error(`[${requestId}] [Auth] Failed to prepare admin notification:`, emailError);
        }

        // Send confirmation email to the new user
        try {
            const { subject, html } = templates.registrationConfirmation(user);
            EmailService.notifyClient({ to: user.email, subject, html }).catch(err =>
                console.error(`[${requestId}] [Auth] Failed to send user confirmation email:`, err)
            );
        } catch (emailError) {
            console.error(`[${requestId}] [Auth] Failed to prepare user confirmation email:`, emailError);
        }

        res.status(201).json({
            message: 'Registration successful! Your account is pending admin approval.',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                status: user.status
            }
        });
    } catch (error) {
        console.error(`[${requestId}] [Auth] Registration error:`, error);
        try {
            const fs = require('fs');
            fs.appendFileSync('debug_error.log', `[${new Date().toISOString()}] REGISTRATION ERROR: ${error.message}\nStack: ${error.stack}\n\n`);
        } catch (e) { }
        res.status(500).json({ error: 'Registration failed. Please try again later.' });
    }
};

// Login
const login = async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            console.log(`[${requestId}] [Auth] Login failed: Missing credentials`);
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if user exists
        const user = await User.findByEmail(email);
        console.log(`[${requestId}] [Auth] Login attempt for: ${email}`);

        if (!user) {
            console.log(`[${requestId}] [Auth] User not found`);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        console.log(`[${requestId}] [Auth] User found: ${user.id} (${user.role}, status: ${user.status})`);

        // Verify password - Use password_hash column
        const isValidPassword = await User.verifyPassword(password, user.password_hash);
        console.log(`[${requestId}] [Auth] Password match: ${isValidPassword}`);

        if (!isValidPassword) {
            console.log(`[${requestId}] [Auth] Invalid password for user: ${email}`);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check user status
        if (user.status === 'pending') {
            console.log(`[${requestId}] [Auth] Login blocked: Account pending approval`);
            return res.status(403).json({
                error: 'Your account is pending admin approval',
                status: 'pending'
            });
        }

        if (user.status === 'rejected') {
            console.log(`[${requestId}] [Auth] Login blocked: Account rejected`);
            return res.status(403).json({
                error: 'Your account has been rejected. Please contact support.',
                status: 'rejected'
            });
        }

        if (user.status === 'suspended') {
            console.log(`[${requestId}] [Auth] Login blocked: Account suspended`);
            return res.status(403).json({
                error: 'Your account has been suspended. Please contact support.',
                status: 'suspended'
            });
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user);
        console.log(`[${requestId}] [Auth] ✅ Login successful for user: ${user.id}`);

        // Set refresh token in HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            message: 'Login successful',
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                fullName: user.full_name,
                phoneNumber: user.phone_number,
                course: user.course
            }
        });
    } catch (error) {
        console.error(`[${requestId}] [Auth] Login error:`, error);
        res.status(500).json({
            error: 'Login failed. Please try again later.',
            requestId: requestId  // Include for support debugging
        });
    }
};

// Logout
const logout = (req, res) => {
    res.clearCookie('refreshToken');
    res.json({ message: 'Logout successful' });
};

// Get current user
const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: user.full_name,
            phoneNumber: user.phone_number,
            course: user.course,
            status: user.status
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Failed to get user data' });
    }
};

// Refresh access token
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;

        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token required' });
        }

        const { verifyToken } = require('../utils/jwt');
        const decoded = verifyToken(refreshToken);

        if (!decoded) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        const user = await User.findById(decoded.id);
        if (!user || user.status !== 'approved') {
            return res.status(401).json({ error: 'User not found or not approved' });
        }

        const { generateAccessToken } = require('../utils/jwt');
        const newAccessToken = generateAccessToken(user);

        res.json({ accessToken: newAccessToken });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ error: 'Token refresh failed' });
    }
};

// Reject/Delete User
const rejectUser = async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const { id } = req.params;

        // Security Check: Only admins can delete users
        if (req.user.role !== 'admin') {
            console.warn(`[${requestId}] [Auth] Unauth delete attempt by user: ${req.user.id}`);
            return res.status(403).json({ error: 'Access denied. Admin rights required.' });
        }

        console.log(`[${requestId}] [Auth] Rejecting (Deleting) user ID: ${id}`);

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Delete the user
        await User.delete(id);
        console.log(`[${requestId}] [Auth] User deleted successfully: ${id}`);

        res.json({ message: 'User rejected and deleted successfully' });

    } catch (error) {
        console.error(`[${requestId}] [Auth] Reject user error:`, error);
        res.status(500).json({ error: 'Failed to reject user' });
    }
};

// Update profile (authenticated user)
const updateProfile = async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const { fullName, phoneNumber, course } = req.body;
        const userId = req.user.id;

        console.log(`[${requestId}] [Auth] Updating profile for user: ${userId}`);

        // Validation
        if (!fullName || fullName.trim().length < 2) {
            return res.status(400).json({ error: 'Full name must be at least 2 characters' });
        }

        // Update user
        const updatedUser = await User.update(userId, {
            full_name: fullName,
            phone_number: phoneNumber || null,
            course: course || null
        });

        console.log(`[${requestId}] [Auth] ✅ Profile updated successfully for user: ${userId}`);

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                role: updatedUser.role,
                fullName: updatedUser.full_name,
                phoneNumber: updatedUser.phone_number,
                course: updatedUser.course
            }
        });
    } catch (error) {
        console.error(`[${requestId}] [Auth] Update profile error:`, error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

// Change password (authenticated user)
const changePassword = async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        console.log(`[${requestId}] [Auth] Password change request for user: ${userId}`);

        // Validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new passwords are required' });
        }

        // Strong Password Validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters long' });
        }
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
            });
        }

        // Get user with password hash
        const user = await User.findByEmail(req.user.email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValidPassword = await User.verifyPassword(currentPassword, user.password_hash);
        if (!isValidPassword) {
            console.log(`[${requestId}] [Auth] Invalid current password`);
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const bcrypt = require('bcrypt');
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        await User.updatePassword(userId, newPasswordHash);

        console.log(`[${requestId}] [Auth] ✅ Password changed successfully for user: ${userId}`);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error(`[${requestId}] [Auth] Change password error:`, error);
        res.status(500).json({ error: 'Failed to change password' });
    }
};

// Update email (authenticated user)
const updateEmail = async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const { newEmail, password } = req.body;
        const userId = req.user.id;

        console.log(`[${requestId}] [Auth] Email update request for user: ${userId}`);

        // Validation
        if (!newEmail || !password) {
            return res.status(400).json({ error: 'New email and password are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Get user with password hash
        const user = await User.findByEmail(req.user.email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify password
        const isValidPassword = await User.verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            console.log(`[${requestId}] [Auth] Invalid password for email update`);
            return res.status(401).json({ error: 'Password is incorrect' });
        }

        // Update email (will throw error if email already exists)
        const updatedUser = await User.updateEmail(userId, newEmail);

        console.log(`[${requestId}] [Auth] ✅ Email updated successfully for user: ${userId}`);

        res.json({
            message: 'Email updated successfully',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                role: updatedUser.role,
                fullName: updatedUser.full_name,
                phoneNumber: updatedUser.phone_number,
                course: updatedUser.course
            }
        });
    } catch (error) {
        console.error(`[${requestId}] [Auth] Update email error:`, error);
        if (error.message === 'Email already in use') {
            return res.status(400).json({ error: 'Email already in use' });
        }
        res.status(500).json({ error: 'Failed to update email' });
    }
};

module.exports = {
    register,
    login,
    logout,
    getCurrentUser,
    refreshToken,
    rejectUser,
    updateProfile,
    changePassword,
    updateEmail
};
