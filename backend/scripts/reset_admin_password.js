require('dotenv').config({ path: '../.env' });
const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

async function resetPassword() {
    try {
        const email = 'admin@tasktracker.com';
        const newPassword = 'password123';

        console.log(`Resetting password for ${email}...`);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const [result] = await pool.execute(
            'UPDATE users SET password_hash = ? WHERE email = ?',
            [hashedPassword, email]
        );

        if (result.affectedRows > 0) {
            console.log('✅ Password reset successful!');
        } else {
            console.error('❌ User not found.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

resetPassword();
