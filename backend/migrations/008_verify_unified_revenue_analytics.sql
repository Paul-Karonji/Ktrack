SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payments'
  AND COLUMN_NAME IN ('source', 'recorded_by', 'received_at')
ORDER BY COLUMN_NAME;

SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payment_reminder_logs';

SELECT INDEX_NAME
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payments'
  AND INDEX_NAME = 'idx_payments_source_received_at';

SELECT CONSTRAINT_NAME
FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE()
  AND CONSTRAINT_NAME IN (
      'fk_payments_recorded_by',
      'fk_payment_reminder_logs_client',
      'fk_payment_reminder_logs_triggered_by'
  )
ORDER BY CONSTRAINT_NAME;

SELECT source, COUNT(*) AS payment_rows
FROM payments
GROUP BY source
ORDER BY source;

SELECT COUNT(*) AS payments_missing_received_at
FROM payments
WHERE received_at IS NULL;

SELECT COUNT(*) AS legacy_paid_tasks_without_ledger_row
FROM tasks t
LEFT JOIN payments p
  ON p.task_id = t.id
 AND p.type IN ('balance', 'full')
WHERE t.is_paid = 1
  AND p.id IS NULL;

SELECT id,
       task_id,
       type,
       source,
       amount,
       currency,
       received_at,
       recorded_by,
       gateway_reference
FROM payments
ORDER BY id DESC
LIMIT 20;
