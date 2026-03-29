const { pool } = require('../config/database');

const QUOTE_PENDING_STATUSES = new Set(['pending_quote', 'quote_sent']);
const EPSILON = 0.009;

function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function getProjectTotal(task) {
    const quotedAmount = roundMoney(task?.quoted_amount);
    const expectedAmount = roundMoney(task?.expected_amount);
    return quotedAmount > 0 ? quotedAmount : expectedAmount;
}

function getDepositAmount(task) {
    const depositAmount = roundMoney(task?.deposit_amount);
    if (depositAmount > 0) return depositAmount;

    const projectTotal = getProjectTotal(task);
    if (Number(task?.requires_deposit) === 1 && projectTotal > 0) {
        return roundMoney(projectTotal / 2);
    }

    return 0;
}

function clampMoney(value, min = 0, max = Number.POSITIVE_INFINITY) {
    return Math.min(max, Math.max(min, roundMoney(value)));
}

function isQuoteApprovalRequired(task) {
    if (!task) return false;
    if (task.task_origin === 'admin') return false;
    if (!task.client_id || task.guest_client_id) return false;

    if (task.task_origin === 'client') return true;

    return QUOTE_PENDING_STATUSES.has(task.quote_status);
}

function canPayNow(task) {
    if (!task) return false;
    if (task.status === 'cancelled') return false;
    if (task.quote_status === 'rejected') return false;

    const projectTotal = getProjectTotal(task);
    if (projectTotal <= 0) return false;

    if (task.task_origin === 'admin') return true;
    if (task.task_origin === 'client') return task.quote_status === 'approved';

    if (QUOTE_PENDING_STATUSES.has(task.quote_status)) return false;

    return getTaskPaymentProgress(task).remaining_balance > EPSILON;
}

function getTaskPaymentProgress(task) {
    const projectTotal = getProjectTotal(task);
    const requiresDeposit = Number(task?.requires_deposit) === 1 && projectTotal > 0;
    const depositTarget = requiresDeposit
        ? Math.min(getDepositAmount(task), projectTotal)
        : 0;

    let amountPaidTotal = roundMoney(task?.amount_paid_total);
    if (Number(task?.is_paid) === 1 && projectTotal > 0) {
        amountPaidTotal = projectTotal;
    } else if (amountPaidTotal <= EPSILON && requiresDeposit && Number(task?.deposit_paid) === 1) {
        amountPaidTotal = depositTarget;
    }
    amountPaidTotal = clampMoney(amountPaidTotal, 0, projectTotal);

    let depositPaidAmount = 0;
    if (requiresDeposit) {
        const rawDepositPaidAmount = roundMoney(task?.deposit_paid_amount);
        const legacyDepositCoverage = Number(task?.deposit_paid) === 1 || Number(task?.is_paid) === 1
            ? depositTarget
            : 0;
        const inferredFromTotal = Math.min(amountPaidTotal, depositTarget);

        depositPaidAmount = clampMoney(
            Math.max(rawDepositPaidAmount, legacyDepositCoverage, inferredFromTotal),
            0,
            depositTarget
        );
    }

    const depositRemaining = requiresDeposit
        ? roundMoney(Math.max(depositTarget - depositPaidAmount, 0))
        : 0;
    const remainingBalance = roundMoney(Math.max(projectTotal - amountPaidTotal, 0));
    const depositCovered = !requiresDeposit || depositRemaining <= EPSILON;
    const isPaid = projectTotal > 0
        ? remainingBalance <= EPSILON
        : Number(task?.is_paid) === 1;

    return {
        project_total: projectTotal,
        requires_deposit: requiresDeposit ? 1 : 0,
        deposit_target: roundMoney(depositTarget),
        amount_paid_total: amountPaidTotal,
        deposit_paid_amount: depositPaidAmount,
        deposit_remaining_amount: roundMoney(depositRemaining),
        remaining_balance: remainingBalance,
        deposit_paid: depositCovered ? 1 : 0,
        is_paid: isPaid ? 1 : 0
    };
}

