const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const paystackService = require('../services/paystackService');
const Task = require('../models/Task');
const PaymentSettings = require('../models/PaymentSettings');
const logger = require('../utils/logger');
const { pool } = require('../config/database');
const EmailService = require('../services/emailService');
const {
    roundMoney,
    derivePaymentState,
    syncTaskDueTracking
} = require('../services/taskPaymentStateService');

class PaymentController {
    getExchangeRate() {
        return parseFloat(process.env.EXCHANGE_RATE_USD_KES || 135);
    }

    toPaystackKesAmounts(amountUsd) {
        const exchangeRate = this.getExchangeRate();
        const expectedAmountUsd = roundMoney(amountUsd);
        const expectedAmountKes = expectedAmountUsd * exchangeRate;
        const amountKes = Math.round(expectedAmountKes * 100);

        return {
            exchangeRate,
            expectedAmountUsd,
            expectedAmountKes,
            amountKes
        };
    }

    getTaskPaymentSnapshot(task) {
        const derived = derivePaymentState(task);
        return {
            ...task,
            ...derived
        };
    }

    async getEligibleClientTasks(clientId, executor = pool) {
        const tasks = await Task.findClientTasks(clientId, executor, clientId);
        return tasks.filter((task) => Number(task.can_pay_now) === 1 && Number(task.current_due_amount) > 0);
    }

    buildBulkItems(tasks) {
        return tasks
            .sort((left, right) => left.id - right.id)
            .map((task, index) => {
                const { expectedAmountUsd, amountKes } = this.toPaystackKesAmounts(task.current_due_amount);
                return {
                    taskId: task.id,
                    phase: task.current_due_phase,
                    amountUsd: expectedAmountUsd,
                    amountKes,
                    sortOrder: index + 1
                };
            });
    }

    async initializePayment(req, res) {
        try {
            const { taskId, phase } = req.body;

            if (!taskId || !phase) {
                return res.status(400).json({ success: false, message: 'taskId and phase are required' });
            }

            const validPhases = ['deposit', 'balance', 'full'];
            if (!validPhases.includes(phase)) {
                return res.status(400).json({ success: false, message: `phase must be one of: ${validPhases.join(', ')}` });
            }

            const task = await Task.findById(taskId, pool, req.user.id);
            if (!task) {
                return res.status(404).json({ success: false, message: 'Task not found' });
            }

            if (req.user.role !== 'admin' && task.client_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied. You do not own this task.' });
            }

            if (Number(task.can_pay_now) !== 1 || !task.current_due_phase) {
                return res.status(400).json({ success: false, message: 'This task is not currently payable.' });
            }

            if (task.current_due_phase !== phase) {
                return res.status(400).json({
                    success: false,
                    message: `This task is currently expecting a ${task.current_due_phase} payment.`
                });
            }

            const { nonce, expiresAt, ...amounts } = this.createIntentAmounts(task.current_due_amount);

            await pool.execute(
                `INSERT INTO payment_intents (task_id, client_id, phase, amount_kes, currency, nonce, expires_at)
                 VALUES (?, ?, ?, ?, 'KES', ?, ?)`,
                [taskId, req.user.id, phase, amounts.amountKes, nonce, expiresAt]
            );

            logger.info(`Payment intent created: task=${taskId}, phase=${phase}, usd=${amounts.expectedAmountUsd}, user=${req.user.id}`);

            return res.status(201).json({
                success: true,
                nonce,
                expectedAmountUsd: amounts.expectedAmountUsd,
                expectedAmountKes: amounts.expectedAmountKes,
                amountKes: amounts.amountKes,
                exchangeRate: amounts.exchangeRate,
                phase,
                taskId
            });
        } catch (error) {
            logger.error(`Initialize Payment Error: ${error.message}`);
            res.status(500).json({ success: false, message: 'Failed to initialize payment' });
        }
    }

