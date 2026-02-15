const { pool } = require('../config/database');

async function checkSchema() {
    try {
        const [rows] = await pool.query('DESCRIBE notifications');
        console.log('Notifications Table Schema:');
        console.table(rows);
    } catch (e) {
        console.error('Error describing table:', e.message);
    } finally {
        await pool.end();
    }
}

checkSchema();
