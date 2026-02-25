const { pool } = require('./config/database');

async function updateSchema() {
    try {
        console.log('🚀 Starting Deposit Schema Migration...');

        // 1. Add requires_deposit
        try {
            await pool.execute('ALTER TABLE tasks ADD COLUMN requires_deposit TINYINT DEFAULT 0 AFTER quote_status');
            console.log('✅ Added column: requires_deposit');
        } catch (e) { console.log('⚠️ Column requires_deposit might already exist'); }

        // 2. Add deposit_paid
        try {
            await pool.execute('ALTER TABLE tasks ADD COLUMN deposit_paid TINYINT DEFAULT 0 AFTER requires_deposit');
            console.log('✅ Added column: deposit_paid');
        } catch (e) { console.log('⚠️ Column deposit_paid might already exist'); }

        // 3. Add deposit_amount
        try {
            await pool.execute('ALTER TABLE tasks ADD COLUMN deposit_amount DECIMAL(10, 2) AFTER deposit_paid');
            console.log('✅ Added column: deposit_amount');
        } catch (e) { console.log('⚠️ Column deposit_amount might already exist'); }

        // 4. Add deposit_ref
        try {
            await pool.execute('ALTER TABLE tasks ADD COLUMN deposit_ref VARCHAR(255) AFTER deposit_amount');
            console.log('✅ Added column: deposit_ref');
        } catch (e) { console.log('⚠️ Column deposit_ref might already exist'); }

        // 5. Add deposit_paid_at
        try {
            await pool.execute('ALTER TABLE tasks ADD COLUMN deposit_paid_at DATETIME AFTER deposit_ref');
            console.log('✅ Added column: deposit_paid_at');
        } catch (e) { console.log('⚠️ Column deposit_paid_at might already exist'); }

        console.log('✨ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

updateSchema();
