const { pool } = require('../config/database');
const logger = require('../utils/logger');

class PayoutController {
    // Helper to calculate a tutor's current payout balance
    async getTutorBalance(tutorId, executor = pool) {
        // 1. Calculate total revenue earned (amount paid by clients on tasks assigned to this tutor)
        const [earnedRows] = await executor.execute(
            `SELECT COALESCE(SUM(amount_paid_total), 0) AS total_earned
             FROM tasks
             WHERE assigned_tutor_id = ?`,
            [tutorId]
        );
        const totalEarned = parseFloat(earnedRows[0].total_earned);

        // 2. Calculate total payouts requested (both completed/approved and pending requests)
        const [payoutRows] = await executor.execute(
            `SELECT COALESCE(SUM(amount), 0) AS total_requested
             FROM tutor_payout_requests
             WHERE tutor_id = ? AND status IN ('pending', 'approved')`,
            [tutorId]
        );
        const totalRequested = parseFloat(payoutRows[0].total_requested);

        // 3. Available balance is earned - requested (pending/approved)
        const availableBalance = Math.max(0, Math.round((totalEarned - totalRequested) * 100) / 100);

        return {
            totalEarned,
            totalRequested,
            availableBalance
        };
    }

    // Tutor: Submit a payout request
    async createPayoutRequest(req, res) {
        try {
            const tutorId = req.user.id;
            const { amount: rawAmount, paymentMethod, paymentDetails } = req.body || {};

            const amount = Math.round((parseFloat(rawAmount) || 0) * 100) / 100;
            if (amount <= 0) {
                return res.status(400).json({ success: false, message: 'Payout amount must be positive.' });
            }

            if (!paymentMethod || !paymentDetails) {
                return res.status(400).json({ success: false, message: 'Payment method and details are required.' });
            }

            // Lock user's balance records to prevent double-spend concurrency race conditions
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                const { availableBalance } = await this.getTutorBalance(tutorId, connection);

                if (amount > availableBalance) {
                    await connection.rollback();
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient balance. Available to request: $${availableBalance.toFixed(2)}`
                    });
                }

                const now = new Date();
                await connection.execute(
                    `INSERT INTO tutor_payout_requests 
                        (tutor_id, amount, payment_method, payment_details, status, created_at, updated_at)
                     VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
                    [tutorId, amount, paymentMethod, paymentDetails, now, now]
                );

                await connection.commit();
                logger.info(`Tutor ${req.user.email} (ID: ${tutorId}) requested payout of $${amount}`);

                return res.status(200).json({
                    success: true,
                    message: 'Payout request submitted successfully.'
                });
            } catch (err) {
                await connection.rollback();
                throw err;
            } finally {
                connection.release();
            }
        } catch (error) {
            logger.error(`Create Payout Request Error: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Internal server error while requesting payout.' });
        }
    }

    // Tutor: Get personal payout history & current balance
    async getMyPayoutRequests(req, res) {
        try {
            const tutorId = req.user.id;

            const [requests] = await pool.execute(
                `SELECT pr.*, u.full_name AS resolved_by_name
                 FROM tutor_payout_requests pr
                 LEFT JOIN users u ON u.id = pr.resolved_by
                 WHERE pr.tutor_id = ?
                 ORDER BY pr.created_at DESC`,
                [tutorId]
            );

            const balanceInfo = await this.getTutorBalance(tutorId);

            return res.status(200).json({
                success: true,
                balance: balanceInfo,
                requests
            });
        } catch (error) {
            logger.error(`Get My Payout Requests Error: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Internal server error while fetching payout history.' });
        }
    }

    // Superadmin: Get all payout requests with statistics
    async getAllPayoutRequests(req, res) {
        try {
            const { status } = req.query || {};
            let query = `
                SELECT pr.*, 
                       t.full_name AS tutor_name, 
                       t.email AS tutor_email,
                       u.full_name AS resolved_by_name
                FROM tutor_payout_requests pr
                INNER JOIN users t ON t.id = pr.tutor_id
                LEFT JOIN users u ON u.id = pr.resolved_by
            `;
            const params = [];

            if (status) {
                query += ' WHERE pr.status = ?';
                params.push(status);
            }

            query += ' ORDER BY pr.created_at DESC';

            const [requests] = await pool.execute(query, params);

            // Fetch global payout statistics for Superadmin dashboard card indicators
            const [statsRows] = await pool.execute(
                `SELECT 
                    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending_total,
                    COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) AS approved_total,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_count
                 FROM tutor_payout_requests`
            );

            return res.status(200).json({
                success: true,
                stats: {
                    pendingTotal: parseFloat(statsRows[0].pending_total),
                    approvedTotal: parseFloat(statsRows[0].approved_total),
                    pendingCount: parseInt(statsRows[0].pending_count)
                },
                requests
            });
        } catch (error) {
            logger.error(`Get All Payout Requests Error: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Internal server error while fetching all payout requests.' });
        }
    }

    // Superadmin: Resolve a payout request (approve/reject)
    async resolvePayoutRequest(req, res) {
        try {
            const { id } = req.params;
            const { status, adminNotes } = req.body || {};
            const adminId = req.user.id;

            if (!['approved', 'rejected'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid payout resolution status. Must be approved or rejected.' });
            }

            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                // Get payout request to verify it's still pending
                const [rows] = await connection.execute(
                    `SELECT * FROM tutor_payout_requests WHERE id = ? FOR UPDATE`,
                    [id]
                );

                if (rows.length === 0) {
                    await connection.rollback();
                    return res.status(404).json({ success: false, message: 'Payout request not found.' });
                }

                const request = rows[0];
                if (request.status !== 'pending') {
                    await connection.rollback();
                    return res.status(400).json({ success: false, message: 'This payout request is already resolved.' });
                }

                const now = new Date();
                await connection.execute(
                    `UPDATE tutor_payout_requests
                     SET status = ?, admin_notes = ?, resolved_by = ?, resolved_at = ?, updated_at = ?
                     WHERE id = ?`,
                    [status, adminNotes || null, adminId, now, now, id]
                );

                await connection.commit();
                logger.info(`Superadmin ID ${adminId} resolved payout request ID ${id} to status: ${status}`);

                return res.status(200).json({
                    success: true,
                    message: `Payout request successfully marked as ${status}.`
                });
            } catch (err) {
                await connection.rollback();
                throw err;
            } finally {
                connection.release();
            }
        } catch (error) {
            logger.error(`Resolve Payout Request Error: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Internal server error while resolving payout request.' });
        }
    }
}

module.exports = new PayoutController();
