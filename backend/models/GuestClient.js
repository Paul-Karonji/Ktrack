const { pool } = require('../config/database');

class GuestClient {
    // Get all guest clients with task counts
    static async findAll() {
        const [rows] = await pool.execute(`
      SELECT gc.*, 
             COUNT(t.id) as task_count,
             SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
      FROM guest_clients gc
      LEFT JOIN tasks t ON t.guest_client_id = gc.id
      WHERE gc.upgraded_to_user_id IS NULL
      GROUP BY gc.id
      ORDER BY gc.created_at DESC
    `);
        return rows;
    }

    // Find by ID
    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM guest_clients WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    // Find by name (for duplicate detection)
    static async findByName(name) {
        const [rows] = await pool.execute(`
      SELECT gc.*, COUNT(t.id) as task_count
      FROM guest_clients gc
      LEFT JOIN tasks t ON t.guest_client_id = gc.id
      WHERE gc.name = ? AND gc.upgraded_to_user_id IS NULL
      GROUP BY gc.id
    `, [name]);
        return rows;
    }

    // Find by name AND phone (exact duplicate check)
    static async findByNameAndPhone(name, phone) {
        const [rows] = await pool.execute(
            'SELECT * FROM guest_clients WHERE name = ? AND phone = ? AND upgraded_to_user_id IS NULL',
            [name, phone]
        );
        return rows[0];
    }

    // Create guest client
    static async create(guestData) {
        const { name, email, phone, course, notes, passwordHash, hasLoginAccess } = guestData;

        const [result] = await pool.execute(`
      INSERT INTO guest_clients 
      (name, email, phone, course, notes, password_hash, has_login_access) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, email || null, phone || null, course || null, notes || null,
            passwordHash || null, hasLoginAccess || false]);

        return this.findById(result.insertId);
    }

    // Update guest client
    static async update(id, guestData) {
        const { name, email, phone, course, notes } = guestData;

        await pool.execute(`
      UPDATE guest_clients 
      SET name = ?, email = ?, phone = ?, course = ?, notes = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, email, phone, course, notes, id]);

        return this.findById(id);
    }

    // Delete guest client
    static async delete(id) {
        const [result] = await pool.execute(
            'DELETE FROM guest_clients WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    // Mark as upgraded/merged
    static async markAsUpgraded(guestId, userId) {
        await pool.execute(`
      UPDATE guest_clients 
      SET upgraded_to_user_id = ?,
          upgraded_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [userId, guestId]);
    }

    // Find potential matches for a user (for merge suggestions)
    static async findPotentialMatches(userName, userEmail, userPhone) {
        const [rows] = await pool.execute(`
      SELECT gc.*, 
             COUNT(t.id) as task_count,
             CASE 
               WHEN gc.email = ? AND gc.email IS NOT NULL THEN 'email_match'
               WHEN gc.phone = ? AND gc.phone IS NOT NULL THEN 'phone_match'
               WHEN gc.name = ? THEN 'exact_name'
               ELSE 'similar_name'
             END as match_type
      FROM guest_clients gc
      LEFT JOIN tasks t ON t.guest_client_id = gc.id
      WHERE gc.upgraded_to_user_id IS NULL
        AND (
          gc.name = ? OR
          (gc.phone = ? AND gc.phone IS NOT NULL) OR
          (gc.email = ? AND gc.email IS NOT NULL)
        )
      GROUP BY gc.id
      ORDER BY 
        CASE match_type
          WHEN 'email_match' THEN 1
          WHEN 'phone_match' THEN 2
          WHEN 'exact_name' THEN 3
          ELSE 4
        END
    `, [userEmail, userPhone, userName, userName, userPhone, userEmail]);

        return rows;
    }
}

module.exports = GuestClient;
