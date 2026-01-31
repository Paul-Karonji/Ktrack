const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

async function resetPassword() {
    try {
        const email = 'test@gmail.com';
        const newPassword = 'password123';
        const saltRounds = 10;

        console.log(`Resetting password for ${email}...`);

        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        const [result] = await pool.execute(
            'UPDATE users SET password_hash = ? WHERE email = ?',
            [hashedPassword, email]
        );

        if (result.affectedRows > 0) {
            console.log('✅ Password reset successful!');
        } else {
            console.log('❌ User not found.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

resetPassword();
