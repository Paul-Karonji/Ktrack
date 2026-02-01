const { pool } = require('../config/database');

async function checkSchema() {
    try {
        console.log('Checking task_files columns...');
        const [rows] = await pool.query(`SHOW COLUMNS FROM task_files`);
        console.log(rows.map(r => r.Field));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
