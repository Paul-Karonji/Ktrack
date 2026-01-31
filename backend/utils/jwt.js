const jwt = require('jsonwebtoken');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRES_IN = '15m'; // Access token expires in 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // Refresh token expires in 7 days

// Generate access token
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

// Generate refresh token
const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email
        },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );
};

// Verify token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

// Generate both tokens
const generateTokens = (user) => {
    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user)
    };
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
    generateTokens,
    JWT_SECRET
};
