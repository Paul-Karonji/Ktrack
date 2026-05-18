const { pool } = require('../config/database');

async function run() {
    try {
        const [rows] = await pool.execute('SELECT id, email, role, status, referral_code, referral_discount_balance FROM users');
        console.log('--- USERS IN DATABASE ---');
        console.table(rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
