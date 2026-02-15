const jwt = require('jsonwebtoken');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-this' || JWT_SECRET.length < 32) {
    console.error('❌ FATAL: JWT_SECRET is not set, is the default insecure value, or is too short (min 32 chars).');
    console.error('Please set a strong JWT_SECRET in your .env file.');
    process.exit(1); // Exit process to prevent insecure startup
}
const JWT_EXPIRES_IN = '1h'; // Access token expires in 1 hour (was 15m)
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
