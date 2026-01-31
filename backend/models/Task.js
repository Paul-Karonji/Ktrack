const { pool } = require('../config/database');

class Task {
  static async findAll(filters = {}, viewerId = null) {
    let query = `
      SELECT t.*, 
      (SELECT COUNT(*) FROM messages m WHERE m.task_id = t.id AND m.sender_id != ? AND m.read_at IS NULL) as unread_count
      FROM tasks t
    `;
    const params = [viewerId || 0]; // Use 0 if no viewerId to safely return 0 count

    if (filters.clientId) {
      query += ' WHERE client_id = ?';
      params.push(filters.clientId);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM tasks WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async create(taskData) {
    const {
      clientName,
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
    } = taskData;

    const [result] = await pool.execute(
      `INSERT INTO tasks 
       (client_name, task_description, date_commissioned, date_delivered, expected_amount, is_paid, priority, status, notes, quote_status, quoted_amount, quantity, client_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientName,
        taskDescription,
        dateCommissioned || null,
        dateDelivered || null,
        (expectedAmount === '' || expectedAmount === undefined || expectedAmount === null) ? 0 : expectedAmount,
        isPaid,
        priority,
        status,
        notes,
        quoteStatus,
        (quotedAmount === '' || quotedAmount === undefined || quotedAmount === null) ? 0 : quotedAmount,
        (quantity === '' || quantity === undefined || quantity === null) ? 1 : quantity,
        clientId
      ]
    );

    return this.findById(result.insertId);
  }

  static async update(id, taskData) {
    const existingTask = await this.findById(id);
    if (!existingTask) return null;

    const {
      clientName = existingTask.client_name,
      taskDescription = existingTask.task_description,
      dateCommissioned = existingTask.date_commissioned,
      dateDelivered = existingTask.date_delivered,
      expectedAmount = existingTask.expected_amount,
      isPaid = existingTask.is_paid,
      priority = existingTask.priority,
      status = existingTask.status,
      notes = existingTask.notes,
      quoteStatus = existingTask.quote_status,
      quotedAmount = existingTask.quoted_amount,
      quantity = existingTask.quantity,
    } = taskData;

    await pool.execute(
      `UPDATE tasks 
       SET client_name = ?, task_description = ?, date_commissioned = ?, 
           date_delivered = ?, expected_amount = ?, is_paid = ?, 
           priority = ?, status = ?, notes = ?, 
           quote_status = ?,
           quoted_amount = ?,
           quantity = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        clientName,
        taskDescription,
        dateCommissioned,
        dateDelivered,
        expectedAmount,
        isPaid,
        priority,
        status,
        notes,
        quoteStatus,
        quotedAmount,
        quantity,
        id
      ]
    );

    return this.findById(id);
  }

  static async delete(id) {
    const [result] = await pool.execute(
      'DELETE FROM tasks WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async togglePayment(id) {
    await pool.execute(
      'UPDATE tasks SET is_paid = NOT is_paid, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    return this.findById(id);
  }
}

module.exports = Task;