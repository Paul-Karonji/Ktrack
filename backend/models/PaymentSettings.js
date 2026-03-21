const { pool } = require('../config/database');

const DEFAULT_SETTINGS = {
    id: 1,
    deposit_reminders_enabled: 1,
    deposit_reminder_interval_hours: 24,
    balance_reminders_enabled: 1,
    balance_reminder_interval_days: 7,
    updated_by: null,
    updated_at: null
};

class PaymentSettings {
    static async get(executor = pool) {
        const [rows] = await executor.execute(
            `SELECT *
             FROM payment_settings
             WHERE id = 1
             LIMIT 1`
        );

        return rows[0] || { ...DEFAULT_SETTINGS };
    }

    static async update(settings, adminId, executor = pool) {
        const payload = {
            depositRemindersEnabled: settings.depositRemindersEnabled ? 1 : 0,
            depositReminderIntervalHours: Number(settings.depositReminderIntervalHours),
            balanceRemindersEnabled: settings.balanceRemindersEnabled ? 1 : 0,
            balanceReminderIntervalDays: Number(settings.balanceReminderIntervalDays)
        };

        await executor.execute(
            `INSERT INTO payment_settings
                (id, deposit_reminders_enabled, deposit_reminder_interval_hours, balance_reminders_enabled, balance_reminder_interval_days, updated_by)
             VALUES (1, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                deposit_reminders_enabled = VALUES(deposit_reminders_enabled),
                deposit_reminder_interval_hours = VALUES(deposit_reminder_interval_hours),
                balance_reminders_enabled = VALUES(balance_reminders_enabled),
                balance_reminder_interval_days = VALUES(balance_reminder_interval_days),
                updated_by = VALUES(updated_by),
                updated_at = CURRENT_TIMESTAMP`,
            [
                payload.depositRemindersEnabled,
                payload.depositReminderIntervalHours,
                payload.balanceRemindersEnabled,
                payload.balanceReminderIntervalDays,
                adminId || null
            ]
        );

        return this.get(executor);
    }
}

module.exports = PaymentSettings;
