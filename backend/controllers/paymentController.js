const paystackService = require('../services/paystackService');
const Task = require('../models/Task');
const logger = require('../utils/logger');
const { pool } = require('../config/database');
const crypto = require('crypto');
const EmailService = require('../services/emailService');

/**
 * PaymentController
 * Handles frontend payment verification and server-to-server webhooks.
 */
class PaymentController {

    /**
     * @route POST /api/payments/initialize
     * @desc  Create a server-side payment intent before opening Paystack.
     *        Returns a nonce + server-computed amount the frontend must embed
     *        in Paystack metadata. This prevents amount/task tampering (F-08 / F-09).
     * @access Private (Client / Admin)
     */
    async initializePayment(req, res) {
        try {
            const { taskId, phase } = req.body; // phase: 'deposit' | 'balance' | 'full'

            if (!taskId || !phase) {
                return res.status(400).json({ success: false, message: 'taskId and phase are required' });
            }

            const validPhases = ['deposit', 'balance', 'full'];
            if (!validPhases.includes(phase)) {
                return res.status(400).json({ success: false, message: `phase must be one of: ${validPhases.join(', ')}` });
            }

            const task = await Task.findById(taskId);
            if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
            if (req.user.role !== 'admin' && task.client_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied. You do not own this task.' });
            }

            // Pick the correct USD amount from the task based on phase
            const expectedAmount = phase === 'deposit' ? task.deposit_amount : task.expected_amount;
            if (!expectedAmount || parseFloat(expectedAmount) <= 0) {
                return res.status(400).json({ success: false, message: 'Task has no valid amount set for this payment phase.' });
            }

            // F-12 fix: convert USD amount → KES kobo
            // DB stores amounts in USD. Paystack charges in KES (smallest unit = kobo/cents).
            // Formula: USD × exchange_rate × 100
            const exchangeRate = parseFloat(process.env.EXCHANGE_RATE_USD_KES || 135);
            const expectedAmountUsd = parseFloat(expectedAmount);
            const expectedAmountKes = expectedAmountUsd * exchangeRate;       // KES (human-readable)
            const amountKes = Math.round(expectedAmountKes * 100);            // KES kobo (Paystack `amount` field)

            const nonce = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 min window

            await pool.execute(
                `INSERT INTO payment_intents (task_id, client_id, phase, amount_kes, currency, nonce, expires_at)
                 VALUES (?, ?, ?, ?, 'KES', ?, ?)`,
                [taskId, req.user.id, phase, amountKes, nonce, expiresAt]
            );

            logger.info(`Payment intent created: task=${taskId}, phase=${phase}, usd=${expectedAmountUsd}, kes=${expectedAmountKes}, kobo=${amountKes}, user=${req.user.id}`);

            return res.status(201).json({
                success: true,
                nonce,
                expectedAmountUsd,        // original USD amount (e.g. 50.00)
                expectedAmountKes,        // human-readable KES (e.g. 6750.00) — use for display
                amountKes,                // KES kobo (e.g. 675000) — pass directly to Paystack's `amount` field
                exchangeRate,
                phase,
                taskId
            });
        } catch (error) {
            logger.error('Initialize Payment Error:', error.message);
            res.status(500).json({ success: false, message: 'Failed to initialize payment' });
        }
    }