function derivePaymentState(task) {
    const progress = getTaskPaymentProgress(task);
    const quoteApprovalRequired = isQuoteApprovalRequired(task);
    const payable = canPayNow(task);

    let currentDuePhase = null;
    let currentDueAmount = 0;

    if (!progress.is_paid && payable) {
        if (progress.deposit_remaining_amount > EPSILON) {
            currentDuePhase = 'deposit';
            currentDueAmount = progress.deposit_remaining_amount;
        } else {
            currentDuePhase = progress.requires_deposit ? 'balance' : 'full';
            currentDueAmount = progress.remaining_balance;
        }
    }

    let paymentStateLabel = 'No Price Set';
    if (progress.is_paid) {
        paymentStateLabel = 'Fully Paid';
    } else if (quoteApprovalRequired && task.quote_status === 'quote_sent') {
        paymentStateLabel = 'Quote Awaiting Approval';
    } else if (quoteApprovalRequired && task.quote_status === 'pending_quote') {
        paymentStateLabel = 'Price Pending';
    } else if (currentDuePhase === 'deposit') {
        paymentStateLabel = progress.deposit_paid_amount > EPSILON
            ? 'Deposit Partially Paid'
            : 'Deposit Due';
    } else if (currentDuePhase === 'balance') {
        paymentStateLabel = progress.amount_paid_total > progress.deposit_target + EPSILON
            ? 'Balance Partially Paid'
            : 'Deposit Paid / Balance Due';
    } else if (currentDuePhase === 'full') {
        paymentStateLabel = progress.amount_paid_total > EPSILON
            ? 'Payment Partially Paid'
            : 'Payment Due';
    }

    return {
        ...progress,
        current_due_phase: currentDuePhase,
        current_due_amount: roundMoney(currentDueAmount),
        payment_state_label: paymentStateLabel,
        can_pay_now: payable ? 1 : 0,
        quote_approval_required: quoteApprovalRequired ? 1 : 0
    };
}

function augmentTask(task) {
    if (!task) return task;
    return {
        ...task,
        ...derivePaymentState(task)
    };
}

function amountsDiffer(a, b) {
    return Math.abs(roundMoney(a) - roundMoney(b)) > EPSILON;
}

async function fetchTaskById(executor, id) {
    const [rows] = await executor.execute(
        `SELECT t.*
         FROM tasks t
         WHERE t.id = ?`,
        [id]
    );
    return rows[0] || null;
}

async function syncTaskDueTracking(previousTask, currentTaskOrId, executor = pool) {
    let currentTask = typeof currentTaskOrId === 'object'
        ? currentTaskOrId
        : await fetchTaskById(executor, currentTaskOrId);

    if (!currentTask) return null;

    const previousState = previousTask ? augmentTask(previousTask) : null;
    const currentState = augmentTask(currentTask);

    if (!currentState.can_pay_now) {
        await executor.execute(
            `UPDATE tasks
             SET payment_due_started_at = NULL,
                 last_payment_reminder_sent_at = NULL
             WHERE id = ?`,
            [currentState.id]
        );

        return {
            ...currentState,
            payment_due_started_at: null,
            last_payment_reminder_sent_at: null
        };
    }

    const shouldResetDueTracking =
        !previousState ||
        Number(previousState.can_pay_now) !== 1 ||
        previousState.current_due_phase !== currentState.current_due_phase ||
        amountsDiffer(previousState.current_due_amount, currentState.current_due_amount) ||
        Number(previousState.requires_deposit) !== Number(currentState.requires_deposit) ||
        previousState.quote_status !== currentState.quote_status ||
        Number(previousState.is_paid) !== Number(currentState.is_paid);

    if (shouldResetDueTracking || !currentTask.payment_due_started_at) {
        const now = new Date();
        await executor.execute(
            `UPDATE tasks
             SET payment_due_started_at = ?,
                 last_payment_reminder_sent_at = NULL
             WHERE id = ?`,
            [now, currentState.id]
        );

        return {
            ...currentState,
            payment_due_started_at: now,
            last_payment_reminder_sent_at: null
        };
    }

    return currentState;
}

function isReminderEligible(task) {
    return Boolean(
        task?.client_id &&
        task?.registered_client_email &&
        Number(task?.can_pay_now) === 1 &&
        roundMoney(task?.current_due_amount) > 0 &&
        Number(task?.is_paid) !== 1 &&
        task?.status !== 'cancelled'
    );
}

module.exports = {
    QUOTE_PENDING_STATUSES,
    roundMoney,
    getProjectTotal,
    getDepositAmount,
    getTaskPaymentProgress,
    isQuoteApprovalRequired,
    canPayNow,
    derivePaymentState,
    augmentTask,
    syncTaskDueTracking,
    isReminderEligible
};
