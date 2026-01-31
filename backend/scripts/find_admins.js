require('dotenv').config({ path: '../.env' });
const { pool } = require('../config/database');

async function listAdmins() {
    try {
        console.log('🔍 Searching for Admin users...');
        const [rows] = await pool.execute('SELECT id, email, full_name, role FROM users WHERE role = "admin"');

        if (rows.length === 0) {
            console.log('❌ No admin users found in the database.');
        } else {
            console.log('✅ Found Admin(s):');
            rows.forEach(user => {
                console.log(`- Email: ${user.email}, Name: ${user.full_name}`);
            });
        }
        process.exit(0);
    } catch (error) {
        console.error('❌ Error querying database:', error);
        process.exit(1);
    }
}

listAdmins();
