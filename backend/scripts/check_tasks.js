const { pool } = require('../config/database');

async function checkTasks() {
    try {
        const [rows] = await pool.query('SELECT id, client_name, client_id, task_description FROM tasks LIMIT 10');
        console.log('Tasks in DB:', rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkTasks();