    /**
     * @route POST /api/payments/verify
     * @desc  Verify a Paystack transaction after frontend completion.
     *        F-08 fix: validates amount against the server-stored intent.
     *        F-03 fix (retained): validates task ownership + metadata task_id.
     * @access Private (Client / Admin)
     */
    async verifyPayment(req, res) {
        try {
            const { reference, taskId, nonce } = req.body;

            if (!reference || !taskId || !nonce) {
                return res.status(400).json({ success: false, message: 'reference, taskId, and nonce are required' });
            }

            // 1. Load and validate the payment intent
            const [[intent]] = await pool.execute(
                `SELECT * FROM payment_intents
                 WHERE nonce = ? AND task_id = ? AND status = 'pending' AND expires_at > NOW()`,
                [nonce, taskId]
            );

            if (!intent) {
                logger.warn(`Invalid/expired payment intent: nonce=${nonce}, task=${taskId}, user=${req.user.id}`);
                return res.status(400).json({ success: false, message: 'Invalid or expired payment session. Please start the payment again.' });
            }

            // 2. Ownership — intent.client_id must match caller (or caller is admin)
            if (req.user.role !== 'admin' && intent.client_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied. You do not own this payment session.' });
            }

            // 3. Verify with Paystack
            const data = await paystackService.verifyTransaction(reference);

            // 4. Cross-check metadata.task_id (retained F-03 fix)
            const verifiedTaskId = data.metadata?.task_id?.toString();
            if (verifiedTaskId && verifiedTaskId !== taskId.toString()) {
                logger.warn(`Metadata task_id mismatch: ref_task=${verifiedTaskId}, req_task=${taskId}, user=${req.user.id}`);
                await pool.execute(`UPDATE payment_intents SET status = 'failed' WHERE id = ?`, [intent.id]);
                EmailService.notifyAdmin({
                    subject: '🚨 Payment Security Alert: Task ID Mismatch',
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:2px solid #ef4444;border-radius:8px;">
                            <h2 style="color:#ef4444;">⚠️ Payment Task ID Mismatch Detected</h2>
                            <p>A payment reference was submitted for a different task than it was issued for. This may indicate a payment replay attack.</p>
                            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                                <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Reference</td><td style="padding:8px;">${reference}</td></tr>
                                <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Task in Reference</td><td style="padding:8px;">#${verifiedTaskId}</td></tr>
                                <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Task Claimed</td><td style="padding:8px;">#${taskId}</td></tr>
                                <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">User ID</td><td style="padding:8px;">${req.user.id}</td></tr>
                                <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Time</td><td style="padding:8px;">${new Date().toISOString()}</td></tr>
                            </table>
                            <p style="color:#6b7280;font-size:12px;">This payment has been blocked and the intent marked as failed.</p>
                        </div>`
                }).catch(e => logger.error('Failed to send anomaly alert email:', e.message));
                return res.status(400).json({ success: false, message: 'Payment reference does not match this task.' });
            }

            // 5. F-08 fix: Amount validation — reject if Paystack charged less than expected
            if (data.amount < intent.amount_kes) {
                logger.warn(`Amount mismatch: expected=${intent.amount_kes}, got=${data.amount}, task=${taskId}, user=${req.user.id}`);
                await pool.execute(`UPDATE payment_intents SET status = 'failed' WHERE id = ?`, [intent.id]);
                EmailService.notifyAdmin({
                    subject: '🚨 Payment Security Alert: Amount Underpayment on Verify',
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:2px solid #ef4444;border-radius:8px;">
                            <h2 style="color:#ef4444;">⚠️ Payment Amount Mismatch (Verify Endpoint)</h2>
                            <p>A client submitted a payment with an amount lower than the required amount. This may indicate an attempted underpayment attack.</p>
                            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                                <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Task ID</td><td style="padding:8px;">#${taskId}</td></tr>
                                <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Reference</td><td style="padding:8px;">${reference}</td></tr>
                                <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Expected (KES kobo)</td><td style="padding:8px;">${intent.amount_kes} = KES ${intent.amount_kes / 100}</td></tr>
                                <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Received (KES kobo)</td><td style="padding:8px;">${data.amount} = KES ${data.amount / 100}</td></tr>
                                <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">User ID</td><td style="padding:8px;">${req.user.id}</td></tr>
                                <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Time</td><td style="padding:8px;">${new Date().toISOString()}</td></tr>
                            </table>
                            <p style="color:#6b7280;font-size:12px;">Payment blocked. Task NOT marked as paid.</p>
                        </div>`
                }).catch(e => logger.error('Failed to send anomaly alert email:', e.message));
                return res.status(400).json({
                    success: false,
                    message: 'Payment amount does not match the required amount. Please contact support.'
                });
            }

            if (data.status !== 'success') {
                return res.status(400).json({ success: false, message: `Payment status: ${data.status}`, data });
            }

            // 6. Mark intent completed and bind reference
            await pool.execute(
                `UPDATE payment_intents SET status = 'completed', reference = ? WHERE id = ?`,
                [reference, intent.id]
            );

            await this._processTaskPayment(taskId, reference, data);

            logger.info(`Payment verified: task=${taskId}, ref=${reference}, phase=${intent.phase}`);
            return res.status(200).json({ success: true, message: 'Payment verified and updated', data });

        } catch (error) {
            logger.error('Payment Verification Error:', error.message);
            res.status(500).json({ success: false, message: 'Internal server error during verification' });
        }
    }

