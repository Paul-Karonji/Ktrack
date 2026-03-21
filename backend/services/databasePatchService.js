const { pool } = require('../config/database');

async function safeExecute(sql, warningLabel, ignorableCodes = []) {
    try {
        await pool.execute(sql);
    } catch (error) {
        if (!ignorableCodes.includes(error.code)) {
            console.warn(`[DatabasePatch] ${warningLabel}:`, error.message);
        }
    }
}

const DatabasePatchService = {
    async applyPatches() {
        console.log('[DatabasePatch] Checking for required schema updates...');

        try {
            await safeExecute(
                `ALTER TABLE messages MODIFY COLUMN file_type VARCHAR(255)`,
                'messages.file_type patch warning',
                ['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR']
            );

            await safeExecute(
                `ALTER TABLE messages MODIFY COLUMN task_id INT NULL`,
                'messages.task_id nullable patch warning',
                ['ER_NO_SUCH_TABLE']
            );

            await safeExecute(
                `ALTER TABLE messages ADD COLUMN client_id INT AFTER task_id`,
                'messages.client_id patch warning',
                ['ER_DUP_FIELDNAME', 'ER_NO_SUCH_TABLE']
            );

            await safeExecute(
                `ALTER TABLE task_files MODIFY COLUMN file_type VARCHAR(255)`,
                'task_files.file_type patch warning',
                ['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR']
            );

            await safeExecute(
                `ALTER TABLE task_files ADD COLUMN is_deliverable BOOLEAN DEFAULT FALSE AFTER file_size`,
                'task_files.is_deliverable patch warning',
                ['ER_DUP_FIELDNAME', 'ER_NO_SUCH_TABLE']
            );

            await safeExecute(
                `ALTER TABLE tasks
                 MODIFY COLUMN status ENUM(
                    'not_started', 'in_progress', 'review', 'completed', 'pending_deposit', 'cancelled'
                 ) DEFAULT 'not_started'`,
                'tasks.status enum patch warning'
            );

            await safeExecute(
                `ALTER TABLE tasks
                 MODIFY COLUMN quote_status ENUM(
                    'pending_quote', 'quote_sent', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled'
                 ) DEFAULT 'pending_quote'`,
                'tasks.quote_status enum patch warning'
            );

            const taskColumns = [
                'ADD COLUMN quote_status ENUM(\'pending_quote\', \'quote_sent\', \'approved\', \'rejected\', \'in_progress\', \'completed\', \'cancelled\') DEFAULT \'pending_quote\'',
                'ADD COLUMN quoted_amount DECIMAL(10, 2) DEFAULT 0',
                'ADD COLUMN requires_deposit TINYINT DEFAULT 0',
                'ADD COLUMN deposit_paid TINYINT DEFAULT 0',
                'ADD COLUMN deposit_amount DECIMAL(10, 2) DEFAULT 0',
                'ADD COLUMN deposit_ref VARCHAR(255)',
                'ADD COLUMN deposit_paid_at DATETIME',
                'ADD COLUMN guest_client_id INT',
                'ADD COLUMN completed_at DATETIME',
                'ADD COLUMN paid_at DATETIME',
                'ADD COLUMN payment_ref VARCHAR(255)',
                'ADD COLUMN payment_currency VARCHAR(10) DEFAULT \'USD\'',
                'ADD COLUMN payment_exchange_rate DECIMAL(10, 2)',
                'ADD COLUMN payment_kes_amount DECIMAL(15, 2)',
                'ADD COLUMN task_origin ENUM(\'client\', \'admin\') NULL',
                'ADD COLUMN created_by_user_id INT NULL',
                'ADD COLUMN payment_due_started_at DATETIME NULL',
                'ADD COLUMN last_payment_reminder_sent_at DATETIME NULL'
            ];

            for (const columnDefinition of taskColumns) {
                await safeExecute(
                    `ALTER TABLE tasks ${columnDefinition}`,
                    `tasks column patch warning (${columnDefinition})`,
                    ['ER_DUP_FIELDNAME', 'ER_BAD_FIELD_ERROR']
                );
            }

            await safeExecute(
                `CREATE INDEX idx_tasks_due_tracking ON tasks (client_id, is_paid, status, payment_due_started_at)`,
                'tasks due tracking index warning',
                ['ER_DUP_KEYNAME', 'ER_NO_SUCH_TABLE']
            );

            await safeExecute(
                `CREATE TABLE IF NOT EXISTS payments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    task_id INT NOT NULL,
                    amount DECIMAL(10, 2) NOT NULL,
                    currency VARCHAR(10) DEFAULT 'USD',
                    kes_amount DECIMAL(15, 2),
                    exchange_rate DECIMAL(10, 2),
                    reference VARCHAR(255) UNIQUE NOT NULL,
                    gateway_reference VARCHAR(255) NULL,
                    type ENUM('deposit', 'balance', 'full') NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_task_id (task_id),
                    INDEX idx_gateway_reference (gateway_reference),
                    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
                'payments table patch warning'
            );

            await safeExecute(
                `ALTER TABLE payments ADD COLUMN gateway_reference VARCHAR(255) NULL AFTER reference`,
                'payments.gateway_reference patch warning',
                ['ER_DUP_FIELDNAME', 'ER_NO_SUCH_TABLE']
            );

            await safeExecute(
                `CREATE INDEX idx_gateway_reference ON payments (gateway_reference)`,
                'payments.gateway_reference index warning',
                ['ER_DUP_KEYNAME', 'ER_NO_SUCH_TABLE']
            );

            await safeExecute(
                `UPDATE payments
                 SET gateway_reference = reference
                 WHERE gateway_reference IS NULL`,
                'payments.gateway_reference backfill warning',
                ['ER_NO_SUCH_TABLE']
            );

            await safeExecute(
                `CREATE TABLE IF NOT EXISTS payment_intents (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    task_id INT NOT NULL,
                    client_id INT NOT NULL,
                    phase ENUM('deposit','balance','full') NOT NULL,
                    amount_kes INT NOT NULL,
                    currency VARCHAR(10) NOT NULL DEFAULT 'KES',
                    nonce VARCHAR(64) NOT NULL UNIQUE,
                    reference VARCHAR(100) NULL,
                    status ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
                'payment_intents table patch warning'
            );

            await safeExecute(
                `CREATE TABLE IF NOT EXISTS payment_settings (
                    id TINYINT PRIMARY KEY,
                    deposit_reminders_enabled TINYINT(1) NOT NULL DEFAULT 1,
                    deposit_reminder_interval_hours INT NOT NULL DEFAULT 24,
                    balance_reminders_enabled TINYINT(1) NOT NULL DEFAULT 1,
                    balance_reminder_interval_days INT NOT NULL DEFAULT 7,
                    updated_by INT NULL,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    CONSTRAINT fk_payment_settings_updated_by
                        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
                'payment_settings table patch warning'
            );

            await safeExecute(
                `INSERT INTO payment_settings (
                    id,
                    deposit_reminders_enabled,
                    deposit_reminder_interval_hours,
                    balance_reminders_enabled,
                    balance_reminder_interval_days
                 )
                 VALUES (1, 1, 24, 1, 7)
                 ON DUPLICATE KEY UPDATE id = id`,
                'payment_settings seed warning'
            );

            await safeExecute(
                `CREATE TABLE IF NOT EXISTS bulk_payment_intents (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    client_id INT NOT NULL,
                    total_amount_usd DECIMAL(10, 2) NOT NULL,
                    total_amount_kes INT NOT NULL,
                    currency VARCHAR(10) NOT NULL DEFAULT 'KES',
                    nonce VARCHAR(64) NOT NULL UNIQUE,
                    reference VARCHAR(100) NULL,
                    status ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending',
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
                'bulk_payment_intents table patch warning'
            );

            await safeExecute(
                `CREATE TABLE IF NOT EXISTS bulk_payment_intent_items (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    intent_id INT NOT NULL,
                    task_id INT NOT NULL,
                    phase ENUM('deposit','balance','full') NOT NULL,
                    amount_usd DECIMAL(10, 2) NOT NULL,
                    amount_kes INT NOT NULL,
                    sort_order INT NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_bulk_payment_items_intent (intent_id),
                    INDEX idx_bulk_payment_items_task (task_id),
                    CONSTRAINT fk_bulk_payment_items_intent
                        FOREIGN KEY (intent_id) REFERENCES bulk_payment_intents(id) ON DELETE CASCADE,
                    CONSTRAINT fk_bulk_payment_items_task
                        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
                'bulk_payment_intent_items table patch warning'
            );

            console.log('[DatabasePatch] Schema updates checked/applied.');
        } catch (error) {
            console.error('[DatabasePatch] Patching failed:', error);
        }
    }
};

module.exports = DatabasePatchService;
