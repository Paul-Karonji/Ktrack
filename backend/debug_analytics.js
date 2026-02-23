const { pool } = require('./config/database');

async function debugData() {
    try {
        const [tasks] = await pool.query('SELECT id, task_name, quoted_amount, is_paid, paid_at, created_at, status FROM tasks');
        console.log('--- TASKS DATA ---');
        console.table(tasks);

        const now = new Date();
        const start = new Date(new Date().setDate(now.getDate() - 30));
        const end = now;

        console.log(`\nRange: ${start.toISOString()} to ${end.toISOString()}`);

        const [results] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_paid = 1 THEN 1 ELSE 0 END) as paid_count,
                SUM(CASE WHEN is_paid = 1 AND (paid_at BETWEEN ? AND ? OR paid_at IS NULL) THEN quoted_amount ELSE 0 END) as paid_amount_with_null_fix,
                SUM(CASE WHEN is_paid = 1 AND paid_at BETWEEN ? AND ? THEN quoted_amount ELSE 0 END) as paid_amount_strict
            FROM tasks
        `, [start, end, start, end]);

        console.log('\n--- KPI TEST ---');
        console.table(results);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugData();
