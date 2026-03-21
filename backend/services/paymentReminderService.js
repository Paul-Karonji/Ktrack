const { pool } = require('../config/database');
const logger = require('../utils/logger');
const EmailService = require('./emailService');
const templates = require('../templates/emailTemplates');
const PaymentSettings = require('../models/PaymentSettings');
const { augmentTask, isReminderEligible, roundMoney } = require('./taskPaymentStateService');

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

    async fetchRegisteredPayableTasks(clientId = null) {
        const params = [];
        let clientFilter = '';

        if (clientId) {
            clientFilter = ' AND t.client_id = ?';
            params.push(clientId);
        }

        const [rows] = await pool.execute(
            `SELECT t.*,
                    u.full_name AS registered_client_name,
                    u.email AS registered_client_email
             FROM tasks t
             INNER JOIN users u ON t.client_id = u.id
             WHERE t.client_id IS NOT NULL
               AND u.status = 'approved'
               AND t.status <> 'cancelled'
               AND t.is_paid = 0
               ${clientFilter}`,
            params
        );

        return rows
            .map((task) => augmentTask(task))
            .filter((task) => isReminderEligible(task));
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

    groupTasksByClient(tasks) {
        return Object.values(tasks.reduce((accumulator, task) => {
            if (!accumulator[task.client_id]) {
                accumulator[task.client_id] = {
                    clientId: task.client_id,
                    clientName: task.registered_client_name || task.display_client_name || 'Client',
                    email: task.registered_client_email,
                    tasks: []
                };
            }

            accumulator[task.client_id].tasks.push(task);
            return accumulator;
        }, {})).map((group) => ({
            ...group,
            tasks: group.tasks.sort((left, right) => {
                const leftDate = left.date_delivered ? new Date(left.date_delivered).getTime() : Number.MAX_SAFE_INTEGER;
                const rightDate = right.date_delivered ? new Date(right.date_delivered).getTime() : Number.MAX_SAFE_INTEGER;
                return leftDate - rightDate;
            })
        }));
    }

    async logReminderDispatch({ clientId, source, triggeredBy, recipientEmail, totalDue, taskCount }) {
        await pool.execute(
            `INSERT INTO payment_reminder_logs
                (client_id, source, triggered_by, recipient_email, total_due, task_count)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [clientId, source, triggeredBy || null, recipientEmail, roundMoney(totalDue), taskCount]
        );
    }

    async sendReminderGroup(group, { source, triggeredBy = null, updateScheduledAt = false }) {
        if (!group.email) {
            return { success: false, reason: 'missing_email' };
        }

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
            logger.warn(`Payment reminder email failed for client ${group.clientId}`);
            return { success: false, reason: 'email_failed' };
        }

        await this.logReminderDispatch({
            clientId: group.clientId,
            source,
            triggeredBy,
            recipientEmail: group.email,
            totalDue,
            taskCount: group.tasks.length
        });

        if (updateScheduledAt && group.tasks.length > 0) {
            await pool.execute(
                `UPDATE tasks
                 SET last_payment_reminder_sent_at = ?
                 WHERE id IN (${group.tasks.map(() => '?').join(',')})`,
                [new Date(), ...group.tasks.map((task) => task.id)]
            );
        }

        return {
            success: true,
            clientId: group.clientId,
            taskCount: group.tasks.length,
            totalDue: roundMoney(totalDue)
        };
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

                const now = Date.now();
                const eligibleTasks = (await this.fetchRegisteredPayableTasks())
                    .filter((task) => this.isTaskDueForReminder(task, settings, now));

                if (eligibleTasks.length === 0) return;

                const groups = this.groupTasksByClient(eligibleTasks);
                for (const group of groups) {
                    await this.sendReminderGroup(group, {
                        source: 'scheduled',
                        updateScheduledAt: true
                    });
                }
            } finally {
                await pool.execute(`SELECT RELEASE_LOCK(?) AS released`, [JOB_LOCK_NAME]).catch(() => { });
            }
        } finally {
            this.running = false;
        }
    }

    async getReminderOverview() {
        const tasks = await this.fetchRegisteredPayableTasks();
        const groups = this.groupTasksByClient(tasks);

        if (groups.length === 0) {
            return [];
        }

        const clientIds = groups.map((group) => group.clientId);
        const placeholders = clientIds.map(() => '?').join(',');

        const [logs] = await pool.execute(
            `SELECT client_id,
                    MAX(CASE WHEN source = 'scheduled' THEN created_at END) AS last_scheduled_reminder_at,
                    MAX(CASE WHEN source IN ('manual_all', 'manual_single') THEN created_at END) AS last_manual_reminder_at
             FROM payment_reminder_logs
             WHERE client_id IN (${placeholders})
             GROUP BY client_id`,
            clientIds
        );

        const logMap = new Map(logs.map((row) => [row.client_id, row]));

        return groups.map((group) => {
            const totalDue = group.tasks.reduce((sum, task) => sum + Number(task.current_due_amount || 0), 0);
            const depositDueCount = group.tasks.filter((task) => task.current_due_phase === 'deposit').length;
            const balanceDueCount = group.tasks.filter((task) => task.current_due_phase === 'balance').length;
            const fullDueCount = group.tasks.filter((task) => task.current_due_phase === 'full').length;
            const overdue = group.tasks.some((task) => task.date_delivered && new Date(task.date_delivered) < new Date());
            const log = logMap.get(group.clientId);

            return {
                clientId: group.clientId,
                clientName: group.clientName,
                email: group.email,
                taskCount: group.tasks.length,
                totalDue: roundMoney(totalDue),
                depositDueCount,
                balanceDueCount,
                fullDueCount,
                overdue,
                lastScheduledReminderAt: log?.last_scheduled_reminder_at || null,
                lastManualReminderAt: log?.last_manual_reminder_at || null
            };
        }).sort((left, right) => right.totalDue - left.totalDue);
    }

    async sendNow({ clientId = null, triggeredBy = null } = {}) {
        const tasks = await this.fetchRegisteredPayableTasks(clientId);
        const groups = this.groupTasksByClient(tasks);

        if (groups.length === 0) {
            return {
                sentCount: 0,
                clientCount: 0,
                skipped: 0
            };
        }

        const source = clientId ? 'manual_single' : 'manual_all';
        const sentGroups = [];
        let skipped = 0;

        for (const group of groups) {
            const result = await this.sendReminderGroup(group, {
                source,
                triggeredBy,
                updateScheduledAt: false
            });

            if (result.success) {
                sentGroups.push(result);
            } else {
                skipped += 1;
            }
        }

        return {
            sentCount: sentGroups.reduce((sum, item) => sum + item.taskCount, 0),
            clientCount: sentGroups.length,
            skipped
        };
    }
}

module.exports = new PaymentReminderService();
