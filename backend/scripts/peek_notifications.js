const { pool } = require('../config/database');

async function peekData() {
    try {
        const [rows] = await pool.query('SELECT * FROM notifications LIMIT 10');
        console.log('Notifications Data:');
        console.table(rows);
    } catch (e) {
        console.error('Error querying table:', e.message);
    } finally {
        await pool.end();
    }
}

peekData();
