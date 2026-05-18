const crypto = require('crypto');
const User = require('../models/User');
const { generateTokens } = require('../utils/jwt');

// Register new user (client)
const register = async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const { email, password, fullName, phoneNumber, course, referralCode } = req.body;

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

        // Check for existing guest record with same email
        const GuestClient = require('../models/GuestClient');
        const existingGuest = await GuestClient.findPotentialMatches(fullName, email, phoneNumber);
        const hasGuestMatch = existingGuest && existingGuest.length > 0;

        if (hasGuestMatch) {
            console.log(`[${requestId}] [Auth] Potential guest match found for registration: ${email}`);
        }

        // Handle Referral Code
        let referredBy = null;
        if (referralCode) {
            const referrer = await User.findByReferralCode(referralCode);
            if (referrer) {
                referredBy = referrer.id;
                console.log(`[${requestId}] [Auth] User referred by: ${referrer.id}`);
            } else {
                console.log(`[${requestId}] [Auth] Invalid referral code provided: ${referralCode}`);
            }
        }

        // Create user
        const user = await User.create({
            email,
            password,
            fullName,
            phoneNumber,
            course,
            role: 'client',
            referredBy
        });

        console.log(`[${requestId}] [Auth] ✅ User registered successfully: ${user.id} (${email})`);

        if (hasGuestMatch) {
            console.log(`[${requestId}] [Auth] ✅ User ${user.id} flagged as potential guest merge.`);
        }

        const EmailService = require('../services/emailService');
        const templates = require('../templates/emailTemplates');

        // Generate email verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await User.setVerificationToken(user.id, verificationToken, tokenExpires);

        // Send verification email to the new user
        try {
            const verificationUrl = `${process.env.CLIENT_URL || 'https://ktrack.vercel.app'}/verify-email?token=${verificationToken}`;
            const { subject, html } = templates.emailVerification(user, verificationUrl);
            EmailService.notifyClient({ to: user.email, subject, html }).catch(err =>
                console.error(`[${requestId}] [Auth] Failed to send verification email:`, err)
            );
        } catch (emailError) {
            console.error(`[${requestId}] [Auth] Failed to prepare verification email:`, emailError);
        }

        res.status(201).json({
            message: 'Registration successful! Please check your email to verify your account.',
            requiresVerification: true,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                status: user.status,
                referralCode: user.referral_code,
                referralDiscountBalance: user.referral_discount_balance
            }
        });
    } catch (error) {
        const logger = require('../utils/logger');
        logger.error(`[${requestId}] [Auth] Registration error: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: 'Registration failed. Please try again later.' });
    }
};

// Verify email address
const verifyEmail = async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        const user = await User.findByVerificationToken(token);
        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired verification link. Please request a new one.' });
        }

        if (user.email_verified) {
            return res.status(200).json({ message: 'Email already verified. You can log in.' });
        }

        await User.markEmailVerified(user.id);
        console.log(`[${requestId}] [Auth] ✅ Email verified for user: ${user.id} (${user.email})`);

        // Notify all admins/tutors via in-app notification
        const Notification = require('../models/Notification');
        const admins = await User.findTutors();
        for (const admin of admins) {
            Notification.create({
                recipientId: admin.id,
                recipientType: 'admin',
                type: 'new_registration',
                message: `New client ${user.full_name} has joined and verified their email`
            }).catch(e => console.error('Failed to create admin notification:', e));
        }

        // Send welcome email to the user
        const EmailService = require('../services/emailService');
        EmailService.sendApprovalEmail(user.email, user.full_name || 'Client').catch(err =>
            console.error(`[${requestId}] [Auth] Failed to send welcome email:`, err)
        );

        res.json({ success: true, message: 'Email verified! Your account is now active. You can log in.' });
    } catch (error) {
        console.error(`[${requestId}] [Auth] Verify email error:`, error);
        res.status(500).json({ error: 'Email verification failed. Please try again.' });
    }
};

// Resend verification email
const resendVerification = async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await User.findByEmail(email);
        if (!user || user.status !== 'pending' || user.email_verified) {
            // Return 200 regardless to avoid email enumeration
            return res.json({ message: 'If an unverified account exists for that email, a new link has been sent.' });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await User.setVerificationToken(user.id, verificationToken, tokenExpires);

        const EmailService = require('../services/emailService');
        const templates = require('../templates/emailTemplates');
        const verificationUrl = `${process.env.CLIENT_URL || 'https://ktrack.vercel.app'}/verify-email?token=${verificationToken}`;
        const { subject, html } = templates.emailVerification(user, verificationUrl);
        EmailService.notifyClient({ to: user.email, subject, html }).catch(err =>
            console.error(`[${requestId}] [Auth] Failed to resend verification email:`, err)
        );

        console.log(`[${requestId}] [Auth] ✅ Verification email resent to: ${email}`);
        res.json({ message: 'If an unverified account exists for that email, a new link has been sent.' });
    } catch (error) {
        console.error(`[${requestId}] [Auth] Resend verification error:`, error);
        res.status(500).json({ error: 'Failed to resend verification email. Please try again.' });
    }
};

// Forgot password — send reset link
const forgotPassword = async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await User.findByEmail(email);

        if (user && user.status === 'approved') {
            const resetToken = crypto.randomBytes(32).toString('hex');
            const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await User.setPasswordResetToken(user.id, resetToken, tokenExpires);

            const EmailService = require('../services/emailService');
            const templates = require('../templates/emailTemplates');
            const resetUrl = `${process.env.CLIENT_URL || 'https://ktrack.vercel.app'}/reset-password?token=${resetToken}`;
            const { subject, html } = templates.passwordReset(user, resetUrl);
            EmailService.notifyClient({ to: user.email, subject, html }).catch(err =>
                console.error(`[${requestId}] [Auth] Failed to send password reset email:`, err)
            );

            console.log(`[${requestId}] [Auth] ✅ Password reset email sent to: ${email}`);
        }

        // Always return 200 — don't reveal if the email exists
        res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (error) {
        console.error(`[${requestId}] [Auth] Forgot password error:`, error);
        res.status(500).json({ error: 'Failed to process password reset request. Please try again.' });
    }
};

// Reset password with token
const resetPassword = async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
            });
        }

        const user = await User.findByPasswordResetToken(token);
        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
        }

        const bcrypt = require('bcrypt');
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await User.updatePassword(user.id, newPasswordHash);
        await User.clearPasswordResetToken(user.id);

        console.log(`[${requestId}] [Auth] ✅ Password reset successfully for user: ${user.id}`);
        res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
    } catch (error) {
        console.error(`[${requestId}] [Auth] Reset password error:`, error);
        res.status(500).json({ error: 'Failed to reset password. Please try again.' });
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
            const isPendingVerification = !user.email_verified || user.email_verified === 0;
            console.log(`[${requestId}] [Auth] Login blocked: Account pending (email_verified=${user.email_verified})`);
            return res.status(403).json({
                error: isPendingVerification
                    ? 'Please verify your email address. Check your inbox for the verification link.'
                    : 'Your account is pending admin approval.',
                status: 'pending',
                requiresVerification: isPendingVerification
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
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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
                course: user.course,
                status: user.status,
                createdAt: user.created_at,
                referralCode: user.referral_code,
                referralDiscountBalance: user.referral_discount_balance
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
            status: user.status,
            createdAt: user.created_at,
            referralCode: user.referral_code,
            referralDiscountBalance: user.referral_discount_balance
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

        // Security Check: Only superadmins can delete users
        if (req.user.role !== 'superadmin') {
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
                course: updatedUser.course,
                referralCode: updatedUser.referral_code,
                referralDiscountBalance: updatedUser.referral_discount_balance
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
                course: updatedUser.course,
                referralCode: updatedUser.referral_code,
                referralDiscountBalance: updatedUser.referral_discount_balance
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
    updateEmail,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword
};
