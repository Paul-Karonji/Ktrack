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
    const [rows] = await pool.execute(`
      SELECT u.id, u.email, u.role, u.full_name, u.phone_number, u.course, u.status, u.created_at,
             u.referral_code, u.referred_by, u.referral_discount_balance,
             (SELECT COUNT(*) FROM guest_clients gc 
              WHERE gc.upgraded_to_user_id IS NULL 
                AND (
                  gc.email COLLATE utf8mb4_unicode_ci = u.email OR 
                  gc.phone COLLATE utf8mb4_unicode_ci = u.phone_number OR 
                  gc.name COLLATE utf8mb4_unicode_ci = u.full_name OR 
                  (LENGTH(gc.name) > 2 AND u.full_name LIKE CONCAT('%', gc.name COLLATE utf8mb4_unicode_ci, '%')) OR
                  (LENGTH(u.full_name) > 2 AND gc.name COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', u.full_name, '%'))
                )
             ) as potential_guest_matches,
             (SELECT COUNT(*) FROM guest_clients gc WHERE gc.upgraded_to_user_id = u.id) as is_merged
      FROM users u 
      WHERE u.id = ?
    `, [id]);
    return rows[0];
  }

  // Create new user (registration)
  static async create(userData) {
    const {
      email,
      password,
      fullName,
      phoneNumber = null,
      course = null,
      role = 'client',
      referredBy = null
    } = userData;

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate unique referral code
    const generateReferralCode = () => Math.random().toString(36).substring(2, 10).toUpperCase();
    let referralCode = '';
    let isUnique = false;
    while (!isUnique) {
      referralCode = generateReferralCode();
      const [existing] = await pool.execute('SELECT id FROM users WHERE referral_code = ?', [referralCode]);
      if (existing.length === 0) {
        isUnique = true;
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO users 
       (email, password_hash, role, full_name, phone_number, course, status, referral_code, referred_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, passwordHash, role, fullName, phoneNumber, course, (role === 'tutor' || role === 'superadmin') ? 'approved' : 'pending', referralCode, referredBy]
    );

    return this.findById(result.insertId);
  }

  // Find user by referral code
  static async findByReferralCode(code) {
    const [rows] = await pool.execute(
      'SELECT id, email, full_name, role FROM users WHERE referral_code = ?',
      [code]
    );
    return rows[0];
  }

  // Get users referred by a specific user
  static async getReferredUsers(userId) {
    const [rows] = await pool.execute(
      'SELECT id, email, full_name, status, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  }

  // Add discount balance to a user
  static async addReferralDiscount(userId, amount) {
    await pool.execute(
      'UPDATE users SET referral_discount_balance = referral_discount_balance + ? WHERE id = ?',
      [amount, userId]
    );
    return this.findById(userId);
  }

  // Consume discount balance from a user
  static async consumeReferralDiscount(userId, amount) {
    await pool.execute(
      'UPDATE users SET referral_discount_balance = referral_discount_balance - ? WHERE id = ? AND referral_discount_balance >= ?',
      [amount, userId, amount]
    );
    return this.findById(userId);
  }

  // Verify password
  static async verifyPassword(plainPassword, passwordHash) {
    return await bcrypt.compare(plainPassword, passwordHash);
  }

  // Get all users (admin only)
  static async findAll(filters = {}) {
    let query = `
      SELECT u.id, u.email, u.role, u.full_name, u.phone_number, u.course, u.status, u.created_at,
             u.referral_code, u.referred_by, u.referral_discount_balance,
             (SELECT COUNT(*) FROM guest_clients gc 
              WHERE gc.upgraded_to_user_id IS NULL 
                AND (
                  u.email COLLATE utf8mb4_0900_ai_ci = gc.email OR 
                  u.phone_number COLLATE utf8mb4_0900_ai_ci = gc.phone OR 
                  u.full_name COLLATE utf8mb4_0900_ai_ci = gc.name OR 
                  (LENGTH(gc.name) > 2 AND u.full_name COLLATE utf8mb4_0900_ai_ci LIKE CONCAT('%', gc.name, '%')) OR
                  (LENGTH(u.full_name) > 2 AND gc.name LIKE CONCAT('%', u.full_name COLLATE utf8mb4_0900_ai_ci, '%'))
                )
             ) as potential_guest_matches,
             (SELECT COUNT(*) FROM guest_clients gc WHERE gc.upgraded_to_user_id = u.id) as is_merged
      FROM users u 
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters.tutorId) {
      query += ' AND u.id IN (SELECT DISTINCT client_id FROM tasks WHERE assigned_tutor_id = ? AND client_id IS NOT NULL)';
      params.push(filters.tutorId);
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

  // Find all tutors
  static async findTutors() {
    const [rows] = await pool.execute(
      'SELECT id, email, full_name, role FROM users WHERE role IN (?, ?)',
      ['tutor', 'superadmin']
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

  // Unsuspend user (reactivate)
  static async unsuspend(userId) {
    await pool.execute(
      'UPDATE users SET status = ? WHERE id = ?',
      ['approved', userId]
    );
    return this.findById(userId);
  }

  // Hard delete user
  static async delete(userId) {
    const user = await this.findById(userId);
    if (!user) return null;
    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
    return user; // return the deleted user for email/logging
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

  // Get user stats
  static async getStats(tutorId = null) {
    if (tutorId) {
      const [regClientStats] = await pool.execute(`
        SELECT COUNT(DISTINCT client_id) as active_reg_clients
        FROM tasks
        WHERE assigned_tutor_id = ? AND client_id IS NOT NULL
      `, [tutorId]);
      
      const [guestClientStats] = await pool.execute(`
        SELECT COUNT(DISTINCT guest_client_id) as active_guest_clients
        FROM tasks
        WHERE assigned_tutor_id = ? AND guest_client_id IS NOT NULL
      `, [tutorId]);

      const totalClients = (regClientStats[0]?.active_reg_clients || 0) + (guestClientStats[0]?.active_guest_clients || 0);

      return {
        total_users: regClientStats[0]?.active_reg_clients || 0,
        pending_users: 0,
        approved_users: regClientStats[0]?.active_reg_clients || 0,
        total_clients: totalClients
      };
    }

    const [stats] = await pool.execute(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE status = 'pending') as pending_users,
        (SELECT COUNT(*) FROM users WHERE status = 'approved') as approved_users,
        (SELECT COUNT(*) FROM users WHERE role = 'client') + (SELECT COUNT(*) FROM guest_clients WHERE upgraded_to_user_id IS NULL) as total_clients
    `);
    return stats[0];
  }
}

module.exports = User;
