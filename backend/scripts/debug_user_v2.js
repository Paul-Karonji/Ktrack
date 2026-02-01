const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

const EMAIL = 'paultutorw@gmail.com';
const PASSWORD = 'Tutor@Prime';

async function verifyUser() {
    try {
        console.log(`🔎 Checking database for ${EMAIL}...`);
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [EMAIL]);

        if (rows.length === 0) {
            console.log('❌ User NOT FOUND.');
        } else {
            const user = rows[0];
            console.log('✅ User FOUND:');
            console.log(`   ID: ${user.id}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Status: ${user.status}`);
            console.log(`   Password Hash: ${user.password_hash ? 'Present' : 'MISSING'}`);

            if (user.password_hash) {
                const match = await bcrypt.compare(PASSWORD, user.password_hash);
                console.log(`   Password Valid: ${match ? 'YES' : 'NO'}`);
            }
        }
    } catch (err) {
        console.error('❌ DB Error:', err);
    } finally {
        process.exit();
    }
}

verifyUser();
