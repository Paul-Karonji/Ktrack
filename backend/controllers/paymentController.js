const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const paystackService = require('../services/paystackService');
const Task = require('../models/Task');
const GuestClient = require('../models/GuestClient');
const PaymentSettings = require('../models/PaymentSettings');
const logger = require('../utils/logger');
const { pool } = require('../config/database');
const EmailService = require('../services/emailService');
const paymentReminderService = require('../services/paymentReminderService');
const guestPaymentLinkService = require('../services/guestPaymentLinkService');
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

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
    }

    sanitizeGuestTask(task) {
        return {
            id: task.id,
            taskName: task.task_name || `Task #${task.id}`,
            currentDuePhase: task.current_due_phase,
            currentDueAmount: roundMoney(task.current_due_amount || 0),
            paymentStateLabel: task.payment_state_label,
            status: task.status
        };
    }

    async getEligibleGuestTasks(guestClientId, executor = pool) {
        const tasks = await Task.findAll({ guestClientId }, 0, executor);
        return tasks.filter((task) =>
            Number(task.guest_client_id) === Number(guestClientId)
            && Number(task.can_pay_now) === 1
            && Number(task.current_due_amount) > 0
            && Number(task.is_paid) !== 1
            && task.status !== 'cancelled'
        );
    }

    async getGuestLinkContext(token, executor = pool) {
        const resolved = await guestPaymentLinkService.resolveToken(token, executor);
        if (!resolved) {
            return {
                statusCode: 404,
                state: 'invalid',
                message: 'This payment link is invalid or has been tampered with.'
            };
        }

        const { link, publicUrl } = resolved;

        if (link.status === 'revoked') {
            return {
                statusCode: 410,
                state: 'revoked',
                message: 'This payment link has been revoked.'
            };
        }

        if (link.status === 'settled' && link.scope === 'task') {
            return {
                statusCode: 410,
                state: 'settled',
                message: 'This payment link has already been settled.'
            };
        }

        if (link.upgraded_to_user_id) {
            return {
                statusCode: 410,
                state: 'invalid',
                message: 'This guest profile now uses the main dashboard instead of a public payment link.'
            };
        }

        return {
            link,
            publicUrl
        };
    }

    async getGuestLinkTasks(link, executor = pool) {
        if (link.scope === 'task') {
            const task = await Task.findById(link.task_id, executor, 0);

            if (!task || Number(task.guest_client_id) !== Number(link.guest_client_id)) {
                return {
                    state: 'invalid',
                    tasks: [],
                    message: 'This payment link is no longer available.'
                };
            }

            if (task.status === 'cancelled') {
                return {
                    state: 'cancelled',
                    tasks: [],
                    message: 'This task is no longer payable.'
                };
            }

            if (Number(task.is_paid) === 1) {
                await guestPaymentLinkService.settleLink(link.id, executor);
                return {
                    state: 'settled',
                    tasks: [],
                    message: 'This task has already been fully paid.'
                };
            }

            if (Number(task.can_pay_now) !== 1 || Number(task.current_due_amount || 0) <= 0) {
                return {
                    state: 'unavailable',
                    tasks: [],
                    message: 'This task is not currently payable.'
                };
            }

            return {
                state: 'ready',
                tasks: [task],
                message: null
            };
        }

        const tasks = await this.getEligibleGuestTasks(link.guest_client_id, executor);
        return {
            state: tasks.length > 0 ? 'ready' : 'empty',
            tasks,
            message: tasks.length > 0 ? null : 'No outstanding payment is due right now.'
        };
    }

    selectGuestPaymentTasks(link, tasks, mode, taskId) {
        if (link.scope === 'task') {
            return tasks.slice(0, 1);
        }

        if (mode === 'single') {
            const numericTaskId = Number(taskId);
            const selectedTask = tasks.find((task) => task.id === numericTaskId);
            if (!selectedTask) {
                throw new Error('The selected task is not available for payment from this link.');
            }
            return [selectedTask];
        }

        if (mode === 'bulk') {
            return tasks;
        }

        throw new Error('mode must be one of: single, bulk');
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

    getMetadataValue(data, key) {
        const value = data?.metadata?.[key];
        return value == null ? '' : String(value).trim();
    }

    assertVerifiedTransaction(data, {
        reference,
        expectedNonce,
        expectedScope,
        expectedTaskId = null,
        expectedGuestMode = null
    }) {
        if (!data || typeof data !== 'object') {
            throw new Error('Payment verification did not return transaction data.');
        }

        if (String(data.reference || '').trim() !== String(reference || '').trim()) {
            throw new Error('Payment reference mismatch.');
        }

        if (String(data.status || '').toLowerCase() !== 'success') {
            throw new Error(`Payment status: ${data.status || 'unknown'}`);
        }

        if (String(data.currency || '').toUpperCase() !== 'KES') {
            throw new Error('Payment currency mismatch.');
        }

        if (this.getMetadataValue(data, 'nonce') !== String(expectedNonce || '')) {
            throw new Error('Payment session mismatch.');
        }

        if (expectedScope && this.getMetadataValue(data, 'payment_scope') !== String(expectedScope)) {
            throw new Error('Payment scope mismatch.');
        }

        if (expectedTaskId !== null && this.getMetadataValue(data, 'task_id') !== String(expectedTaskId)) {
            throw new Error('Payment task mismatch.');
        }

        if (expectedGuestMode && this.getMetadataValue(data, 'guest_payment_mode') !== String(expectedGuestMode)) {
            throw new Error('Payment mode mismatch.');
        }
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
            try {
                this.assertVerifiedTransaction(data, {
                    reference,
                    expectedNonce: nonce,
                    expectedScope: 'single',
                    expectedTaskId: taskId
                });
            } catch (validationError) {
                if (validationError.message === 'Payment task mismatch.') {
                    await this.sendTaskMismatchAlert(reference, this.getMetadataValue(data, 'task_id'), taskId, req.user.id);
                }
                logger.warn(`Single payment verification rejected: ${validationError.message}. ref=${reference}, task=${taskId}, user=${req.user.id}`);
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

        if (!paystackService.validateWebhook(payload, signature, req.rawBody)) {
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
                try {
                    this.assertVerifiedTransaction(data, {
                        reference,
                        expectedNonce: nonce,
                        expectedScope: 'single',
                        expectedTaskId: singleIntent.task_id
                    });
                } catch (validationError) {
                    logger.warn(`Webhook single payment rejected: ${validationError.message}. ref=${reference}, task=${singleIntent.task_id}`);
                    return;
                }

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

            const [[guestSession]] = await pool.execute(
                `SELECT * FROM guest_payment_sessions WHERE nonce = ? AND status = 'pending'`,
                [nonce]
            );

            if (guestSession) {
                try {
                    this.assertVerifiedTransaction(data, {
                        reference,
                        expectedNonce: nonce,
                        expectedScope: 'guest',
                        expectedGuestMode: guestSession.mode
                    });
                } catch (validationError) {
                    logger.warn(`Webhook guest payment rejected: ${validationError.message}. ref=${reference}, session=${guestSession.id}`);
                    return;
                }

                if (data.amount < guestSession.total_amount_kes) {
                    await pool.execute(`UPDATE guest_payment_sessions SET status = 'failed' WHERE id = ?`, [guestSession.id]);
                    await this.sendBulkUnderpaymentAlert(reference, guestSession.total_amount_kes, data.amount);
                    return;
                }

                const connection = await pool.getConnection();
                try {
                    await connection.beginTransaction();
                    await connection.execute(
                        `UPDATE guest_payment_sessions
                         SET status = 'completed', reference = ?
                         WHERE id = ?`,
                        [reference, guestSession.id]
                    );
                    await this.processGuestPaymentSession(guestSession, reference, data, connection);
                    await connection.commit();
                    logger.info(`Webhook: processed guest payment session ${guestSession.id}.`);
                } catch (error) {
                    await connection.rollback();
                    await pool.execute(
                        `UPDATE guest_payment_sessions SET status = 'failed' WHERE id = ?`,
                        [guestSession.id]
                    );
                    logger.error(`Webhook guest payment processing failed: ${error.message}`);
                } finally {
                    connection.release();
                }

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

            try {
                this.assertVerifiedTransaction(data, {
                    reference,
                    expectedNonce: nonce,
                    expectedScope: 'bulk'
                });
            } catch (validationError) {
                logger.warn(`Webhook bulk payment rejected: ${validationError.message}. ref=${reference}, intent=${bulkIntent.id}`);
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
                : null,
            receivedAt: data.paid_at ? new Date(data.paid_at) : new Date()
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

    async createGuestPaymentLink(req, res) {
        try {
            const { scope, taskId, guestClientId } = req.body || {};

            if (!['task', 'portal'].includes(scope)) {
                return res.status(400).json({ success: false, message: 'scope must be one of: task, portal' });
            }

            if (scope === 'task') {
                const task = await Task.findById(taskId, pool, req.user.id);
                if (!task) {
                    return res.status(404).json({ success: false, message: 'Task not found' });
                }

                if (!task.guest_client_id) {
                    return res.status(400).json({ success: false, message: 'Guest payment links can only be created for guest tasks.' });
                }

                if (Number(task.can_pay_now) !== 1 || Number(task.current_due_amount) <= 0) {
                    return res.status(400).json({ success: false, message: 'This task is not currently payable.' });
                }

                const guest = await GuestClient.findById(task.guest_client_id);
                if (!guest || guest.upgraded_to_user_id) {
                    return res.status(400).json({ success: false, message: 'This guest record is no longer eligible for public payment links.' });
                }

                const result = await guestPaymentLinkService.createOrReuseLink({
                    scope,
                    guestClientId: task.guest_client_id,
                    taskId: task.id,
                    createdBy: req.user.id
                });

                return res.status(200).json({
                    success: true,
                    data: {
                        linkId: result.link.id,
                        scope: result.link.scope,
                        guestClientId: result.link.guest_client_id,
                        taskId: result.link.task_id,
                        publicUrl: result.publicUrl,
                        reused: result.reused
                    }
                });
            }

            const guest = await GuestClient.findById(guestClientId);
            if (!guest) {
                return res.status(404).json({ success: false, message: 'Guest client not found' });
            }

            if (guest.upgraded_to_user_id) {
                return res.status(400).json({ success: false, message: 'This guest record now uses the registered client dashboard.' });
            }

            const payableTasks = await this.getEligibleGuestTasks(guest.id);
            if (payableTasks.length === 0) {
                return res.status(400).json({ success: false, message: 'This guest does not have any payable tasks right now.' });
            }

            const result = await guestPaymentLinkService.createOrReuseLink({
                scope,
                guestClientId: guest.id,
                createdBy: req.user.id
            });

            return res.status(200).json({
                success: true,
                data: {
                    linkId: result.link.id,
                    scope: result.link.scope,
                    guestClientId: result.link.guest_client_id,
                    taskId: null,
                    publicUrl: result.publicUrl,
                    reused: result.reused,
                    payableTaskCount: payableTasks.length
                }
            });
        } catch (error) {
            logger.error(`Create Guest Payment Link Error: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Failed to create guest payment link' });
        }
    }

    async revokeGuestPaymentLink(req, res) {
        try {
            const id = Number(req.params.id);
            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({ success: false, message: 'Invalid guest payment link ID.' });
            }

            const existingLink = await guestPaymentLinkService.findById(id);
            if (!existingLink) {
                return res.status(404).json({ success: false, message: 'Guest payment link not found.' });
            }

            const link = await guestPaymentLinkService.revokeLink(id);
            return res.status(200).json({
                success: true,
                data: {
                    id: link.id,
                    status: link.status,
                    revokedAt: link.revoked_at
                }
            });
        } catch (error) {
            logger.error(`Revoke Guest Payment Link Error: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Failed to revoke guest payment link' });
        }
    }

    async getGuestPaymentLinkDetails(req, res) {
        try {
            const context = await this.getGuestLinkContext(req.params.token);
            if (!context.link) {
                return res.status(context.statusCode).json({
                    success: false,
                    state: context.state,
                    message: context.message
                });
            }

            const tasksState = await this.getGuestLinkTasks(context.link);

            if (['invalid', 'revoked', 'settled', 'cancelled', 'unavailable'].includes(tasksState.state)) {
                const statusCode = tasksState.state === 'unavailable' ? 400 : 410;
                return res.status(statusCode).json({
                    success: false,
                    state: tasksState.state,
                    message: tasksState.message
                });
            }

            await guestPaymentLinkService.touchLink(context.link.id);

            return res.status(200).json({
                success: true,
                data: {
                    guestName: context.link.guest_name,
                    guestEmail: context.link.guest_email || '',
                    scope: context.link.scope,
                    requiresEmail: !context.link.guest_email,
                    totalDue: roundMoney(tasksState.tasks.reduce((sum, task) => sum + Number(task.current_due_amount || 0), 0)),
                    payableTaskCount: tasksState.tasks.length,
                    state: tasksState.state,
                    message: tasksState.message,
                    tasks: tasksState.tasks.map((task) => this.sanitizeGuestTask(task))
                }
            });
        } catch (error) {
            logger.error(`Get Guest Payment Link Details Error: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Failed to load guest payment link' });
        }
    }

    async initializeGuestPayment(req, res) {
        try {
            const context = await this.getGuestLinkContext(req.params.token);
            if (!context.link) {
                return res.status(context.statusCode).json({
                    success: false,
                    state: context.state,
                    message: context.message
                });
            }

            const tasksState = await this.getGuestLinkTasks(context.link);
            if (tasksState.state !== 'ready') {
                return res.status(400).json({
                    success: false,
                    state: tasksState.state,
                    message: tasksState.message || 'This payment link is not currently ready for checkout.'
                });
            }

            const requestedMode = context.link.scope === 'task'
                ? 'single'
                : (req.body?.mode || 'bulk');
            const enteredEmail = String(req.body?.email || context.link.guest_email || '').trim().toLowerCase();

            if (!this.isValidEmail(enteredEmail)) {
                return res.status(400).json({ success: false, message: 'A valid email address is required to start checkout.' });
            }

            let selectedTasks;
            try {
                selectedTasks = this.selectGuestPaymentTasks(
                    context.link,
                    tasksState.tasks,
                    requestedMode,
                    req.body?.taskId
                );
            } catch (selectionError) {
                return res.status(400).json({ success: false, message: selectionError.message });
            }

            if (selectedTasks.length === 0) {
                return res.status(400).json({ success: false, message: 'There are no payable tasks in this checkout.' });
            }

            const items = this.buildBulkItems(selectedTasks);
            const totalAmountUsd = roundMoney(items.reduce((sum, item) => sum + Number(item.amountUsd || 0), 0));
            const totalAmountKes = items.reduce((sum, item) => sum + Number(item.amountKes || 0), 0);
            const nonce = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                const [result] = await connection.execute(
                    `INSERT INTO guest_payment_sessions
                        (link_id, guest_client_id, mode, entered_email, total_amount_usd, total_amount_kes, currency, nonce, expires_at)
                     VALUES (?, ?, ?, ?, ?, ?, 'KES', ?, ?)`,
                    [context.link.id, context.link.guest_client_id, requestedMode, enteredEmail, totalAmountUsd, totalAmountKes, nonce, expiresAt]
                );

                for (const item of items) {
                    await connection.execute(
                        `INSERT INTO guest_payment_session_items
                            (session_id, task_id, phase, amount_usd, amount_kes, sort_order)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [result.insertId, item.taskId, item.phase, item.amountUsd, item.amountKes, item.sortOrder]
                    );
                }

                await guestPaymentLinkService.touchLink(context.link.id, connection);
                await connection.commit();
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }

            return res.status(201).json({
                success: true,
                nonce,
                email: enteredEmail,
                totalAmountUsd,
                totalAmountKes,
                totalAmountKesDisplay: roundMoney(totalAmountKes / 100),
                exchangeRate: this.getExchangeRate(),
                payableTaskCount: items.length,
                mode: requestedMode
            });
        } catch (error) {
            logger.error(`Initialize Guest Payment Error: ${error.message}`);
            return res.status(500).json({ success: false, message: error.message || 'Failed to initialize guest payment' });
        }
    }

    async verifyGuestPayment(req, res) {
        try {
            const context = await this.getGuestLinkContext(req.params.token);
            if (!context.link) {
                return res.status(context.statusCode).json({
                    success: false,
                    state: context.state,
                    message: context.message
                });
            }

            const { reference, nonce } = req.body || {};
            if (!reference || !nonce) {
                return res.status(400).json({ success: false, message: 'reference and nonce are required' });
            }

            const [[session]] = await pool.execute(
                `SELECT *
                 FROM guest_payment_sessions
                 WHERE nonce = ?
                   AND link_id = ?
                   AND status = 'pending'
                   AND expires_at > NOW()`,
                [nonce, context.link.id]
            );

            if (!session) {
                return res.status(400).json({ success: false, message: 'Invalid or expired guest payment session. Please start again.' });
            }

            const data = await paystackService.verifyTransaction(reference);
            try {
                this.assertVerifiedTransaction(data, {
                    reference,
                    expectedNonce: nonce,
                    expectedScope: 'guest',
                    expectedGuestMode: session.mode
                });
            } catch (validationError) {
                logger.warn(`Guest payment verification rejected: ${validationError.message}. ref=${reference}, session=${session.id}`);
                return res.status(400).json({ success: false, message: 'Payment session validation failed. Please start checkout again.' });
            }

            if (data.amount < session.total_amount_kes) {
                await pool.execute(`UPDATE guest_payment_sessions SET status = 'failed' WHERE id = ?`, [session.id]);
                await this.sendBulkUnderpaymentAlert(reference, session.total_amount_kes, data.amount);
                return res.status(400).json({
                    success: false,
                    message: 'Payment amount does not match the required total.'
                });
            }

            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                await connection.execute(
                    `UPDATE guest_payment_sessions
                     SET status = 'completed', reference = ?
                     WHERE id = ?`,
                    [reference, session.id]
                );
                await this.processGuestPaymentSession(session, reference, data, connection);
                await connection.commit();
            } catch (error) {
                await connection.rollback();
                await pool.execute(`UPDATE guest_payment_sessions SET status = 'failed' WHERE id = ?`, [session.id]);
                logger.error(`Guest payment verification error: ${error.message}`);
                return res.status(400).json({
                    success: false,
                    message: 'Guest payment could not be applied because the outstanding balance changed. Please refresh and try again.'
                });
            } finally {
                connection.release();
            }

            return res.status(200).json({ success: true, message: 'Guest payment verified and applied.' });
        } catch (error) {
            logger.error(`Verify Guest Payment Error: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Internal server error during guest payment verification' });
        }
    }

    async processGuestPaymentSession(session, gatewayReference, data, connection) {
        const [items] = await connection.execute(
            `SELECT *
             FROM guest_payment_session_items
             WHERE session_id = ?
             ORDER BY sort_order ASC, id ASC`,
            [session.id]
        );

        if (items.length === 0) {
            throw new Error('Guest payment session has no items.');
        }

        for (const item of items) {
            const task = await Task.findById(item.task_id, connection, 0);
            if (!task || Number(task.guest_client_id) !== Number(session.guest_client_id)) {
                throw new Error(`Task ${item.task_id} is no longer payable by this guest.`);
            }

            if (
                Number(task.can_pay_now) !== 1
                || task.current_due_phase !== item.phase
                || Math.abs(Number(task.current_due_amount) - Number(item.amount_usd)) > 0.009
            ) {
                throw new Error(`Task ${item.task_id} payment state changed after checkout started.`);
            }

            const internalReference = `${gatewayReference}:${item.task_id}:${item.phase}:${uuidv4().slice(0, 8)}`;
            await this.processTaskPayment(item.task_id, gatewayReference, data, {
                executor: connection,
                viewerId: 0,
                phase: item.phase,
                internalReference,
                gatewayReference,
                kesAmount: roundMoney(item.amount_kes / 100)
            });
        }

        await guestPaymentLinkService.touchLink(session.link_id, connection);

        const link = await guestPaymentLinkService.findById(session.link_id, connection);
        if (link && link.scope === 'task' && link.task_id) {
            const task = await Task.findById(link.task_id, connection, 0);
            if (task && Number(task.is_paid) === 1) {
                await guestPaymentLinkService.settleLink(link.id, connection);
            }
        }
    }

    async getPayments(req, res) {
        try {
            const [rows] = await pool.execute(
                `SELECT p.*,
                        t.task_name,
                        COALESCE(u.full_name, gc.name, t.client_name) as display_client_name,
                        t.status as current_task_status,
                        admin.full_name AS recorded_by_name
                 FROM payments p
                 JOIN tasks t ON p.task_id = t.id
                 LEFT JOIN users u ON t.client_id = u.id
                 LEFT JOIN guest_clients gc ON t.guest_client_id = gc.id
                 LEFT JOIN users admin ON p.recorded_by = admin.id
                 ORDER BY COALESCE(p.received_at, p.created_at) DESC, p.id DESC`
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
            try {
                this.assertVerifiedTransaction(data, {
                    reference,
                    expectedNonce: nonce,
                    expectedScope: 'bulk'
                });
            } catch (validationError) {
                logger.warn(`Bulk payment verification rejected: ${validationError.message}. ref=${reference}, user=${req.user.id}`);
                return res.status(400).json({ success: false, message: 'Payment session validation failed. Please start checkout again.' });
            }

            if (data.amount < intent.total_amount_kes) {
                await pool.execute(`UPDATE bulk_payment_intents SET status = 'failed' WHERE id = ?`, [intent.id]);
                await this.sendBulkUnderpaymentAlert(reference, intent.total_amount_kes, data.amount);
                return res.status(400).json({
                    success: false,
                    message: 'Payment amount does not match the required total.'
                });
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

    async getReminderOverview(req, res) {
        try {
            const overview = await paymentReminderService.getReminderOverview();
            return res.status(200).json({ success: true, data: overview });
        } catch (error) {
            logger.error(`Error fetching payment reminder overview: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Failed to fetch payment reminder overview' });
        }
    }

    async sendReminderNow(req, res) {
        try {
            const clientId = req.body?.clientId ? Number(req.body.clientId) : null;
            if (req.body?.clientId && !Number.isInteger(clientId)) {
                return res.status(400).json({ success: false, message: 'clientId must be a valid integer.' });
            }

            const result = await paymentReminderService.sendNow({
                clientId,
                triggeredBy: req.user.id
            });

            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error(`Error sending payment reminders now: ${error.message}`);
            return res.status(500).json({ success: false, message: error.message || 'Failed to send payment reminders' });
        }
    }
}

module.exports = new PaymentController();
