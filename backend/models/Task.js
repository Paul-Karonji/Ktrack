const { pool } = require('../config/database');

class Task {
  static async findAll(filters = {}, viewerId = null) {
    let query = `
      SELECT t.*, 
      u.full_name as registered_client_name,
      u.email as registered_client_email,
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
    const params = [viewerId || 0]; // param for unread_count subquery

    // Fix: unread_count subquery needs viewerId param, so it should be the first param.
    // However, existing code used [viewerId || 0] and appended to it.
    // The query structure:
    // SELECT ... (SELECT ... WHERE ... sender_id != ?) ...
    // WHERE ...
    // So the first param IS for sender_id != ?.

    // Let's refine the params array handling

    if (filters.clientId) {
      query += ' WHERE t.client_id = ?';
      params.push(filters.clientId);
    } else if (filters.guestClientId) {
      query += ' WHERE t.guest_client_id = ?';
      params.push(filters.guestClientId);
    }

    query += ' ORDER BY t.created_at DESC';

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
    } = taskData;

    const [result] = await pool.execute(
      `INSERT INTO tasks 
       (client_name, task_name, task_description, date_commissioned, date_delivered, expected_amount, is_paid, priority, status, notes, quote_status, quoted_amount, quantity, client_id, guest_client_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientName || null,
        taskName || 'Untitled Task',
        taskDescription || null,
        dateCommissioned || null,
        dateDelivered || null,
        (expectedAmount === '' || expectedAmount === undefined || expectedAmount === null) ? 0 : expectedAmount,
        isPaid || 0,
        priority || 'medium',
        status || 'not_started',
        notes || null,
        quoteStatus || 'pending_quote',
        (quotedAmount === '' || quotedAmount === undefined || quotedAmount === null) ? 0 : quotedAmount,
        (quantity === '' || quantity === undefined || quantity === null) ? 1 : quantity,
        clientId || null,
        guestClientId || null
      ]
    );

    return this.findById(result.insertId);
  }

  static async update(id, taskData) {
    const fields = [];
    const params = [];

    // Map camelCase (frontend/Joi) to snake_case (DB)
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
      guestClientId: 'guest_client_id'
    };

    for (const [key, value] of Object.entries(taskData)) {
      const dbField = mapping[key] || key;
      fields.push(`${dbField} = ?`);

      // Handle date fields empty string -> null
      if ((key === 'dateCommissioned' || key === 'dateDelivered') && value === '') {
        params.push(null);
      } else {
        params.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    params.push(id);

    await pool.execute(
      `UPDATE tasks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
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

  static async transferGuestTasks(guestClientId, userId) {
    const [result] = await pool.execute(`
      UPDATE tasks 
      SET client_id = ?, 
          guest_client_id = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE guest_client_id = ?
    `, [userId, guestClientId]);

    return result.affectedRows;
  }
}

module.exports = Task;