const { pool } = require('./config/database');

async function fixStatusEnum() {
    try {
        console.log('🚀 Updating tasks.status ENUM...');

        // Update the status column to include pending_deposit and cancelled
        await pool.execute(`
            ALTER TABLE tasks 
            MODIFY COLUMN status ENUM(
                'not_started', 
                'in_progress', 
                'review', 
                'completed', 
                'pending_deposit', 
                'cancelled'
            ) DEFAULT 'not_started'
        `);

        console.log('✅ Successfully updated tasks.status ENUM');

        // Also ensure quote_status is comprehensive
        await pool.execute(`
            ALTER TABLE tasks 
            MODIFY COLUMN quote_status ENUM(
                'pending_quote', 
                'quote_sent', 
                'approved', 
                'rejected', 
                'in_progress', 
                'completed', 
                'cancelled'
            ) DEFAULT 'pending_quote'
        `);
        console.log('✅ Successfully confirmed tasks.quote_status ENUM');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

fixStatusEnum();
