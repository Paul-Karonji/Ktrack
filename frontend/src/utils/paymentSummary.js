export const toNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

export const getProjectTotal = (task) => {
    return toNumber(task?.project_total || task?.quoted_amount || task?.expected_amount);
};

export const getDepositAmount = (task) => {
    const explicitDeposit = toNumber(task?.deposit_amount);
    if (explicitDeposit > 0) return explicitDeposit;

    const projectTotal = getProjectTotal(task);
    if (Number(task?.requires_deposit) === 1 && projectTotal > 0) {
        return Math.round((projectTotal / 2) * 100) / 100;
    }

    return 0;
};

export const getRemainingBalance = (task) => {
    if (Number(task?.is_paid) === 1) return 0;
    if (task?.remaining_balance !== undefined && task?.remaining_balance !== null) {
        return toNumber(task.remaining_balance);
    }

    const projectTotal = getProjectTotal(task);
    const depositAmount = getDepositAmount(task);

    return Number(task?.deposit_paid) === 1
        ? Math.max(projectTotal - depositAmount, 0)
        : projectTotal;
};

export const canTaskBePaid = (task) => {
    return Number(task?.can_pay_now) === 1 && toNumber(task?.current_due_amount) > 0;
};

export const getPaymentActionLabel = (task) => {
    if (!canTaskBePaid(task) || Number(task?.is_paid) === 1) return null;

    if (task.current_due_phase === 'deposit') return 'Pay Deposit';
    if (task.current_due_phase === 'balance') return 'Clear Balance';
    if (task.current_due_phase === 'full') return 'Pay Now';

    return null;
};

export const getPaymentBadgeStyles = (task) => {
    if (Number(task?.is_paid) === 1) {
        return { label: 'Fully Paid', className: 'bg-green-100 text-green-700' };
    }

    if (task?.current_due_phase === 'balance') {
        return { label: 'Deposit Paid / Balance Due', className: 'bg-blue-100 text-blue-700' };
    }

    if (task?.current_due_phase === 'deposit') {
        return { label: 'Deposit Due', className: 'bg-orange-100 text-orange-700' };
    }

    if (task?.current_due_phase === 'full') {
        return { label: 'Payment Due', className: 'bg-amber-100 text-amber-700' };
    }

    return {
        label: task?.payment_state_label || 'No Price Set',
        className: 'bg-gray-100 text-gray-700'
    };
};

export const shouldShowSendQuote = (task) => {
    return Boolean(
        task &&
        task.task_origin !== 'admin' &&
        task.client_id &&
        !task.guest_client_id &&
        task.quote_status === 'pending_quote'
    );
};

export const shouldShowQuoteActions = (task) => {
    return Boolean(
        task &&
        task.task_origin !== 'admin' &&
        task.client_id &&
        !task.guest_client_id &&
        task.quote_status === 'quote_sent'
    );
};
