require('dotenv').config({ path: '../.env' });
const { pool } = require('../config/database');

async function listAllUsers() {
    try {
        console.log('🔍 Listing ALL users...');
        const [rows] = await pool.execute('SELECT id, email, full_name, role FROM users');

        if (rows.length === 0) {
            console.log('❌ No users found.');
        } else {
            console.log('✅ Found Users:');
            rows.forEach(user => {
                console.log(`- Role: ${user.role.toUpperCase()} | Email: ${user.email} | Name: ${user.full_name}`);
            });
        }
        process.exit(0);
    } catch (error) {
        console.error('❌ Error querying database:', error);
        process.exit(1);
    }
}

listAllUsers();
