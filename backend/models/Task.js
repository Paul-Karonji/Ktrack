const { pool } = require('../config/database');
const {
  augmentTask,
  getProjectTotal,
  getDepositAmount
} = require('../services/taskPaymentStateService');

const BASE_SELECT = `
  SELECT t.*,
         u.full_name as registered_client_name,
         u.email as registered_client_email,
         u.phone_number as registered_client_phone,
         gc.name as guest_client_name,
         gc.email as guest_client_email,
         gc.phone as guest_client_phone,
         COALESCE(u.full_name, gc.name, t.client_name) as display_client_name,
         CASE
           WHEN t.client_id IS NOT NULL THEN 'registered'
           WHEN t.guest_client_id IS NOT NULL THEN 'guest'
           ELSE 'legacy'
         END as client_type,
         (SELECT COUNT(*) FROM messages m WHERE m.task_id = t.id AND m.sender_id != ? AND m.read_at IS NULL) as unread_count,
         (SELECT COUNT(*) FROM task_files tf WHERE tf.task_id = t.id) as file_count,
         (SELECT SUM(tf.file_size) FROM task_files tf WHERE tf.task_id = t.id) as total_file_size,
         CASE WHEN EXISTS(SELECT 1 FROM task_files tf WHERE tf.task_id = t.id) THEN 1 ELSE 0 END as has_file
  FROM tasks t
  LEFT JOIN users u ON t.client_id = u.id
  LEFT JOIN guest_clients gc ON t.guest_client_id = gc.id
`;

class Task {
  static async findAll(filters = {}, viewerId = null, executor = pool) {
    let query = BASE_SELECT;
    const params = [viewerId || 0];

    if (filters.clientId) {
      query += ' WHERE t.client_id = ?';
      params.push(filters.clientId);
    } else if (filters.guestClientId) {
      query += ' WHERE t.guest_client_id = ?';
      params.push(filters.guestClientId);
    } else if (filters.hasAnyPayment) {
      query += ' WHERE t.is_paid = 1 OR t.deposit_paid = 1';
    } else if (filters.isPaid !== undefined) {
      query += ' WHERE t.is_paid = ?';
      params.push(filters.isPaid ? 1 : 0);
    }

    query += ' ORDER BY t.created_at DESC';

    const [rows] = await executor.execute(query, params);
    return rows.map((row) => augmentTask(row));
  }

  static async findById(id, executor = pool, viewerId = 0) {
    const [rows] = await executor.execute(
      `${BASE_SELECT}
       WHERE t.id = ?`,
      [viewerId || 0, id]
    );

    return rows[0] ? augmentTask(rows[0]) : null;
  }

  static async findClientTasks(clientId, executor = pool, viewerId = clientId) {
    return this.findAll({ clientId }, viewerId, executor);
  }

  static async create(taskData, executor = pool) {
    const {
      clientName,
      taskName,
      taskDescription,
      dateCommissioned,
      dateDelivered,
      expectedAmount,
      isPaid,
      priority = 'medium',
      status = 'not_started',
      notes = null,
      quoteStatus = 'pending_quote',
      quotedAmount = null,
      quantity = 1,
      clientId = null,
      guestClientId = null,
      completedAt = null,
      paidAt = null,
      requiresDeposit = 0,
      depositPaid = 0,
      depositAmount = 0,
      depositRef = null,
      depositPaidAt = null,
      taskOrigin = null,
      createdByUserId = null,
      paymentDueStartedAt = null,
      lastPaymentReminderSentAt = null
    } = taskData;

    const [result] = await executor.execute(
      `INSERT INTO tasks
       (
         client_name, task_name, task_description, date_commissioned, date_delivered,
         expected_amount, is_paid, priority, status, notes, quote_status, quoted_amount,
         quantity, client_id, guest_client_id, completed_at, paid_at,
         requires_deposit, deposit_paid, deposit_amount, deposit_ref, deposit_paid_at,
         task_origin, created_by_user_id, payment_due_started_at, last_payment_reminder_sent_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientName || null,
        taskName || 'Untitled Task',
        taskDescription || null,
        dateCommissioned || null,
        dateDelivered || null,
        expectedAmount === '' || expectedAmount === undefined || expectedAmount === null ? 0 : expectedAmount,
        isPaid ? 1 : 0,
        priority || 'medium',
        status || 'not_started',
        notes || null,
        quoteStatus || 'pending_quote',
        quotedAmount === '' || quotedAmount === undefined || quotedAmount === null ? 0 : quotedAmount,
        quantity === '' || quantity === undefined || quantity === null ? 1 : quantity,
        clientId || null,
        guestClientId || null,
        completedAt || null,
        paidAt || null,
        requiresDeposit ? 1 : 0,
        depositPaid ? 1 : 0,
        depositAmount || 0,
        depositRef || null,
        depositPaidAt || null,
        taskOrigin || null,
        createdByUserId || null,
        paymentDueStartedAt || null,
        lastPaymentReminderSentAt || null
      ]
    );

    return this.findById(result.insertId, executor);
  }

  static async update(id, taskData, executor = pool) {
    const fields = [];
    const params = [];

    const mapping = {
      clientName: 'client_name',
      taskName: 'task_name',
      taskDescription: 'task_description',
      dateCommissioned: 'date_commissioned',
      dateDelivered: 'date_delivered',
      expectedAmount: 'expected_amount',
      isPaid: 'is_paid',
      priority: 'priority',
      status: 'status',
      notes: 'notes',
      quoteStatus: 'quote_status',
      quotedAmount: 'quoted_amount',
      quantity: 'quantity',
      clientId: 'client_id',
      guestClientId: 'guest_client_id',
      completedAt: 'completed_at',
      paidAt: 'paid_at',
      requiresDeposit: 'requires_deposit',
      depositPaid: 'deposit_paid',
      depositAmount: 'deposit_amount',
      depositRef: 'deposit_ref',
      depositPaidAt: 'deposit_paid_at',
      taskOrigin: 'task_origin',
      createdByUserId: 'created_by_user_id',
      paymentDueStartedAt: 'payment_due_started_at',
      lastPaymentReminderSentAt: 'last_payment_reminder_sent_at'
    };

    for (const [key, value] of Object.entries(taskData)) {
      if (!mapping[key]) continue;

      fields.push(`${mapping[key]} = ?`);
      params.push(value === '' ? null : value);
    }

    if (fields.length === 0) {
      return this.findById(id, executor);
    }

    params.push(id);

    await executor.execute(
      `UPDATE tasks
       SET ${fields.join(', ')},
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      params
    );

    return this.findById(id, executor);
  }

