const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

async function run() {
    try {
        const passwordHash = await bcrypt.hash('Password123', 10);
        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE email IN (?, ?, ?)',
            [passwordHash, 'paultutorw@gmail.com', 'karonjipaul.w@gmail.com', 'john.doe@example.com']
        );
        console.log('✅ Passwords successfully updated to "Password123" for paultutorw@gmail.com, karonjipaul.w@gmail.com, and john.doe@example.com');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
