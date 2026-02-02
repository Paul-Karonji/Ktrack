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

module.exports = {
    register,
    login,
    logout,
    getCurrentUser,
    refreshToken
};
