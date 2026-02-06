const { pool } = require('../config/database');

async function runMigration() {
    console.log('🚀 Starting migration: Add quoted_amount to tasks table...');
    try {
        // Check if column exists first (optional, but good practice)
        // Or just try specific ALTER command
        await pool.execute(`
      ALTER TABLE tasks
      ADD COLUMN quoted_amount DECIMAL(10, 2) DEFAULT 0.00;
    `);
        console.log('✅ Successfully added quoted_amount column.');
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️  Column quoted_amount already exists.');
        } else {
            console.error('❌ Migration failed:', error);
        }
    } finally {
        pool.end();
    }
}

runMigration();
