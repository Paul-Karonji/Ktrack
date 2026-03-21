START TRANSACTION;

ALTER TABLE payments
    ADD COLUMN source ENUM('platform', 'offline_admin') NOT NULL DEFAULT 'platform' AFTER type,
    ADD COLUMN recorded_by INT NULL AFTER source,
    ADD COLUMN received_at DATETIME NULL AFTER recorded_by;

ALTER TABLE payments
    ADD CONSTRAINT fk_payments_recorded_by
        FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_payments_source_received_at
    ON payments (source, received_at);

UPDATE payments
SET source = 'platform'
WHERE source IS NULL
   OR source = '';

UPDATE payments
SET received_at = COALESCE(received_at, created_at)
WHERE received_at IS NULL;

CREATE TABLE payment_reminder_logs (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO payments (
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
SELECT
    task_id,
    payable_amount,
    payment_currency,
    payment_kes_amount,
    payment_exchange_rate,
    generated_reference,
    generated_reference,
    payment_type,
    'offline_admin',
    created_by_user_id,
    paid_timestamp,
    paid_timestamp
FROM (
    SELECT
        t.id AS task_id,
        t.created_by_user_id,
        COALESCE(t.paid_at, t.updated_at, t.created_at, NOW()) AS paid_timestamp,
        COALESCE(NULLIF(t.payment_currency, ''), 'USD') AS payment_currency,
        t.payment_kes_amount,
        t.payment_exchange_rate,
        CASE
            WHEN (
                (t.deposit_paid = 1 OR EXISTS (
                    SELECT 1
                    FROM payments p_dep
                    WHERE p_dep.task_id = t.id
                      AND p_dep.type = 'deposit'
                ))
                AND resolved_project_total > resolved_deposit_amount
                AND resolved_deposit_amount > 0
            ) THEN 'balance'
            ELSE 'full'
        END AS payment_type,
        CASE
            WHEN (
                (t.deposit_paid = 1 OR EXISTS (
                    SELECT 1
                    FROM payments p_dep
                    WHERE p_dep.task_id = t.id
                      AND p_dep.type = 'deposit'
                ))
                AND resolved_project_total > resolved_deposit_amount
                AND resolved_deposit_amount > 0
            ) THEN ROUND(resolved_project_total - resolved_deposit_amount, 2)
            ELSE resolved_project_total
        END AS payable_amount,
        CONCAT(
            'offline-legacy-',
            t.id,
            '-',
            UNIX_TIMESTAMP(COALESCE(t.paid_at, t.updated_at, t.created_at, NOW())),
            '-',
            CASE
                WHEN (
                    (t.deposit_paid = 1 OR EXISTS (
                        SELECT 1
                        FROM payments p_dep
                        WHERE p_dep.task_id = t.id
                          AND p_dep.type = 'deposit'
                    ))
                    AND resolved_project_total > resolved_deposit_amount
                    AND resolved_deposit_amount > 0
                ) THEN 'balance'
                ELSE 'full'
            END
        ) AS generated_reference
    FROM (
        SELECT
            t.*,
            COALESCE(NULLIF(t.quoted_amount, 0), t.expected_amount, 0) AS resolved_project_total,
            CASE
                WHEN COALESCE(t.deposit_amount, 0) > 0 THEN t.deposit_amount
                WHEN t.requires_deposit = 1 AND COALESCE(NULLIF(t.quoted_amount, 0), t.expected_amount, 0) > 0
                    THEN ROUND(COALESCE(NULLIF(t.quoted_amount, 0), t.expected_amount, 0) / 2, 2)
                ELSE 0
            END AS resolved_deposit_amount
        FROM tasks t
        WHERE t.is_paid = 1
    ) t
    LEFT JOIN payments p_final
        ON p_final.task_id = t.id
       AND p_final.type IN ('balance', 'full')
    WHERE p_final.id IS NULL
      AND COALESCE(t.resolved_project_total, 0) > 0
) legacy_rows
WHERE payable_amount > 0;

COMMIT;
