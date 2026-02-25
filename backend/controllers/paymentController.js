const paystackService = require('../services/paystackService');
const Task = require('../models/Task');
const logger = require('../utils/logger');
const { pool } = require('../config/database');

/**
 * PaymentController
 * Handles frontend payment verification and server-to-server webhooks.
 */
class PaymentController {
    /**
     * Verifies a transaction after frontend completion.
     * This is the immediate confirmation for the user.
     */
    /**
     * Verifies a transaction after frontend completion.
     */
    async verifyPayment(req, res) {
        try {
            const { reference, taskId } = req.body;

            if (!reference || !taskId) {
                return res.status(400).json({ success: false, message: 'Reference and taskId are required' });
            }

            const data = await paystackService.verifyTransaction(reference);

            if (data.status === 'success') {
                await this._processTaskPayment(taskId, reference, data);

                logger.info(`Payment verified successfully for Task ID: ${taskId}, Ref: ${reference}`);
                return res.status(200).json({
                    success: true,
                    message: 'Payment verified and updated',
                    data
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: `Payment status: ${data.status}`,
                    data
                });
            }
        } catch (error) {
            logger.error('Payment Verification Error:', error.message);
            res.status(500).json({ success: false, message: 'Internal server error during verification' });
        }
    }

    /**
     * Handles Paystack Webhooks.
     */
    async handleWebhook(req, res) {
        const signature = req.headers['x-paystack-signature'];
        const payload = req.body;

        if (!paystackService.validateWebhook(payload, signature)) {
            logger.warn('Invalid Paystack Webhook Signature received');
            return res.status(401).send('Invalid signature');
        }

        res.status(200).send('Webhook received');

        try {
            const event = payload.event;
            const data = payload.data;

            if (event === 'charge.success') {
                const reference = data.reference;
                const taskId = data.metadata?.task_id;

                if (taskId) {
                    await this._processTaskPayment(taskId, reference, data);
                    logger.info(`Webhook: Processed absolute payment for Task ${taskId} via charge.success.`);
                }
            }
        } catch (error) {
            logger.error('Webhook Processing Error:', error.message);
        }
    }

    /**
     * Internal helper to handle the task update logic based on milestone.
     */
    async _processTaskPayment(taskId, reference, data) {
        const task = await Task.findById(taskId);
        if (!task) {
            logger.error(`Payment Process Error: Task ${taskId} not found for reference ${reference}`);
            return;
        }

        const paymentData = {
            currency: data.currency,
            exchangeRate: data.metadata?.exchange_rate,
            kesAmount: data.currency === 'KES' ? data.amount / 100 : null
        };

        // Determine if this is a deposit or a full payment
        const isDepositFlow = task.requires_deposit === 1 && task.deposit_paid === 0;

        if (isDepositFlow) {
            await Task.markDepositAsPaid(taskId, reference, paymentData);
            // Move to in_progress if it was awaiting deposit
            if (task.status === 'pending_deposit') {
                await Task.update(taskId, { status: 'in_progress' });
            }
            logger.info(`Milestone: Deposit paid for Task ${taskId}. Status moved to in_progress.`);
        } else {
            await Task.markAsPaid(taskId, reference, paymentData);
            // Ensure status is marked as review/completed if it was in progress? 
            // Usually, full payment happens at the end, but could be upfront (direct).
            // We keep existing logic: markAsPaid marks it as paid.
            logger.info(`Milestone: Final payment paid for Task ${taskId}.`);
        }
    }

    /**
     * @route GET /api/payments
     * @desc Fetch all successful project payments (granular transaction history)
     * @access Private (Admin)
     */
    async getPayments(req, res) {
        try {
            const [rows] = await pool.execute(`
                SELECT p.*, 
                t.task_name,
                COALESCE(u.full_name, gc.name, t.client_name) as display_client_name,
                t.status as current_task_status
                FROM payments p
                JOIN tasks t ON p.task_id = t.id
                LEFT JOIN users u ON t.client_id = u.id
                LEFT JOIN guest_clients gc ON t.guest_client_id = gc.id
                ORDER BY p.created_at DESC
            `);

            return res.status(200).json({
                success: true,
                count: rows.length,
                data: rows
            });
        } catch (error) {
            logger.error('Error fetching payments audit:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch payment history'
            });
        }
    }
}

module.exports = new PaymentController();
