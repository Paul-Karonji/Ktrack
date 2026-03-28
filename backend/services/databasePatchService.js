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

async function tableExists(tableName) {
    const [rows] = await pool.execute(
        `SELECT 1
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
         LIMIT 1`,
        [tableName]
    );

    return rows.length > 0;
}

async function columnExists(tableName, columnName) {
    const [rows] = await pool.execute(
        `SELECT 1
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?
         LIMIT 1`,
        [tableName, columnName]
    );

    return rows.length > 0;
}

function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function resolveProjectTotal(task) {
    const quotedAmount = roundMoney(task.quoted_amount);
    const expectedAmount = roundMoney(task.expected_amount);
    return quotedAmount > 0 ? quotedAmount : expectedAmount;
}

function resolveDepositAmount(task) {
    const explicitDeposit = roundMoney(task.deposit_amount);
    if (explicitDeposit > 0) return explicitDeposit;

    const projectTotal = resolveProjectTotal(task);
    if (Number(task.requires_deposit) === 1 && projectTotal > 0) {
        return roundMoney(projectTotal / 2);
    }

    return 0;
}

async function backfillLegacyOfflinePayments() {
    if (!(await tableExists('tasks')) || !(await tableExists('payments'))) {
        return;
    }

    const [tasks] = await pool.execute(
        `SELECT t.*,
                EXISTS(
                    SELECT 1
                    FROM payments p
                    WHERE p.task_id = t.id
                      AND p.type = 'deposit'
                ) AS has_deposit_payment,
                EXISTS(
                    SELECT 1
                    FROM payments p
                    WHERE p.task_id = t.id
                      AND p.type IN ('balance', 'full')
                ) AS has_final_payment
         FROM tasks t
         WHERE t.is_paid = 1`
    );

    for (const task of tasks) {
        if (Number(task.has_final_payment) === 1) {
            continue;
        }

        const projectTotal = resolveProjectTotal(task);
        const depositAmount = resolveDepositAmount(task);
        const hasDepositCoverage = Number(task.deposit_paid) === 1 || Number(task.has_deposit_payment) === 1;

        let type = 'full';
        let amount = projectTotal;
        if (hasDepositCoverage && depositAmount > 0 && projectTotal > depositAmount) {
            type = 'balance';
            amount = roundMoney(projectTotal - depositAmount);
        }

        if (amount <= 0) {
            continue;
        }

        const receivedAt = task.paid_at || task.updated_at || task.created_at || new Date();
        const timestamp = Math.floor(new Date(receivedAt).getTime() / 1000);
        const reference = `offline-legacy-${task.id}-${timestamp}-${type}`;

        try {
            await pool.execute(
                `INSERT INTO payments (
                    task_id,
                    amount,
                    currency,
                    kes_amount,
                    exchange_rate,
                    reference,
                    gateway_reference,
                    type,
                    source,
                    recorded_by,
                    received_at,
                    created_at
                 )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    task.id,
                    amount,
                    task.payment_currency || 'USD',
                    task.payment_kes_amount || null,
                    task.payment_exchange_rate || null,
                    reference,
                    reference,
                    type,
                    'offline_admin',
                    task.created_by_user_id || null,
                    receivedAt,
                    receivedAt
                ]
            );
        } catch (error) {
            if (error.code !== 'ER_DUP_ENTRY') {
                console.warn(`[DatabasePatch] legacy payment backfill warning for task ${task.id}:`, error.message);
            }
        }
    }
}

async function logSchemaStatus() {
    try {
        const checks = [
            ['payment_settings', await tableExists('payment_settings')],
            ['bulk_payment_intents', await tableExists('bulk_payment_intents')],
            ['bulk_payment_intent_items', await tableExists('bulk_payment_intent_items')],
            ['payment_reminder_logs', await tableExists('payment_reminder_logs')],
            ['guest_payment_links', await tableExists('guest_payment_links')],
            ['guest_payment_sessions', await tableExists('guest_payment_sessions')],
            ['guest_payment_session_items', await tableExists('guest_payment_session_items')]
        ];

        const taskOriginExists = await columnExists('tasks', 'task_origin');
        const paymentSourceExists = await columnExists('payments', 'source');

        console.log(
            '[DatabasePatch] Schema status:',
            checks.map(([name, exists]) => `${name}=${exists ? 'yes' : 'no'}`).join(', '),
            `tasks.task_origin=${taskOriginExists ? 'yes' : 'no'}`,
            `payments.source=${paymentSourceExists ? 'yes' : 'no'}`
        );
    } catch (error) {
        console.warn('[DatabasePatch] Schema status check warning:', error.message);
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
                `ALTER TABLE payments
                 ADD COLUMN source ENUM('platform', 'offline_admin') NOT NULL DEFAULT 'platform' AFTER type`,
                'payments.source patch warning',
                ['ER_DUP_FIELDNAME', 'ER_NO_SUCH_TABLE']
            );

            await safeExecute(
                `ALTER TABLE payments
                 ADD COLUMN recorded_by INT NULL AFTER source`,
                'payments.recorded_by patch warning',
                ['ER_DUP_FIELDNAME', 'ER_NO_SUCH_TABLE']
            );

            await safeExecute(
                `ALTER TABLE payments
                 ADD COLUMN received_at DATETIME NULL AFTER recorded_by`,
                'payments.received_at patch warning',
                ['ER_DUP_FIELDNAME', 'ER_NO_SUCH_TABLE']
            );

            await safeExecute(
                `ALTER TABLE payments
                 ADD CONSTRAINT fk_payments_recorded_by
                 FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL`,
                'payments.recorded_by foreign key warning',
                ['ER_DUP_KEY', 'ER_CANT_CREATE_TABLE', 'ER_FK_DUP_NAME', 'ER_NO_SUCH_TABLE']
            );

            await safeExecute(
                `CREATE INDEX idx_payments_source_received_at
                 ON payments (source, received_at)`,
                'payments.source/received_at index warning',
                ['ER_DUP_KEYNAME', 'ER_NO_SUCH_TABLE']
            );

            await safeExecute(
                `UPDATE payments
                 SET source = 'platform'
                 WHERE source IS NULL OR source = ''`,
                'payments.source backfill warning',
                ['ER_BAD_FIELD_ERROR', 'ER_NO_SUCH_TABLE']
            );

            await safeExecute(
                `UPDATE payments
                 SET received_at = COALESCE(received_at, created_at)
                 WHERE received_at IS NULL`,
                'payments.received_at backfill warning',
                ['ER_BAD_FIELD_ERROR', 'ER_NO_SUCH_TABLE']
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

            await safeExecute(
                `CREATE TABLE IF NOT EXISTS payment_reminder_logs (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    client_id INT NOT NULL,
                    source ENUM('scheduled', 'manual_all', 'manual_single') NOT NULL,
                    triggered_by INT NULL,
                    recipient_email VARCHAR(255) NOT NULL,
                    total_due DECIMAL(10, 2) NOT NULL DEFAULT 0,
                    task_count INT NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_payment_reminder_logs_client_created (client_id, created_at),
                    INDEX idx_payment_reminder_logs_source_created (source, created_at),
                    CONSTRAINT fk_payment_reminder_logs_client
                        FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
                    CONSTRAINT fk_payment_reminder_logs_triggered_by
                        FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
                'payment_reminder_logs table patch warning'
            );

            await safeExecute(
                `CREATE TABLE IF NOT EXISTS guest_payment_links (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    scope ENUM('task', 'portal') NOT NULL,
                    guest_client_id INT NOT NULL,
                    task_id INT NULL,
                    token_hash VARCHAR(64) NOT NULL UNIQUE,
                    status ENUM('active', 'revoked', 'settled') NOT NULL DEFAULT 'active',
                    created_by INT NULL,
                    last_used_at DATETIME NULL,
                    revoked_at DATETIME NULL,
                    settled_at DATETIME NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_guest_payment_links_guest_scope_status (guest_client_id, scope, status),
                    INDEX idx_guest_payment_links_task_status (task_id, status),
                    CONSTRAINT fk_guest_payment_links_guest
                        FOREIGN KEY (guest_client_id) REFERENCES guest_clients(id) ON DELETE CASCADE,
                    CONSTRAINT fk_guest_payment_links_task
                        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                    CONSTRAINT fk_guest_payment_links_created_by
                        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
                'guest_payment_links table patch warning'
            );

            await safeExecute(
                `CREATE TABLE IF NOT EXISTS guest_payment_sessions (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    link_id INT NOT NULL,
                    guest_client_id INT NOT NULL,
                    mode ENUM('single', 'bulk') NOT NULL,
                    entered_email VARCHAR(255) NOT NULL,
                    total_amount_usd DECIMAL(10, 2) NOT NULL,
                    total_amount_kes INT NOT NULL,
                    currency VARCHAR(10) NOT NULL DEFAULT 'KES',
                    nonce VARCHAR(64) NOT NULL UNIQUE,
                    reference VARCHAR(100) NULL,
                    status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending',
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_guest_payment_sessions_link_status (link_id, status),
                    INDEX idx_guest_payment_sessions_guest_status (guest_client_id, status),
                    CONSTRAINT fk_guest_payment_sessions_link
                        FOREIGN KEY (link_id) REFERENCES guest_payment_links(id) ON DELETE CASCADE,
                    CONSTRAINT fk_guest_payment_sessions_guest
                        FOREIGN KEY (guest_client_id) REFERENCES guest_clients(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
                'guest_payment_sessions table patch warning'
            );

            await safeExecute(
                `CREATE TABLE IF NOT EXISTS guest_payment_session_items (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    session_id INT NOT NULL,
                    task_id INT NOT NULL,
                    phase ENUM('deposit', 'balance', 'full') NOT NULL,
                    amount_usd DECIMAL(10, 2) NOT NULL,
                    amount_kes INT NOT NULL,
                    sort_order INT NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_guest_payment_session_items_session (session_id),
                    INDEX idx_guest_payment_session_items_task (task_id),
                    CONSTRAINT fk_guest_payment_session_items_session
                        FOREIGN KEY (session_id) REFERENCES guest_payment_sessions(id) ON DELETE CASCADE,
                    CONSTRAINT fk_guest_payment_session_items_task
                        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
                'guest_payment_session_items table patch warning'
            );

            await backfillLegacyOfflinePayments();
            await logSchemaStatus();

            console.log('[DatabasePatch] Schema updates checked/applied.');
        } catch (error) {
            console.error('[DatabasePatch] Patching failed:', error);
        }
    }
};

module.exports = DatabasePatchService;