    createIntentAmounts(amountUsd) {
        const amounts = this.toPaystackKesAmounts(amountUsd);
        return {
            ...amounts,
            nonce: crypto.randomBytes(32).toString('hex'),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000)
        };
    }

    async verifyPayment(req, res) {
        try {
            const { reference, taskId, nonce } = req.body;

            if (!reference || !taskId || !nonce) {
                return res.status(400).json({ success: false, message: 'reference, taskId, and nonce are required' });
            }

            const [[intent]] = await pool.execute(
                `SELECT *
                 FROM payment_intents
                 WHERE nonce = ? AND task_id = ? AND status = 'pending' AND expires_at > NOW()`,
                [nonce, taskId]
            );

            if (!intent) {
                logger.warn(`Invalid/expired payment intent: nonce=${nonce}, task=${taskId}, user=${req.user.id}`);
                return res.status(400).json({ success: false, message: 'Invalid or expired payment session. Please start the payment again.' });
            }

            if (req.user.role !== 'admin' && intent.client_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied. You do not own this payment session.' });
            }

            const data = await paystackService.verifyTransaction(reference);

            const verifiedTaskId = data.metadata?.task_id?.toString();
            if (verifiedTaskId && verifiedTaskId !== taskId.toString()) {
                await pool.execute(`UPDATE payment_intents SET status = 'failed' WHERE id = ?`, [intent.id]);
                await this.sendTaskMismatchAlert(reference, verifiedTaskId, taskId, req.user.id);
                return res.status(400).json({ success: false, message: 'Payment reference does not match this task.' });
            }

            if (data.amount < intent.amount_kes) {
                await pool.execute(`UPDATE payment_intents SET status = 'failed' WHERE id = ?`, [intent.id]);
                await this.sendUnderpaymentAlert({
                    context: 'Verify Endpoint',
                    taskId,
                    reference,
                    expectedAmountKes: intent.amount_kes,
                    receivedAmountKes: data.amount,
                    userId: req.user.id
                });
                return res.status(400).json({
                    success: false,
                    message: 'Payment amount does not match the required amount. Please contact support.'
                });
            }

            if (data.status !== 'success') {
                return res.status(400).json({ success: false, message: `Payment status: ${data.status}`, data });
            }

            await pool.execute(
                `UPDATE payment_intents SET status = 'completed', reference = ? WHERE id = ?`,
                [reference, intent.id]
            );

            await this.processTaskPayment(intent.task_id, reference, data, { phase: intent.phase, gatewayReference: reference });

            logger.info(`Payment verified: task=${taskId}, ref=${reference}, phase=${intent.phase}`);
            return res.status(200).json({ success: true, message: 'Payment verified and updated', data });
        } catch (error) {
            logger.error(`Payment Verification Error: ${error.message}`);
            res.status(500).json({ success: false, message: 'Internal server error during verification' });
        }
    }

    async handleWebhook(req, res) {
        const signature = req.headers['x-paystack-signature'];
        const payload = req.body;

        if (!paystackService.validateWebhook(payload, signature)) {
            logger.warn('Invalid Paystack Webhook Signature received');
            return res.status(401).send('Invalid signature');
        }

        res.status(200).send('Webhook received');

        try {
            if (payload.event !== 'charge.success') return;

            const data = payload.data;
            const reference = data.reference;
            const nonce = data.metadata?.nonce;

            if (!nonce) {
                logger.warn(`Webhook: charge.success without nonce. Ref=${reference} ignored.`);
                return;
            }

            const [[singleIntent]] = await pool.execute(
                `SELECT * FROM payment_intents WHERE nonce = ? AND status = 'pending'`,
                [nonce]
            );

            if (singleIntent) {
                if (data.amount < singleIntent.amount_kes) {
                    await pool.execute(`UPDATE payment_intents SET status = 'failed' WHERE id = ?`, [singleIntent.id]);
                    await this.sendUnderpaymentAlert({
                        context: 'Webhook',
                        taskId: singleIntent.task_id,
                        reference,
                        expectedAmountKes: singleIntent.amount_kes,
                        receivedAmountKes: data.amount
                    });
                    return;
                }

                await pool.execute(
                    `UPDATE payment_intents SET status = 'completed', reference = ? WHERE id = ?`,
                    [reference, singleIntent.id]
                );

                await this.processTaskPayment(singleIntent.task_id, reference, data, {
                    phase: singleIntent.phase,
                    gatewayReference: reference
                });

                logger.info(`Webhook: processed single payment for task ${singleIntent.task_id}.`);
                return;
            }

            const [[bulkIntent]] = await pool.execute(
                `SELECT * FROM bulk_payment_intents WHERE nonce = ? AND status = 'pending'`,
                [nonce]
            );

            if (!bulkIntent) {
                logger.warn(`Webhook: unknown nonce=${nonce}. Ref=${reference}`);
                return;
            }

            if (data.amount < bulkIntent.total_amount_kes) {
                await pool.execute(`UPDATE bulk_payment_intents SET status = 'failed' WHERE id = ?`, [bulkIntent.id]);
                await this.sendBulkUnderpaymentAlert(reference, bulkIntent.total_amount_kes, data.amount);
                return;
            }

            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                await connection.execute(
                    `UPDATE bulk_payment_intents
                     SET status = 'completed', reference = ?
                     WHERE id = ?`,
                    [reference, bulkIntent.id]
                );
                await this.processBulkPaymentIntent(bulkIntent, reference, data, connection);
                await connection.commit();
                logger.info(`Webhook: processed bulk payment for client ${bulkIntent.client_id}.`);
            } catch (error) {
                await connection.rollback();
                await pool.execute(
                    `UPDATE bulk_payment_intents SET status = 'failed' WHERE id = ?`,
                    [bulkIntent.id]
                );
                logger.error(`Webhook bulk processing failed: ${error.message}`);
            } finally {
                connection.release();
            }
        } catch (error) {
            logger.error(`Webhook Processing Error: ${error.message}`);
        }
    }

    async processTaskPayment(taskId, reference, data, options = {}) {
        const executor = options.executor || pool;
        const task = await Task.findById(taskId, executor, options.viewerId || 0);
        if (!task) {
            logger.error(`Payment Process Error: Task ${taskId} not found for reference ${reference}`);
            return;
        }

        const paymentData = {
            currency: data.currency,
            exchangeRate: data.metadata?.exchange_rate || this.getExchangeRate(),
            kesAmount: data.currency === 'KES'
                ? roundMoney((options.kesAmount !== undefined ? options.kesAmount : data.amount / 100))
                : null
        };

        const phase = options.phase || task.current_due_phase;

        if (phase === 'deposit') {
            await Task.markDepositAsPaid(taskId, options.internalReference || reference, paymentData, {
                executor,
                gatewayReference: options.gatewayReference || reference
            });

            const refreshedTask = await Task.findById(taskId, executor, options.viewerId || 0);
            if (refreshedTask && refreshedTask.status === 'pending_deposit') {
                await Task.update(taskId, { status: 'in_progress' }, executor);
            }
        } else {
            await Task.markAsPaid(taskId, options.internalReference || reference, paymentData, {
                executor,
                gatewayReference: options.gatewayReference || reference,
                type: phase === 'balance' ? 'balance' : 'full'
            });
        }

        await syncTaskDueTracking(task, taskId, executor);
    }

    async getPayments(req, res) {
        try {
            const [rows] = await pool.execute(
                `SELECT p.*,
                        t.task_name,
                        COALESCE(u.full_name, gc.name, t.client_name) as display_client_name,
                        t.status as current_task_status
                 FROM payments p
                 JOIN tasks t ON p.task_id = t.id
                 LEFT JOIN users u ON t.client_id = u.id
                 LEFT JOIN guest_clients gc ON t.guest_client_id = gc.id
                 ORDER BY p.created_at DESC`
            );

            return res.status(200).json({ success: true, count: rows.length, data: rows });
        } catch (error) {
            logger.error(`Error fetching payments audit: ${error.message}`);
            res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
        }
    }

    async getPaymentSettings(req, res) {
        try {
            const settings = await PaymentSettings.get();
            return res.status(200).json({ success: true, data: settings });
        } catch (error) {
            logger.error(`Error fetching payment settings: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Failed to fetch payment settings' });
        }
    }

    async updatePaymentSettings(req, res) {
        try {
            const {
                depositRemindersEnabled,
                depositReminderIntervalHours,
                balanceRemindersEnabled,
                balanceReminderIntervalDays
            } = req.body;

            if (!Number.isInteger(Number(depositReminderIntervalHours)) || Number(depositReminderIntervalHours) < 1 || Number(depositReminderIntervalHours) > 168) {
                return res.status(400).json({ success: false, message: 'Deposit reminder interval must be an integer between 1 and 168 hours.' });
            }

            if (!Number.isInteger(Number(balanceReminderIntervalDays)) || Number(balanceReminderIntervalDays) < 1 || Number(balanceReminderIntervalDays) > 90) {
                return res.status(400).json({ success: false, message: 'Balance reminder interval must be an integer between 1 and 90 days.' });
            }

            const settings = await PaymentSettings.update({
                depositRemindersEnabled,
                depositReminderIntervalHours,
                balanceRemindersEnabled,
                balanceReminderIntervalDays
            }, req.user.id);

            return res.status(200).json({ success: true, data: settings });
        } catch (error) {
            logger.error(`Error updating payment settings: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Failed to update payment settings' });
        }
    }

    async getOutstandingSummary(req, res) {
        try {
            const tasks = await this.getEligibleClientTasks(req.user.id);
            const totalDue = tasks.reduce((sum, task) => sum + Number(task.current_due_amount || 0), 0);

            return res.status(200).json({
                success: true,
                data: {
                    totalDue: roundMoney(totalDue),
                    payableTaskCount: tasks.length,
                    tasks: tasks.map((task) => ({
                        id: task.id,
                        taskName: task.task_name,
                        currentDuePhase: task.current_due_phase,
                        currentDueAmount: task.current_due_amount
                    }))
                }
            });
        } catch (error) {
            logger.error(`Error fetching outstanding summary: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Failed to fetch outstanding summary' });
        }
    }

    async initializeBulkPayment(req, res) {
        try {
            const tasks = await this.getEligibleClientTasks(req.user.id);
            if (tasks.length === 0) {
                return res.status(400).json({ success: false, message: 'There are no outstanding payments to clear.' });
            }

            const items = this.buildBulkItems(tasks);
            const totalAmountUsd = roundMoney(items.reduce((sum, item) => sum + item.amountUsd, 0));
            const totalAmountKes = items.reduce((sum, item) => sum + item.amountKes, 0);
            const nonce = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

            const [result] = await pool.execute(
                `INSERT INTO bulk_payment_intents
                    (client_id, total_amount_usd, total_amount_kes, currency, nonce, expires_at)
                 VALUES (?, ?, ?, 'KES', ?, ?)`,
                [req.user.id, totalAmountUsd, totalAmountKes, nonce, expiresAt]
            );

            for (const item of items) {
                await pool.execute(
                    `INSERT INTO bulk_payment_intent_items
                        (intent_id, task_id, phase, amount_usd, amount_kes, sort_order)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [result.insertId, item.taskId, item.phase, item.amountUsd, item.amountKes, item.sortOrder]
                );
            }

            const exchangeRate = this.getExchangeRate();

            return res.status(201).json({
                success: true,
                nonce,
                totalAmountUsd,
                totalAmountKes,
                totalAmountKesDisplay: roundMoney(totalAmountKes / 100),
                exchangeRate,
                payableTaskCount: items.length
            });
        } catch (error) {
            logger.error(`Initialize Bulk Payment Error: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Failed to initialize bulk payment' });
        }
    }

    async verifyBulkPayment(req, res) {
        try {
            const { reference, nonce } = req.body;

            if (!reference || !nonce) {
                return res.status(400).json({ success: false, message: 'reference and nonce are required' });
            }

            const [[intent]] = await pool.execute(
                `SELECT *
                 FROM bulk_payment_intents
                 WHERE nonce = ? AND client_id = ? AND status = 'pending' AND expires_at > NOW()`,
                [nonce, req.user.id]
            );

            if (!intent) {
                return res.status(400).json({ success: false, message: 'Invalid or expired bulk payment session. Please start again.' });
            }

            const data = await paystackService.verifyTransaction(reference);
            if (data.amount < intent.total_amount_kes) {
                await pool.execute(`UPDATE bulk_payment_intents SET status = 'failed' WHERE id = ?`, [intent.id]);
                await this.sendBulkUnderpaymentAlert(reference, intent.total_amount_kes, data.amount);
                return res.status(400).json({
                    success: false,
                    message: 'Payment amount does not match the required total.'
                });
            }

            if (data.status !== 'success') {
                return res.status(400).json({ success: false, message: `Payment status: ${data.status}`, data });
            }

            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                await connection.execute(
                    `UPDATE bulk_payment_intents
                     SET status = 'completed', reference = ?
                     WHERE id = ?`,
                    [reference, intent.id]
                );
                await this.processBulkPaymentIntent(intent, reference, data, connection);
                await connection.commit();
            } catch (error) {
                await connection.rollback();
                await pool.execute(`UPDATE bulk_payment_intents SET status = 'failed' WHERE id = ?`, [intent.id]);
                logger.error(`Bulk payment verification error: ${error.message}`);
                return res.status(400).json({
                    success: false,
                    message: 'Bulk payment could not be applied because the outstanding tasks changed. Please refresh and try again.'
                });
            } finally {
                connection.release();
            }

            return res.status(200).json({ success: true, message: 'Bulk payment verified and applied.' });
        } catch (error) {
            logger.error(`Bulk Payment Verification Error: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Internal server error during bulk verification' });
        }
    }

    async processBulkPaymentIntent(intent, gatewayReference, data, connection) {
        const [items] = await connection.execute(
            `SELECT *
             FROM bulk_payment_intent_items
             WHERE intent_id = ?
             ORDER BY sort_order ASC, id ASC`,
            [intent.id]
        );

        if (items.length === 0) {
            throw new Error('Bulk payment intent has no items.');
        }

        for (const item of items) {
            const task = await Task.findById(item.task_id, connection, intent.client_id);
            if (!task || task.client_id !== intent.client_id) {
                throw new Error(`Task ${item.task_id} is no longer payable by this client.`);
            }

            if (task.current_due_phase !== item.phase || Math.abs(Number(task.current_due_amount) - Number(item.amount_usd)) > 0.009) {
                throw new Error(`Task ${item.task_id} payment state changed after bulk intent creation.`);
            }

            const internalReference = `${gatewayReference}:${item.task_id}:${item.phase}:${uuidv4().slice(0, 8)}`;
            await this.processTaskPayment(item.task_id, gatewayReference, data, {
                executor: connection,
                viewerId: intent.client_id,
                phase: item.phase,
                internalReference,
                gatewayReference,
                kesAmount: roundMoney(item.amount_kes / 100)
            });
        }
    }

    async sendTaskMismatchAlert(reference, verifiedTaskId, requestedTaskId, userId) {
        return EmailService.notifyAdmin({
            subject: 'Payment Security Alert: Task ID Mismatch',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:2px solid #ef4444;border-radius:8px;">
                    <h2 style="color:#ef4444;">Payment Task ID Mismatch Detected</h2>
                    <p>A payment reference was submitted for a different task than it was issued for.</p>
                    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                        <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Reference</td><td style="padding:8px;">${reference}</td></tr>
                        <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Task in Reference</td><td style="padding:8px;">#${verifiedTaskId}</td></tr>
                        <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Task Claimed</td><td style="padding:8px;">#${requestedTaskId}</td></tr>
                        <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">User ID</td><td style="padding:8px;">${userId}</td></tr>
                    </table>
                </div>`
        }).catch((error) => logger.error(`Failed to send mismatch alert email: ${error.message}`));
    }

    async sendUnderpaymentAlert({ context, taskId, reference, expectedAmountKes, receivedAmountKes, userId }) {
        return EmailService.notifyAdmin({
            subject: `Payment Security Alert: Amount Underpayment on ${context}`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:2px solid #ef4444;border-radius:8px;">
                    <h2 style="color:#ef4444;">Payment Amount Mismatch (${context})</h2>
                    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                        <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Task ID</td><td style="padding:8px;">#${taskId}</td></tr>
                        <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Reference</td><td style="padding:8px;">${reference}</td></tr>
                        <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Expected (KES kobo)</td><td style="padding:8px;">${expectedAmountKes}</td></tr>
                        <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Received (KES kobo)</td><td style="padding:8px;">${receivedAmountKes}</td></tr>
                        ${userId ? `<tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">User ID</td><td style="padding:8px;">${userId}</td></tr>` : ''}
                    </table>
                </div>`
        }).catch((error) => logger.error(`Failed to send underpayment alert email: ${error.message}`));
    }

    async sendBulkUnderpaymentAlert(reference, expectedAmountKes, receivedAmountKes) {
        return EmailService.notifyAdmin({
            subject: 'Payment Security Alert: Bulk Underpayment',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:2px solid #ef4444;border-radius:8px;">
                    <h2 style="color:#ef4444;">Bulk Payment Amount Mismatch</h2>
                    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                        <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Reference</td><td style="padding:8px;">${reference}</td></tr>
                        <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Expected (KES kobo)</td><td style="padding:8px;">${expectedAmountKes}</td></tr>
                        <tr><td style="padding:8px;background:#fef2f2;font-weight:bold;">Received (KES kobo)</td><td style="padding:8px;">${receivedAmountKes}</td></tr>
                    </table>
                </div>`
        }).catch((error) => logger.error(`Failed to send bulk underpayment alert email: ${error.message}`));
    }
}

module.exports = new PaymentController();