    /**
     * @route POST /api/payments/webhook
     * @desc  Handle Paystack Webhooks.
     *        F-09 fix: requires a server-issued nonce in metadata before processing.
     * @access Public (signature verified)
     */
    async handleWebhook(req, res) {
        const signature = req.headers['x-paystack-signature'];
        const payload = req.body;

        if (!paystackService.validateWebhook(payload, signature)) {
            logger.warn('Invalid Paystack Webhook Signature received');
            return res.status(401).send('Invalid signature');
        }

        // Acknowledge immediately (Paystack expects a fast 200)
        res.status(200).send('Webhook received');

        try {
            const event = payload.event;
            const data = payload.data;

            if (event === 'charge.success') {
                const reference = data.reference;
                const nonce = data.metadata?.nonce;

                // F-09 fix: require a server-issued nonce — no nonce = reject
                if (!nonce) {
                    logger.warn(`Webhook: charge.success without nonce. Ref=${reference} — ignored (possible external payment).`);
                    EmailService.notifyAdmin({
                        subject: '🚨 Payment Security Alert: Webhook Without Nonce',
                        html: `
                            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:2px solid #f59e0b;border-radius:8px;">
                                <h2 style="color:#f59e0b;">⚠️ Webhook Received Without Security Nonce</h2>
                                <p>A Paystack <strong>charge.success</strong> webhook arrived without a server-issued nonce in its metadata. This could be an unauthenticated or externally-crafted webhook attempting to mark a task as paid.</p>
                                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                                    <tr><td style="padding:8px;background:#fffbeb;font-weight:bold;">Reference</td><td style="padding:8px;">${reference}</td></tr>
                                    <tr><td style="padding:8px;background:#fffbeb;font-weight:bold;">Time</td><td style="padding:8px;">${new Date().toISOString()}</td></tr>
                                </table>
                                <p style="color:#6b7280;font-size:12px;">Webhook ignored. No tasks were modified.</p>
                            </div>`
                    }).catch(e => logger.error('Failed to send anomaly alert email:', e.message));
                    return;
                }

                const [[intent]] = await pool.execute(
                    `SELECT * FROM payment_intents WHERE nonce = ? AND status = 'pending'`,
                    [nonce]
                );

                if (!intent) {
                    logger.warn(`Webhook: unknown nonce=${nonce}. Possible replay/forgery. Ref=${reference}`);
                    EmailService.notifyAdmin({
                        subject: '🚨 Payment Security Alert: Unknown Nonce on Webhook',
                        html: `
                            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:2px solid #ef4444;border-radius:8px;">
                                <h2 style="color:#ef4444;">⚠️ Webhook With Forged/Unknown Nonce</h2>
                                <p>A Paystack webhook arrived with a nonce that does not match any pending payment intent. This is a strong indicator of a <strong>replay attack or webhook forgery</strong>.</p>
                                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                                    <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Reference</td><td style="padding:8px;">${reference}</td></tr>
                                    <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Unknown Nonce</td><td style="padding:8px;">${nonce}</td></tr>
                                    <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Time</td><td style="padding:8px;">${new Date().toISOString()}</td></tr>
                                </table>
                                <p style="color:#6b7280;font-size:12px;">Webhook ignored. No tasks were modified. Investigate this reference in your Paystack dashboard.</p>
                            </div>`
                    }).catch(e => logger.error('Failed to send anomaly alert email:', e.message));
                    return;
                }

                // Amount check
                if (data.amount < intent.amount_kes) {
                    logger.warn(`Webhook amount mismatch: expected=${intent.amount_kes}, got=${data.amount}, task=${intent.task_id}`);
                    await pool.execute(`UPDATE payment_intents SET status = 'failed' WHERE id = ?`, [intent.id]);
                    EmailService.notifyAdmin({
                        subject: '🚨 Payment Security Alert: Amount Underpayment on Webhook',
                        html: `
                            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:2px solid #ef4444;border-radius:8px;">
                                <h2 style="color:#ef4444;">⚠️ Webhook Payment Amount Mismatch</h2>
                                <p>Paystack confirmed a payment but the amount is less than what was required. This may indicate an underpayment attempt bypassing the verify endpoint.</p>
                                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                                    <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Task ID</td><td style="padding:8px;">#${intent.task_id}</td></tr>
                                    <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Reference</td><td style="padding:8px;">${reference}</td></tr>
                                    <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Expected (KES kobo)</td><td style="padding:8px;">${intent.amount_kes} = KES ${intent.amount_kes / 100}</td></tr>
                                    <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Received (KES kobo)</td><td style="padding:8px;">${data.amount} = KES ${data.amount / 100}</td></tr>
                                    <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Time</td><td style="padding:8px;">${new Date().toISOString()}</td></tr>
                                </table>
                                <p style="color:#6b7280;font-size:12px;">Payment blocked. Task NOT marked as paid.</p>
                            </div>`
                    }).catch(e => logger.error('Failed to send anomaly alert email:', e.message));
                    return;
                }

                await pool.execute(
                    `UPDATE payment_intents SET status = 'completed', reference = ? WHERE id = ?`,
                    [reference, intent.id]
                );

                await this._processTaskPayment(intent.task_id, reference, data);
                logger.info(`Webhook: Processed payment for Task ${intent.task_id} via nonce=${nonce}.`);
            }
        } catch (error) {
            logger.error('Webhook Processing Error:', error.message);
        }
    }

    /**
     * Internal helper to update the task based on payment milestone.
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

        const isDepositFlow = task.requires_deposit === 1 && task.deposit_paid === 0;

        if (isDepositFlow) {
            await Task.markDepositAsPaid(taskId, reference, paymentData);
            if (task.status === 'pending_deposit') {
                await Task.update(taskId, { status: 'in_progress' });
            }
            logger.info(`Milestone: Deposit paid for Task ${taskId}. Status moved to in_progress.`);
        } else {
            await Task.markAsPaid(taskId, reference, paymentData);
            logger.info(`Milestone: Final payment paid for Task ${taskId}.`);
        }
    }

    /**
     * @route GET /api/payments
     * @desc  Fetch all successful project payments (admin only)
     * @access Private (Admin) — enforced by requireAdmin in routes/payments.js
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

            return res.status(200).json({ success: true, count: rows.length, data: rows });
        } catch (error) {
            logger.error('Error fetching payments audit:', error.message);
            res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
        }
    }
}

module.exports = new PaymentController();
