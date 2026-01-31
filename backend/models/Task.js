const { pool } = require('../config/database');

class Task {
  static async findAll() {
    const [rows] = await pool.execute(
      'SELECT * FROM tasks ORDER BY created_at DESC'
    );
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
      notes = null
    } = taskData;

    const [result] = await pool.execute(
      `INSERT INTO tasks 
       (client_name, task_description, date_commissioned, date_delivered, expected_amount, is_paid, priority, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientName,
        taskDescription,
        dateCommissioned || null,
        dateDelivered || null,
        expectedAmount,
        isPaid,
        priority,
        status,
        notes
      ]
    );

    return this.findById(result.insertId);
  }

  static async update(id, taskData) {
    const {
      clientName,
      taskDescription,
      dateCommissioned,
      dateDelivered,
      expectedAmount,
      isPaid,
      priority,
      status,
      notes
    } = taskData;

    await pool.execute(
      `UPDATE tasks 
       SET client_name = ?, task_description = ?, date_commissioned = ?, 
           date_delivered = ?, expected_amount = ?, is_paid = ?, 
           priority = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        clientName,
        taskDescription,
        dateCommissioned || null,
        dateDelivered || null,
        expectedAmount,
        isPaid,
        priority,
        status,
        notes,
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