  static async delete(id, executor = pool) {
    const [result] = await executor.execute(
      'DELETE FROM tasks WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }

  static async togglePayment(id, executor = pool) {
    await executor.execute(
      `UPDATE tasks
       SET is_paid = NOT is_paid,
           paid_at = IF(is_paid = 1, NULL, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );

    return this.findById(id, executor);
  }

  static async markAsPaid(id, paymentRef, paymentData = {}, options = {}) {
    const executor = options.executor || pool;
    const gatewayReference = options.gatewayReference || paymentRef;
    const paymentType = options.type || null;
    const { currency = 'USD', exchangeRate = null, kesAmount = null } = paymentData;

    const task = await this.findById(id, executor);
    if (!task) return false;

    const totalAmount = getProjectTotal(task);
    const depositAmount = getDepositAmount(task);
    const balanceAmount = task.deposit_paid
      ? Math.max(totalAmount - depositAmount, 0)
      : totalAmount;

    await executor.execute(
      `INSERT INTO payments
         (task_id, amount, currency, kes_amount, exchange_rate, reference, gateway_reference, type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        balanceAmount,
        currency,
        kesAmount,
        exchangeRate,
        paymentRef,
        gatewayReference,
        paymentType || (task.deposit_paid ? 'balance' : 'full')
      ]
    );

    const [result] = await executor.execute(
      `UPDATE tasks
       SET is_paid = 1,
           paid_at = CURRENT_TIMESTAMP,
           payment_ref = ?,
           payment_currency = ?,
           payment_exchange_rate = ?,
           payment_kes_amount = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [gatewayReference, currency, exchangeRate, kesAmount, id]
    );

    return result.affectedRows > 0;
  }

  static async markDepositAsPaid(id, paymentRef, paymentData = {}, options = {}) {
    const executor = options.executor || pool;
    const gatewayReference = options.gatewayReference || paymentRef;
    const { currency = 'USD', exchangeRate = null, kesAmount = null } = paymentData;

    const task = await this.findById(id, executor);
    if (!task) return false;

    await executor.execute(
      `INSERT INTO payments
         (task_id, amount, currency, kes_amount, exchange_rate, reference, gateway_reference, type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, getDepositAmount(task), currency, kesAmount, exchangeRate, paymentRef, gatewayReference, 'deposit']
    );

    const [result] = await executor.execute(
      `UPDATE tasks
       SET deposit_paid = 1,
           deposit_paid_at = CURRENT_TIMESTAMP,
           deposit_ref = ?,
           payment_currency = ?,
           payment_exchange_rate = ?,
           payment_kes_amount = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [gatewayReference, currency, exchangeRate, kesAmount, id]
    );

    return result.affectedRows > 0;
  }

  static async transferGuestTasks(guestClientId, userId, executor = pool) {
    const [result] = await executor.execute(
      `UPDATE tasks
       SET client_id = ?,
           guest_client_id = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE guest_client_id = ?`,
      [userId, guestClientId]
    );

    return result.affectedRows;
  }
}

module.exports = Task;
