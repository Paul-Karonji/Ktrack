const { pool } = require('./config/database');

async function inspectSchema() {
    try {
        const [rows] = await pool.execute('DESCRIBE tasks');
        console.table(rows);
        process.exit(0);
    } catch (error) {
        console.error('Inspection failed:', error.message);
        process.exit(1);
    }
}

inspectSchema();
