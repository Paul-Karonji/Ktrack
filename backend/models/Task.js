const { pool } = require('../config/database');
const {
  augmentTask,
  getTaskPaymentProgress,
  getProjectTotal,
  getDepositAmount,
  roundMoney
} = require('../services/taskPaymentStateService');

const EPSILON = 0.009;

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
      query += ' WHERE t.is_paid = 1 OR t.deposit_paid = 1 OR COALESCE(t.amount_paid_total, 0) > 0';
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
      amountPaidTotal = 0,
      depositPaidAmount = 0,
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
         requires_deposit, deposit_paid, deposit_amount, amount_paid_total, deposit_paid_amount, deposit_ref, deposit_paid_at,
         task_origin, created_by_user_id, payment_due_started_at, last_payment_reminder_sent_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
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
        amountPaidTotal || 0,
        depositPaidAmount || 0,
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
      amountPaidTotal: 'amount_paid_total',
      depositPaidAmount: 'deposit_paid_amount',
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

    if (result.affectedRows === 0) {
      return false;
    }

    return this.findById(id, executor);
  }

  static async togglePayment(id, executor = pool) {
    return this.recordOfflinePayment(id, {}, { executor });
  }

  static async insertPaymentRecord(payment, executor = pool) {
    await executor.execute(
      `INSERT INTO payments
         (
           task_id,
           amount,
           currency,
           kes_amount,
           exchange_rate,
           reference,
           gateway_reference,
           type,
           is_partial,
           source,
           recorded_by,
           received_at
         )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payment.taskId,
        payment.amount,
        payment.currency || 'USD',
        payment.kesAmount ?? null,
        payment.exchangeRate ?? null,
        payment.reference,
        payment.gatewayReference || payment.reference,
        payment.type,
        payment.isPartial ? 1 : 0,
        payment.source || 'platform',
        payment.recordedBy || null,
        payment.receivedAt || new Date()
      ]
    );
  }

  static getPhaseAvailableAmount(task, phase) {
    const progress = getTaskPaymentProgress(task);

    if (phase === 'deposit') {
      return roundMoney(progress.deposit_remaining_amount || 0);
    }

    if (phase === 'balance') {
      if ((progress.deposit_remaining_amount || 0) > EPSILON) {
        return 0;
      }
      return roundMoney(progress.remaining_balance || 0);
    }

    if (phase === 'full') {
      return roundMoney(progress.remaining_balance || 0);
    }

    return 0;
  }

  static async applyPaymentAllocation(id, paymentRef, paymentData = {}, options = {}) {
    const executor = options.executor || pool;
    const gatewayReference = options.gatewayReference || paymentRef;
    const task = await this.findById(id, executor, options.viewerId || 0);

    if (!task) {
      throw new Error('Task not found.');
    }

    const progress = getTaskPaymentProgress(task);
    const phase = options.phase || task.current_due_phase || 'full';
    const availableAmount = this.getPhaseAvailableAmount(task, phase);

    if (availableAmount <= EPSILON) {
      throw new Error(`Task ${id} cannot accept a ${phase} payment right now.`);
    }

    const requestedAmount = options.amountUsd !== undefined && options.amountUsd !== null
      ? roundMoney(options.amountUsd)
      : availableAmount;

    if (requestedAmount <= EPSILON) {
      throw new Error(`Task ${id} payment amount must be greater than zero.`);
    }

    if (requestedAmount - availableAmount > EPSILON) {
      throw new Error(`Task ${id} payment exceeds the currently available ${phase} amount.`);
    }

    const amountUsd = roundMoney(requestedAmount);
    const nextAmountPaidTotal = roundMoney(Math.min(progress.project_total, progress.amount_paid_total + amountUsd));
    const appliedDepositPortion = progress.requires_deposit
      ? roundMoney(Math.min(amountUsd, progress.deposit_remaining_amount || 0))
      : 0;
    const nextDepositPaidAmount = progress.requires_deposit
      ? roundMoney(Math.min(progress.deposit_target, progress.deposit_paid_amount + appliedDepositPortion))
      : 0;

    const depositCompletedBefore = Number(progress.deposit_paid) === 1;
    const depositCompletedAfter = !progress.requires_deposit || (progress.deposit_target - nextDepositPaidAmount) <= EPSILON;
    const fullyPaidAfter = progress.project_total > 0 && (progress.project_total - nextAmountPaidTotal) <= EPSILON;

    let paymentType = 'full';
    if (phase === 'deposit') {
      paymentType = 'deposit';
    } else if (phase === 'balance' || (progress.requires_deposit && depositCompletedBefore)) {
      paymentType = 'balance';
    }

    await this.insertPaymentRecord({
      taskId: id,
      amount: amountUsd,
      currency: paymentData.currency || 'USD',
      kesAmount: paymentData.kesAmount ?? null,
      exchangeRate: paymentData.exchangeRate ?? null,
      reference: paymentRef,
      gatewayReference,
      type: paymentType,
      isPartial: amountUsd + EPSILON < availableAmount,
      source: options.source || 'platform',
      recordedBy: options.recordedBy || null,
      receivedAt: paymentData.receivedAt || new Date()
    }, executor);

    const receivedAt = paymentData.receivedAt || new Date();
    const [result] = await executor.execute(
      `UPDATE tasks
       SET amount_paid_total = ?,
           deposit_paid_amount = ?,
           deposit_paid = ?,
           deposit_paid_at = CASE
             WHEN ? = 1 AND ? = 0 THEN ?
             ELSE deposit_paid_at
           END,
           deposit_ref = CASE
             WHEN ? = 1 AND ? = 0 THEN ?
             ELSE deposit_ref
           END,
           is_paid = ?,
           paid_at = CASE
             WHEN ? = 1 THEN ?
             ELSE paid_at
           END,
           payment_ref = CASE
             WHEN ? = 1 THEN ?
             ELSE payment_ref
           END,
           payment_currency = ?,
           payment_exchange_rate = ?,
           payment_kes_amount = ?,
           status = CASE
             WHEN status = 'pending_deposit' AND ? = 1 THEN 'in_progress'
             ELSE status
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        nextAmountPaidTotal,
        nextDepositPaidAmount,
        depositCompletedAfter ? 1 : 0,
        depositCompletedAfter ? 1 : 0,
        depositCompletedBefore ? 1 : 0,
        receivedAt,
        depositCompletedAfter ? 1 : 0,
        depositCompletedBefore ? 1 : 0,
        gatewayReference,
        fullyPaidAfter ? 1 : 0,
        fullyPaidAfter ? 1 : 0,
        receivedAt,
        fullyPaidAfter ? 1 : 0,
        gatewayReference,
        paymentData.currency || 'USD',
        paymentData.exchangeRate ?? null,
        paymentData.kesAmount ?? null,
        depositCompletedAfter ? 1 : 0,
        id
      ]
    );

    return result.affectedRows > 0;
  }

  static async recordOfflinePayment(id, paymentData = {}, options = {}) {
    const executor = options.executor || pool;
    const task = await this.findById(id, executor);
    if (!task) return false;
    if (Number(task.is_paid) === 1) {
      throw new Error('This task is already fully paid.');
    }

    const totalAmount = getProjectTotal(task);
    if (totalAmount <= 0) {
      throw new Error('This task does not have a payable amount.');
    }

    const remainingAmount = roundMoney(task.remaining_balance || totalAmount);
    if (remainingAmount <= EPSILON) {
      throw new Error('This task does not have any remaining payable balance.');
    }

    const receivedAt = paymentData.receivedAt ? new Date(paymentData.receivedAt) : new Date();
    const paymentReference = paymentData.reference || `offline-${id}-${Date.now()}`;
    const phase = Number(task.requires_deposit) === 1 && Number(task.deposit_paid) === 1
      ? 'balance'
      : 'full';

    await this.applyPaymentAllocation(id, paymentReference, {
      currency: 'USD',
      exchangeRate: null,
      kesAmount: null,
      receivedAt
    }, {
      executor,
      phase,
      amountUsd: remainingAmount,
      gatewayReference: paymentReference,
      source: 'offline_admin',
      recordedBy: paymentData.recordedBy || null
    });

    return this.findById(id, executor);
  }

  static async markAsPaid(id, paymentRef, paymentData = {}, options = {}) {
    return this.applyPaymentAllocation(id, paymentRef, paymentData, {
      ...options,
      phase: options.phase || (options.type === 'balance' ? 'balance' : 'full')
    });
  }

  static async markDepositAsPaid(id, paymentRef, paymentData = {}, options = {}) {
    return this.applyPaymentAllocation(id, paymentRef, paymentData, {
      ...options,
      phase: 'deposit'
    });
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
