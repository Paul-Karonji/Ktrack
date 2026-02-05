// Check users table structure for settings implementation
require('dotenv').config();
const { pool } = require('../config/database');

async function checkUsersTable() {
    try {
        console.log('📋 Checking users table structure...\n');

        const [columns] = await pool.query('DESCRIBE users');
        console.table(columns);

        console.log('\n📊 Sample user data (passwords hidden):');
        const [users] = await pool.query(`
            SELECT 
                id, 
                email, 
                full_name, 
                role, 
                status, 
                course,
                created_at,
                approved_at
            FROM users
            LIMIT 5
        `);
        console.table(users);

        const [count] = await pool.query('SELECT COUNT(*) as total FROM users');
        console.log(`\n✅ Total users in database: ${count[0].total}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkUsersTable();
