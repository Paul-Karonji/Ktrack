const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  // Find user by email
  static async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  // Find user by ID
  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, email, role, full_name, phone_number, course, status, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  // Create new user (registration)
  static async create(userData) {
    const {
      email,
      password,
      fullName,
      phoneNumber,
      course,
      role = 'client'
    } = userData;

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const [result] = await pool.execute(
      `INSERT INTO users 
       (email, password_hash, role, full_name, phone_number, course, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, passwordHash, role, fullName, phoneNumber, course, role === 'admin' ? 'approved' : 'pending']
    );

    return this.findById(result.insertId);
  }

  // Verify password
  static async verifyPassword(plainPassword, passwordHash) {
    return await bcrypt.compare(plainPassword, passwordHash);
  }

  // Get all users (admin only)
  static async findAll(filters = {}) {
    let query = 'SELECT id, email, role, full_name, phone_number, course, status, created_at FROM users WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  // Get pending users (for admin approval)
  static async findPending() {
    const [rows] = await pool.execute(
      'SELECT id, email, full_name, phone_number, course, created_at FROM users WHERE status = ? AND role = ? ORDER BY created_at ASC',
      ['pending', 'client']
    );
    return rows;
  }

  // Find all admins
  static async findAdmins() {
    const [rows] = await pool.execute(
      'SELECT id, email, full_name FROM users WHERE role = ?',
      ['admin']
    );
    return rows;
  }

  // Approve user
  static async approve(userId, approvedBy) {
    await pool.execute(
      'UPDATE users SET status = ?, approved_at = CURRENT_TIMESTAMP, approved_by = ? WHERE id = ?',
      ['approved', approvedBy, userId]
    );
    return this.findById(userId);
  }

  // Reject user
  static async reject(userId) {
    await pool.execute(
      'UPDATE users SET status = ? WHERE id = ?',
      ['rejected', userId]
    );
    return this.findById(userId);
  }

  // Suspend user
  static async suspend(userId) {
    await pool.execute(
      'UPDATE users SET status = ? WHERE id = ?',
      ['suspended', userId]
    );
    return this.findById(userId);
  }

  // Update user
  static async update(userId, updates) {
    const allowedFields = ['full_name', 'phone_number', 'course'];
    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      return this.findById(userId);
    }

    values.push(userId);
    await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(userId);
  }

  // Update password
  static async updatePassword(userId, newPasswordHash) {
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, userId]
    );
    return this.findById(userId);
  }

  // Update email
  static async updateEmail(userId, newEmail) {
    // Check if email already exists
    const existing = await this.findByEmail(newEmail);
    if (existing && existing.id !== userId) {
      throw new Error('Email already in use');
    }

    await pool.execute(
      'UPDATE users SET email = ? WHERE id = ?',
      [newEmail, userId]
    );
    return this.findById(userId);
  }

  // Delete user
  static async delete(userId) {
    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
  }

  // Get user stats
  static async getStats() {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_users,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_users,
        SUM(CASE WHEN role = 'client' THEN 1 ELSE 0 END) as total_clients
      FROM users
    `);
    return stats[0];
  }
}

module.exports = User;
