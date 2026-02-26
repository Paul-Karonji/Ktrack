const { pool } = require('../config/database');

/**
 * Database Patch Service
 * Automatically applies schema updates that might be missing in production
 * or were introduced after initial deployment.
 */
const DatabasePatchService = {
    async applyPatches() {
        console.log('🛠️ [DatabasePatch] Checking for required schema updates...');

        try {
            // Increase file_type length in messages table
            await pool.execute(`
                ALTER TABLE messages 
                MODIFY COLUMN file_type VARCHAR(255);
            `).catch(err => {
                // Ignore if column doesn't exist or table doesn't exist (handled by main migrations)
                if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== 'ER_BAD_FIELD_ERROR') {
                    console.warn('⚠️ [DatabasePatch] messages patch warning:', err.message);
                }
            });

            // Increase file_type length in task_files table
            await pool.execute(`
                ALTER TABLE task_files 
                MODIFY COLUMN file_type VARCHAR(255);
            `).catch(err => {
                if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== 'ER_BAD_FIELD_ERROR') {
                    console.warn('⚠️ [DatabasePatch] task_files patch warning:', err.message);
                }
            });

            // Add is_deliverable column to task_files table
            await pool.execute(`
                ALTER TABLE task_files 
                ADD COLUMN is_deliverable BOOLEAN DEFAULT FALSE AFTER file_size;
            `).catch(err => {
                // Ignore if column already exists (ER_DUP_FIELDNAME)
                if (err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_NO_SUCH_TABLE') {
                    console.warn('⚠️ [DatabasePatch] task_files is_deliverable patch warning:', err.message);
                }
            });

            // 1. Update status ENUM to include pending_deposit and cancelled
            await pool.execute(`
                ALTER TABLE tasks MODIFY COLUMN status ENUM(
                    'not_started', 'in_progress', 'review', 'completed', 'pending_deposit', 'cancelled'
                ) DEFAULT 'not_started';
            `).catch(err => console.warn('⚠️ [DatabasePatch] tasks status enum patch warning:', err.message));

            // 2. Comprehensive Task Column Alignment
            const taskColumns = [
                // Quote & Deposit Columns
                'ADD COLUMN quote_status ENUM(\'pending_quote\', \'quoted\', \'approved\', \'rejected\') DEFAULT \'pending_quote\'',
                'ADD COLUMN quoted_amount DECIMAL(10, 2) DEFAULT 0',
                'ADD COLUMN requires_deposit TINYINT DEFAULT 0',
                'ADD COLUMN deposit_paid TINYINT DEFAULT 0',
                'ADD COLUMN deposit_amount DECIMAL(10, 2) DEFAULT 0',
                'ADD COLUMN deposit_ref VARCHAR(255)',
                'ADD COLUMN deposit_paid_at DATETIME',

                // Legacy / Paystack Integration Columns
                'ADD COLUMN guest_client_id INT',
                'ADD COLUMN completed_at DATETIME',
                'ADD COLUMN paid_at DATETIME',
                'ADD COLUMN payment_ref VARCHAR(255)',
                'ADD COLUMN payment_currency VARCHAR(10) DEFAULT \'USD\'',
                'ADD COLUMN payment_exchange_rate DECIMAL(10, 2)',
                'ADD COLUMN payment_kes_amount DECIMAL(15, 2)'
            ];

            for (const col of taskColumns) {
                await pool.execute(`ALTER TABLE tasks ${col}`).catch(err => {
                    if (err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_BAD_FIELD_ERROR') {
                        console.warn(`⚠️ [DatabasePatch] tasks alignment error:`, err.message);
                    }
                });
            }

            // 3. Create payments table
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS payments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    task_id INT NOT NULL,
                    amount DECIMAL(10, 2) NOT NULL,
                    currency VARCHAR(10) DEFAULT 'USD',
                    kes_amount DECIMAL(15, 2),
                    exchange_rate DECIMAL(10, 2),
                    reference VARCHAR(255) UNIQUE NOT NULL,
                    type ENUM('deposit', 'balance', 'full') NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_task_id (task_id),
                    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `).catch(err => console.warn('⚠️ [DatabasePatch] payments table patch warning:', err.message));

            // 4. Create payment_intents table (F-08/F-09 fix)
            // Stores server-side payment expectations before Paystack is opened.
            // verifyPayment and handleWebhook validate against this record.
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS payment_intents (
                    id         INT PRIMARY KEY AUTO_INCREMENT,
                    task_id    INT NOT NULL,
                    client_id  INT NOT NULL,
                    phase      ENUM('deposit', 'balance', 'full') NOT NULL,
                    amount_kes INT NOT NULL,
                    currency   VARCHAR(10) NOT NULL DEFAULT 'KES',
                    nonce      VARCHAR(64) NOT NULL UNIQUE,
                    reference  VARCHAR(100) NULL,
                    status     ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    FOREIGN KEY (task_id)   REFERENCES tasks(id) ON DELETE CASCADE,
                    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `).catch(err => console.warn('⚠️ [DatabasePatch] payment_intents table patch warning:', err.message));

            console.log('✅ [DatabasePatch] Schema updates checked/applied.');
        } catch (error) {
            console.error('❌ [DatabasePatch] Patching failed:', error);
            // We don't throw here to avoid crashing the server if a patch fails
        }
    }
};

module.exports = DatabasePatchService;
