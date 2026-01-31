const User = require('../models/User');
const { pool } = require('../config/database');

async function debugLogin(email, password) {
    try {
        console.log(`Checking user: ${email}`);
        const user = await User.findByEmail(email);

        if (!user) {
            console.log('❌ User not found');
            return;
        }

        console.log('✅ User found:', {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status
        });

        const isValid = await User.verifyPassword(password, user.password_hash);
        if (isValid) {
            console.log('✅ Password matches');
        } else {
            console.log('❌ Password does NOT match');
        }

        if (user.status === 'pending') console.log('❌ Status is PENDING');
        else if (user.status === 'rejected') console.log('❌ Status is REJECTED');
        else if (user.status === 'suspended') console.log('❌ Status is SUSPENDED');
        else console.log('✅ Status check passed (not pending/rejected/suspended)');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

// Check the test user
debugLogin('test@gmail.com', 'password'); // Assuming password is 'password' based on typical test inputs, or we can try others if this fails.
