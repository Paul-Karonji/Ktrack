const { pool } = require('../config/database');
const logger = require('../utils/logger');
const EmailService = require('./emailService');
const templates = require('../templates/emailTemplates');
const PaymentSettings = require('../models/PaymentSettings');
const { augmentTask, isReminderEligible } = require('./taskPaymentStateService');

const JOB_LOCK_NAME = 'ktrack_payment_reminder_job';
const POLL_INTERVAL_MS = 15 * 60 * 1000;

class PaymentReminderService {
    constructor() {
        this.intervalId = null;
        this.running = false;
    }

    start() {
        if (this.intervalId) return;

        this.intervalId = setInterval(() => {
            this.runSweep().catch((error) => {
                logger.error(`Payment reminder sweep failed: ${error.message}`);
            });
        }, POLL_INTERVAL_MS);

        setTimeout(() => {
            this.runSweep().catch((error) => {
                logger.error(`Initial payment reminder sweep failed: ${error.message}`);
            });
        }, 10 * 1000);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    async runSweep() {
        if (this.running) return;
        this.running = true;

        try {
            const [[lockRow]] = await pool.execute(`SELECT GET_LOCK(?, 0) AS acquired`, [JOB_LOCK_NAME]);
            if (!lockRow || lockRow.acquired !== 1) return;

            try {
                const settings = await PaymentSettings.get();
                const depositEnabled = Number(settings.deposit_reminders_enabled) === 1;
                const balanceEnabled = Number(settings.balance_reminders_enabled) === 1;

                if (!depositEnabled && !balanceEnabled) return;

                const [rows] = await pool.execute(
                    `SELECT t.*,
                            u.full_name AS registered_client_name,
                            u.email AS registered_client_email
                     FROM tasks t
                     INNER JOIN users u ON t.client_id = u.id
                     WHERE t.client_id IS NOT NULL
                       AND u.status = 'approved'
                       AND t.status <> 'cancelled'
                       AND t.is_paid = 0`
                );

                const now = Date.now();
                const eligibleTasks = rows
                    .map((task) => augmentTask(task))
                    .filter((task) => isReminderEligible(task))
                    .filter((task) => this.isTaskDueForReminder(task, settings, now));

                if (eligibleTasks.length === 0) return;

                const tasksByClient = eligibleTasks.reduce((accumulator, task) => {
                    if (!accumulator[task.client_id]) {
                        accumulator[task.client_id] = {
                            clientName: task.registered_client_name || task.display_client_name || 'Client',
                            email: task.registered_client_email,
                            tasks: []
                        };
                    }

                    accumulator[task.client_id].tasks.push(task);
                    return accumulator;
                }, {});

                for (const [clientId, group] of Object.entries(tasksByClient)) {
                    if (!group.email) continue;

                    const totalDue = group.tasks.reduce(
                        (sum, task) => sum + Number(task.current_due_amount || 0),
                        0
                    );

                    const { subject, html } = templates.paymentReminderSummary(
                        group.clientName,
                        group.tasks,
                        totalDue
                    );

                    const result = await EmailService.notifyClient({
                        to: group.email,
                        subject,
                        html
                    });

                    if (!result?.success) {
                        logger.warn(`Payment reminder email failed for client ${clientId}`);
                        continue;
                    }

                    await pool.execute(
                        `UPDATE tasks
                         SET last_payment_reminder_sent_at = ?
                         WHERE id IN (${group.tasks.map(() => '?').join(',')})`,
                        [new Date(), ...group.tasks.map((task) => task.id)]
                    );
                }
            } finally {
                await pool.execute(`SELECT RELEASE_LOCK(?) AS released`, [JOB_LOCK_NAME]).catch(() => { });
            }
        } finally {
            this.running = false;
        }
    }

    isTaskDueForReminder(task, settings, nowMs) {
        const isDepositPhase = task.current_due_phase === 'deposit';
        const isBalancePhase = task.current_due_phase === 'balance' || task.current_due_phase === 'full';

        if (isDepositPhase && Number(settings.deposit_reminders_enabled) !== 1) {
            return false;
        }

        if (isBalancePhase && Number(settings.balance_reminders_enabled) !== 1) {
            return false;
        }

        const intervalMs = isDepositPhase
            ? Number(settings.deposit_reminder_interval_hours || 0) * 60 * 60 * 1000
            : Number(settings.balance_reminder_interval_days || 0) * 24 * 60 * 60 * 1000;

        if (!intervalMs || intervalMs < 1) return false;

        const anchor = task.last_payment_reminder_sent_at || task.payment_due_started_at;
        if (!anchor) return false;

        return nowMs - new Date(anchor).getTime() >= intervalMs;
    }
}

module.exports = new PaymentReminderService();
