const { pool } = require('./config/database');

async function inspectTasks() {
    try {
        const [tasks] = await pool.query('SELECT id, task_name, quoted_amount, expected_amount, quote_status, is_paid, paid_at, status, completed_at, created_at, updated_at FROM tasks');
        console.log('--- DETAILED TASKS ---');
        tasks.forEach(t => console.log(JSON.stringify(t, null, 2)));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspectTasks();
