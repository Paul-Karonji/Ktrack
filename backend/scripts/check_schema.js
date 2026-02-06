const { pool } = require('../config/database');

async function checkSchema() {
    try {
        const [rows] = await pool.execute('DESCRIBE tasks');
        console.log('Task Table Schema:');
        console.table(rows);
    } catch (error) {
        console.error('Error describing table:', error);
    } finally {
        pool.end();
    }
}

checkSchema();
