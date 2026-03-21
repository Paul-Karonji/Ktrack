SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tasks'
  AND COLUMN_NAME IN (
      'task_origin',
      'created_by_user_id',
      'payment_due_started_at',
      'last_payment_reminder_sent_at'
  );

SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payments'
  AND COLUMN_NAME = 'gateway_reference';

SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
      'payment_settings',
      'bulk_payment_intents',
      'bulk_payment_intent_items'
  );

SELECT *
FROM payment_settings
WHERE id = 1;

SELECT task_origin, COUNT(*) AS total_tasks
FROM tasks
GROUP BY task_origin
ORDER BY task_origin;

SELECT COUNT(*) AS payments_missing_gateway_reference
FROM payments
WHERE gateway_reference IS NULL;

SELECT id,
       task_name,
       client_id,
       guest_client_id,
       task_origin,
       quote_status,
       expected_amount,
       quoted_amount,
       requires_deposit,
       deposit_paid,
       payment_due_started_at,
       last_payment_reminder_sent_at
FROM tasks
ORDER BY id DESC
LIMIT 20;
