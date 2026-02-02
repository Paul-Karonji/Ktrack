// backend/config/validateEnv.js

/**
 * Environment Variable Validation
 * Validates required environment variables on server startup
 */

const requiredEnvVars = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET',
    'PORT'
];

const optionalEnvVars = [
    'EMAIL_USER',
    'EMAIL_PASS',
    'CORS_ORIGIN',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME'
];

function validateEnvironment() {
    const missing = [];
    const warnings = [];

    // Check required variables
    requiredEnvVars.forEach(varName => {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    });

    // Check optional but recommended variables
    optionalEnvVars.forEach(varName => {
        if (!process.env[varName]) {
            warnings.push(varName);
        }
    });

    // Fail if required variables are missing
    if (missing.length > 0) {
        console.error('❌ CRITICAL: Missing required environment variables:');
        missing.forEach(varName => {
            console.error(`   - ${varName}`);
        });
        console.error('\nPlease add these to your .env file');
        process.exit(1);
    }

    // Warn about optional variables
    if (warnings.length > 0) {
        console.warn('⚠️  WARNING: Optional environment variables not set:');
        warnings.forEach(varName => {
            console.warn(`   - ${varName}`);
        });
        console.warn('\nSome features may not work correctly\n');
    }

    // Validate JWT_SECRET strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters long for security');
    }

    console.log('✅ Environment variables validated');
}

module.exports = { validateEnvironment };
