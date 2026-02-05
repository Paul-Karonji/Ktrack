// Quick script to check task_files table structure
require('dotenv').config();
const { pool } = require('../config/database');

async function checkTaskFiles() {
    try {
        console.log('📋 Checking task_files table structure...\n');
        
        const [columns] = await pool.query('DESCRIBE task_files');
        console.table(columns);
        
        console.log('\n📊 Sample data:');
        const [sample] = await pool.query(`
            SELECT tf.*, u.full_name as uploader_name, u.role as uploader_role
            FROM task_files tf
            LEFT JOIN users u ON tf.uploaded_by = u.id
            LIMIT 5
        `);
        console.table(sample);
        
        const [count] = await pool.query('SELECT COUNT(*) as total FROM task_files');
        console.log(`\n✅ Total files in database: ${count[0].total}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkTaskFiles();
