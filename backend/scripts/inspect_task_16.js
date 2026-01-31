const { pool } = require('../config/database');

async function inspectTask() {
    try {
        const taskId = 16;
        console.log(`Inspecting Task ${taskId}...`);
        const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
        console.log(rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

inspectTask();
