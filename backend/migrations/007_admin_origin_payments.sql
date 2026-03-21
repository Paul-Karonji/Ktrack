START TRANSACTION;

ALTER TABLE tasks
    MODIFY COLUMN status ENUM(
        'not_started',
        'in_progress',
        'review',
        'completed',
        'pending_deposit',
        'cancelled'
    ) DEFAULT 'not_started';

ALTER TABLE tasks
    MODIFY COLUMN quote_status ENUM(
        'pending_quote',
        'quote_sent',
        'approved',
        'rejected',
        'in_progress',
        'completed',
        'cancelled'
    ) DEFAULT 'pending_quote';

ALTER TABLE tasks
    ADD COLUMN task_origin ENUM('client', 'admin') NULL AFTER guest_client_id,
    ADD COLUMN created_by_user_id INT NULL AFTER task_origin,
    ADD COLUMN payment_due_started_at DATETIME NULL AFTER created_by_user_id,
    ADD COLUMN last_payment_reminder_sent_at DATETIME NULL AFTER payment_due_started_at;

CREATE INDEX idx_tasks_due_tracking
    ON tasks (client_id, is_paid, status, payment_due_started_at);

ALTER TABLE payments
    ADD COLUMN gateway_reference VARCHAR(255) NULL AFTER reference;

CREATE INDEX idx_gateway_reference
    ON payments (gateway_reference);

UPDATE payments
SET gateway_reference = reference
WHERE gateway_reference IS NULL;

CREATE TABLE payment_settings (
    id TINYINT PRIMARY KEY,
    deposit_reminders_enabled TINYINT(1) NOT NULL DEFAULT 1,
    deposit_reminder_interval_hours INT NOT NULL DEFAULT 24,
    balance_reminders_enabled TINYINT(1) NOT NULL DEFAULT 1,
    balance_reminder_interval_days INT NOT NULL DEFAULT 7,
    updated_by INT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_settings_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO payment_settings (
    id,
    deposit_reminders_enabled,
    deposit_reminder_interval_hours,
    balance_reminders_enabled,
    balance_reminder_interval_days
)
VALUES (1, 1, 24, 1, 7);

CREATE TABLE bulk_payment_intents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    total_amount_usd DECIMAL(10, 2) NOT NULL,
    total_amount_kes INT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'KES',
    nonce VARCHAR(64) NOT NULL UNIQUE,
    reference VARCHAR(100) NULL,
    status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bulk_payment_intents_client
        FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bulk_payment_intent_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    intent_id INT NOT NULL,
    task_id INT NOT NULL,
    phase ENUM('deposit', 'balance', 'full') NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE tasks
SET task_origin = 'admin'
WHERE task_origin IS NULL
  AND guest_client_id IS NOT NULL;

UPDATE tasks
SET task_origin = 'client'
WHERE task_origin IS NULL
  AND guest_client_id IS NULL
  AND quote_status IN ('pending_quote', 'quote_sent');

UPDATE tasks
SET payment_due_started_at = CASE
        WHEN is_paid = 1 OR status = 'cancelled' THEN NULL
        WHEN deposit_paid = 1 THEN COALESCE(deposit_paid_at, updated_at, created_at)
        WHEN task_origin = 'admin'
             AND COALESCE(NULLIF(quoted_amount, 0), expected_amount, 0) > 0 THEN COALESCE(updated_at, created_at)
        WHEN task_origin = 'client'
             AND quote_status = 'approved'
             AND COALESCE(NULLIF(quoted_amount, 0), expected_amount, 0) > 0 THEN COALESCE(updated_at, created_at)
        WHEN task_origin IS NULL
             AND quote_status NOT IN ('pending_quote', 'quote_sent', 'rejected')
             AND COALESCE(NULLIF(quoted_amount, 0), expected_amount, 0) > 0 THEN COALESCE(updated_at, created_at)
        ELSE NULL
    END,
    last_payment_reminder_sent_at = NULL
WHERE payment_due_started_at IS NULL;

COMMIT;
