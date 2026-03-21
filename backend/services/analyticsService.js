const { pool } = require('../config/database');
const { augmentTask, getProjectTotal, roundMoney } = require('./taskPaymentStateService');

const DAY_MS = 24 * 60 * 60 * 1000;

function asDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function inRange(value, start, endExclusive) {
    const date = asDate(value);
    if (!date) return false;
    return date >= start && date < endExclusive;
}

function formatPeriod(date, groupBy = 'month') {
    const value = asDate(date);
    if (!value) return null;
    if (groupBy === 'day') {
        return value.toISOString().split('T')[0];
    }

    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabelFromPeriod(period) {
    const [year, month] = period.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
        month: 'short',
        timeZone: 'UTC'
    });
}

function buildRange(startDate, endDate, defaultStartFactory) {
    const end = endDate ? new Date(endDate) : new Date();
    const endExclusive = new Date(end.getTime() + DAY_MS);
    const start = startDate ? new Date(startDate) : defaultStartFactory(new Date(end));
    return { start, end, endExclusive };
}

function getPreviousRange(start, end) {
    const diff = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - diff);
    return {
        start: prevStart,
        end: prevEnd,
        endExclusive: new Date(prevEnd.getTime() + DAY_MS)
    };
}

function calculateTrend(current, previous) {
    if (!previous || previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    return `${change > 0 ? '+' : ''}${Math.round(change)}%`;
}

function getClientKey(task) {
    if (task.client_id) return `u_${task.client_id}`;
    if (task.guest_client_id) return `g_${task.guest_client_id}`;
    return `l_${task.id}`;
}

function getClientName(record) {
    return record.display_client_name || record.registered_client_name || record.guest_client_name || record.client_name || 'Unknown Client';
}

function addToMap(map, key, factory) {
    if (!map.has(key)) {
        map.set(key, factory());
    }
    return map.get(key);
}

function getExpectedEventDate(task) {
    if (task.task_origin === 'admin' || task.guest_client_id) {
        return task.created_at;
    }

    if (task.task_origin === 'client' && task.quote_status === 'approved') {
        return task.updated_at || task.created_at;
    }

    if (!task.task_origin && !['pending_quote', 'quote_sent', 'rejected'].includes(task.quote_status)) {
        return task.updated_at || task.created_at;
    }

    return null;
}

function getTaskPipelineStage(task) {
    if (task.status === 'cancelled') return null;
    if (task.status === 'completed') return 'completed';

    if (task.task_origin !== 'admin' && task.client_id && !task.guest_client_id) {
        if (task.quote_status === 'pending_quote') return 'pending_quote';
        if (task.quote_status === 'quote_sent') return 'quote_sent';
    }

    if (task.current_due_phase === 'deposit') return 'pending_deposit';
    if (task.current_due_phase === 'full' || task.current_due_phase === 'balance') return 'payment_due';
    if (task.status === 'review') return 'review';
    if (task.status === 'in_progress') return 'in_progress';
    if (task.status === 'not_started') return 'not_started';

    return task.status || 'not_started';
}

function daysBetween(later, earlier) {
    const laterDate = asDate(later);
    const earlierDate = asDate(earlier);
    if (!laterDate || !earlierDate) return null;
    return Math.round((laterDate.getTime() - earlierDate.getTime()) / DAY_MS);
}

async function fetchAnalyticsTasks() {
    const [rows] = await pool.execute(
        `SELECT t.*,
                u.full_name AS registered_client_name,
                gc.name AS guest_client_name,
                COALESCE(u.full_name, gc.name, t.client_name) AS display_client_name
         FROM tasks t
         LEFT JOIN users u ON t.client_id = u.id
         LEFT JOIN guest_clients gc ON t.guest_client_id = gc.id`
    );

    return rows.map((task) => augmentTask(task));
}

async function fetchAnalyticsPayments() {
    const [rows] = await pool.execute(
        `SELECT p.*,
                t.client_id,
                t.guest_client_id,
                t.client_name,
                t.task_name,
                t.completed_at,
                t.quote_status,
                t.task_origin,
                COALESCE(u.full_name, gc.name, t.client_name) AS display_client_name
         FROM payments p
         JOIN tasks t ON p.task_id = t.id
         LEFT JOIN users u ON t.client_id = u.id
         LEFT JOIN guest_clients gc ON t.guest_client_id = gc.id`
    );

    return rows.map((payment) => ({
        ...payment,
        amount: Number(payment.amount) || 0,
        received_at: payment.received_at || payment.created_at
    }));
}

function computeKpis(tasks, payments, range, previousRange) {
    const currentExpectedRevenue = tasks.reduce((sum, task) => {
        const eventDate = getExpectedEventDate(task);
        if (!eventDate || !inRange(eventDate, range.start, range.endExclusive)) return sum;
        return sum + Number(getProjectTotal(task) || 0);
    }, 0);

    const previousExpectedRevenue = tasks.reduce((sum, task) => {
        const eventDate = getExpectedEventDate(task);
        if (!eventDate || !inRange(eventDate, previousRange.start, previousRange.endExclusive)) return sum;
        return sum + Number(getProjectTotal(task) || 0);
    }, 0);

    const currentActualRevenue = payments.reduce((sum, payment) => (
        inRange(payment.received_at, range.start, range.endExclusive) ? sum + payment.amount : sum
    ), 0);

    const previousActualRevenue = payments.reduce((sum, payment) => (
        inRange(payment.received_at, previousRange.start, previousRange.endExclusive) ? sum + payment.amount : sum
    ), 0);

    const activeTasks = tasks.filter((task) => !['completed', 'cancelled'].includes(task.status));
    const inProgress = activeTasks.filter((task) => task.status === 'in_progress').length;
    const pendingReview = activeTasks.filter((task) => task.status === 'review').length;

    const activeSnapshotAtPreviousEnd = tasks.filter((task) => {
        const createdAt = asDate(task.created_at);
        const completedAt = asDate(task.completed_at);
        if (!createdAt || createdAt > previousRange.end) return false;
        if (task.status === 'cancelled' && asDate(task.updated_at) && asDate(task.updated_at) <= previousRange.end) {
            return false;
        }
        if (completedAt && completedAt <= previousRange.end) {
            return false;
        }
        return task.status !== 'cancelled';
    }).length;

    const quoteTasksInCurrentRange = tasks.filter((task) => (
        task.task_origin !== 'admin'
        && task.client_id
        && !task.guest_client_id
        && inRange(task.created_at, range.start, range.endExclusive)
    ));
    const quoteTasksInPreviousRange = tasks.filter((task) => (
        task.task_origin !== 'admin'
        && task.client_id
        && !task.guest_client_id
        && inRange(task.created_at, previousRange.start, previousRange.endExclusive)
    ));

    const acceptedQuotes = quoteTasksInCurrentRange.filter((task) => task.quote_status === 'approved').length;
    const rejectedQuotes = quoteTasksInCurrentRange.filter((task) => task.quote_status === 'rejected').length;
    const pendingQuotes = quoteTasksInCurrentRange.filter((task) => task.quote_status === 'quote_sent').length;
    const quoteResponses = acceptedQuotes + rejectedQuotes;
    const acceptanceRate = quoteResponses > 0 ? Math.round((acceptedQuotes / quoteResponses) * 100) : 0;
    const avgQuoteResponseTime = quoteResponses > 0
        ? Math.round(
            quoteTasksInCurrentRange
                .filter((task) => ['approved', 'rejected'].includes(task.quote_status))
                .reduce((sum, task) => sum + (daysBetween(task.updated_at, task.created_at) || 0), 0) / quoteResponses
        )
        : 0;

    const previousAcceptedQuotes = quoteTasksInPreviousRange.filter((task) => task.quote_status === 'approved').length;
    const previousRejectedQuotes = quoteTasksInPreviousRange.filter((task) => task.quote_status === 'rejected').length;
    const previousQuoteResponses = previousAcceptedQuotes + previousRejectedQuotes;
    const previousAcceptanceRate = previousQuoteResponses > 0
        ? Math.round((previousAcceptedQuotes / previousQuoteResponses) * 100)
        : 0;

    const completedCurrent = tasks.filter((task) => inRange(task.completed_at, range.start, range.endExclusive));
    const completedPrevious = tasks.filter((task) => inRange(task.completed_at, previousRange.start, previousRange.endExclusive));
    const completedOnTime = completedCurrent.filter((task) => !task.date_delivered || new Date(task.completed_at) <= new Date(task.date_delivered)).length;
    const avgCompletionTime = completedCurrent.length > 0
        ? Math.round(
            completedCurrent.reduce((sum, task) => sum + (daysBetween(task.completed_at, task.date_commissioned || task.created_at) || 0), 0) / completedCurrent.length
        )
        : 0;

    const outstandingTasks = tasks.filter((task) => Number(task.can_pay_now) === 1 && Number(task.current_due_amount || 0) > 0);
    const overdueTasks = outstandingTasks.filter((task) => task.date_delivered && new Date(task.date_delivered) < new Date());

    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    const paidThisMonth = payments.reduce((sum, payment) => (
        inRange(payment.received_at, currentMonthStart, new Date(Date.now() + DAY_MS)) ? sum + payment.amount : sum
    ), 0);

    const registeredClients = new Set(tasks.filter((task) => task.client_id).map((task) => task.client_id)).size;
    const guestClients = new Set(tasks.filter((task) => task.guest_client_id).map((task) => task.guest_client_id)).size;

    const endClientCount = new Set(
        tasks
            .filter((task) => asDate(task.created_at) && asDate(task.created_at) <= range.end)
            .map((task) => getClientKey(task))
    ).size;
    const previousClientCount = new Set(
        tasks
            .filter((task) => asDate(task.created_at) && asDate(task.created_at) <= previousRange.end)
            .map((task) => getClientKey(task))
    ).size;

    return {
        expectedRevenue: roundMoney(currentExpectedRevenue),
        actualRevenue: roundMoney(currentActualRevenue),
        collectionRate: currentExpectedRevenue > 0 ? Math.round((currentActualRevenue / currentExpectedRevenue) * 100) : 0,
        revenueTrend: calculateTrend(currentActualRevenue, previousActualRevenue),
        activeTasks: activeTasks.length,
        inProgress,
        pendingReview,
        tasksTrend: calculateTrend(activeTasks.length, activeSnapshotAtPreviousEnd),
        priorityBreakdown: {
            urgent: tasks.filter((task) => task.priority === 'urgent' && !['completed', 'cancelled'].includes(task.status)).length,
            high: tasks.filter((task) => task.priority === 'high' && !['completed', 'cancelled'].includes(task.status)).length,
            medium: tasks.filter((task) => task.priority === 'medium' && !['completed', 'cancelled'].includes(task.status)).length,
            low: tasks.filter((task) => task.priority === 'low' && !['completed', 'cancelled'].includes(task.status)).length
        },
        totalClients: endClientCount,
        registeredClients,
        guestClients,
        clientGrowth: calculateTrend(endClientCount, previousClientCount),
        quoteAcceptanceRate: acceptanceRate,
        totalQuotes: quoteTasksInCurrentRange.length,
        approvedQuotes: acceptedQuotes,
        rejectedQuotes,
        avgQuoteResponseTime,
        pendingQuotes,
        quoteTrend: calculateTrend(acceptanceRate, previousAcceptanceRate),
        completedThisPeriod: completedCurrent.length,
        completedOnTime,
        avgCompletionTime,
        onTimeRate: completedCurrent.length > 0 ? Math.round((completedOnTime / completedCurrent.length) * 100) : 0,
        completionTrend: calculateTrend(completedCurrent.length, completedPrevious.length),
        outstanding: roundMoney(outstandingTasks.reduce((sum, task) => sum + Number(task.current_due_amount || 0), 0)),
        overdue: roundMoney(overdueTasks.reduce((sum, task) => sum + Number(task.current_due_amount || 0), 0)),
        paidThisMonth: roundMoney(paidThisMonth),
        paymentTrend: calculateTrend(currentActualRevenue, previousActualRevenue)
    };
}

function buildRevenueSeries(tasks, payments, range, groupBy) {
    const periodMap = new Map();

    for (const task of tasks) {
        const eventDate = getExpectedEventDate(task);
        if (!eventDate || !inRange(eventDate, range.start, range.endExclusive)) continue;

        const period = formatPeriod(eventDate, groupBy);
        const bucket = addToMap(periodMap, period, () => ({
            period,
            expected: 0,
            actual: 0,
            task_count: 0
        }));

        bucket.expected += Number(getProjectTotal(task) || 0);
        bucket.task_count += 1;
    }

    for (const payment of payments) {
        if (!inRange(payment.received_at, range.start, range.endExclusive)) continue;

        const period = formatPeriod(payment.received_at, groupBy);
        const bucket = addToMap(periodMap, period, () => ({
            period,
            expected: 0,
            actual: 0,
            task_count: 0
        }));

        bucket.actual += payment.amount;
    }

    return [...periodMap.values()]
        .sort((left, right) => left.period.localeCompare(right.period))
        .map((row) => ({
            ...row,
            expected: roundMoney(row.expected),
            actual: roundMoney(row.actual)
        }));
}

function buildPipeline(tasks) {
    const stageOrder = ['pending_quote', 'quote_sent', 'payment_due', 'pending_deposit', 'in_progress', 'review', 'completed'];
    const stageMap = new Map(stageOrder.map((stage) => [stage, {
        stage,
        count: 0,
        value: 0
    }]));

    for (const task of tasks) {
        const stage = getTaskPipelineStage(task);
        if (!stage || !stageMap.has(stage)) continue;

        const bucket = stageMap.get(stage);
        bucket.count += 1;
        bucket.value += Number(getProjectTotal(task) || 0);
    }

    let previousCount = null;
    return stageOrder
        .map((stage) => stageMap.get(stage))
        .filter((stage) => stage.count > 0)
        .map((stage) => {
            const conversion = previousCount ? Math.round((stage.count / previousCount) * 100) : 100;
            previousCount = stage.count;
            return {
                ...stage,
                value: roundMoney(stage.value),
                conversion
            };
        });
}

function buildTaskStatus(tasks, range) {
    const statusMap = new Map();

    for (const task of tasks) {
        if (!inRange(task.created_at, range.start, range.endExclusive) && !inRange(task.updated_at, range.start, range.endExclusive)) {
            continue;
        }

        const status = task.status || 'not_started';
        const bucket = addToMap(statusMap, status, () => ({ status, count: 0 }));
        bucket.count += 1;
    }

    const order = ['not_started', 'pending_deposit', 'in_progress', 'review', 'completed', 'cancelled'];
    return [...statusMap.values()].sort((left, right) => order.indexOf(left.status) - order.indexOf(right.status));
}

function buildFinancialStats(tasks, payments, range) {
    const tasksInRange = tasks.filter((task) => inRange(task.created_at, range.start, range.endExclusive) || inRange(getExpectedEventDate(task), range.start, range.endExclusive));
    const paymentsInRange = payments.filter((payment) => inRange(payment.received_at, range.start, range.endExclusive));
    const currentOutstandingTasks = tasks.filter((task) => Number(task.can_pay_now) === 1 && Number(task.current_due_amount || 0) > 0);
    const overdueTasks = currentOutstandingTasks.filter((task) => task.date_delivered && new Date(task.date_delivered) < new Date());

    const revenueByClientMap = new Map();
    for (const task of tasksInRange) {
        const key = getClientKey(task);
        const entry = addToMap(revenueByClientMap, key, () => ({
            client: getClientName(task),
            projectCount: 0,
            expected: 0,
            paid: 0,
            revenue: 0,
            platformRevenue: 0,
            offlineRevenue: 0
        }));
        entry.projectCount += 1;
        entry.expected += Number(getProjectTotal(task) || 0);
    }

    for (const payment of paymentsInRange) {
        const key = payment.client_id ? `u_${payment.client_id}` : payment.guest_client_id ? `g_${payment.guest_client_id}` : `task_${payment.task_id}`;
        const entry = addToMap(revenueByClientMap, key, () => ({
            client: getClientName(payment),
            projectCount: 0,
            expected: 0,
            paid: 0,
            revenue: 0,
            platformRevenue: 0,
            offlineRevenue: 0
        }));

        entry.paid += payment.amount;
        entry.revenue += payment.amount;
        if (payment.source === 'offline_admin') {
            entry.offlineRevenue += payment.amount;
        } else {
            entry.platformRevenue += payment.amount;
        }
    }

    const revenueByClient = [...revenueByClientMap.values()]
        .map((item) => ({
            ...item,
            expected: roundMoney(item.expected),
            paid: roundMoney(item.paid),
            revenue: roundMoney(item.revenue),
            platformRevenue: roundMoney(item.platformRevenue),
            offlineRevenue: roundMoney(item.offlineRevenue)
        }))
        .sort((left, right) => right.revenue - left.revenue)
        .slice(0, 10);

    const totals = paymentsInRange.reduce((accumulator, payment) => {
        accumulator.total += payment.amount;
        if (payment.source === 'offline_admin') {
            accumulator.offline += payment.amount;
        } else {
            accumulator.platform += payment.amount;
        }
        accumulator[payment.type] += payment.amount;
        return accumulator;
    }, {
        total: 0,
        platform: 0,
        offline: 0,
        deposit: 0,
        balance: 0,
        full: 0
    });

    const breakdownRaw = [
        { category: 'Total Revenue', amount: totals.total },
        { category: 'Platform Revenue', amount: totals.platform },
        { category: 'Offline Revenue', amount: totals.offline },
        { category: 'Deposits', amount: totals.deposit },
        { category: 'Balances', amount: totals.balance },
        { category: 'Full Payments', amount: totals.full }
    ].filter((item) => item.amount > 0);

    const revenueBreakdown = breakdownRaw.map((item) => ({
        ...item,
        amount: roundMoney(item.amount),
        percentage: totals.total > 0 ? Math.round((item.amount / totals.total) * 100) : 0
    }));

    const monthMap = new Map();
    for (const payment of paymentsInRange) {
        const period = formatPeriod(payment.received_at, 'month');
        const bucket = addToMap(monthMap, period, () => ({
            month: monthLabelFromPeriod(period),
            paid: 0,
            pending: 0,
            overdue: 0,
            sort_key: period
        }));
        bucket.paid += payment.amount;
    }

    for (const task of currentOutstandingTasks) {
        const anchor = task.date_delivered || task.payment_due_started_at || task.created_at;
        if (!anchor || !inRange(anchor, range.start, range.endExclusive)) continue;

        const period = formatPeriod(anchor, 'month');
        const bucket = addToMap(monthMap, period, () => ({
            month: monthLabelFromPeriod(period),
            paid: 0,
            pending: 0,
            overdue: 0,
            sort_key: period
        }));

        if (task.date_delivered && new Date(task.date_delivered) < new Date()) {
            bucket.overdue += Number(task.current_due_amount || 0);
        } else {
            bucket.pending += Number(task.current_due_amount || 0);
        }
    }

    const paymentStatusByMonth = [...monthMap.values()]
        .sort((left, right) => left.sort_key.localeCompare(right.sort_key))
        .map(({ sort_key, ...row }) => ({
            ...row,
            paid: roundMoney(row.paid),
            pending: roundMoney(row.pending),
            overdue: roundMoney(row.overdue)
        }));

    const finalPayments = payments.filter((payment) => ['balance', 'full'].includes(payment.type));
    const avgDaysToPaymentCandidates = finalPayments
        .map((payment) => daysBetween(payment.received_at, payment.completed_at))
        .filter((value) => value !== null && value >= 0);

    return {
        revenueByClient,
        revenueBreakdown,
        overduePayments: overdueTasks
            .map((task) => ({
                client: getClientName(task),
                project: task.task_name || `Task #${task.id}`,
                amount: roundMoney(Number(task.current_due_amount || 0)),
                dueDate: task.date_delivered,
                daysOverdue: Math.max(daysBetween(new Date(), task.date_delivered) || 0, 0),
                phase: task.current_due_phase
            }))
            .sort((left, right) => right.daysOverdue - left.daysOverdue)
            .slice(0, 10),
        paymentStatusByMonth,
        avgDaysToPayment: avgDaysToPaymentCandidates.length > 0
            ? Math.round(avgDaysToPaymentCandidates.reduce((sum, value) => sum + value, 0) / avgDaysToPaymentCandidates.length)
            : 0,
        overdueRate: currentOutstandingTasks.length > 0
            ? Math.round((overdueTasks.length / currentOutstandingTasks.length) * 100)
            : 0,
        totalRevenue: roundMoney(totals.total),
        platformRevenue: roundMoney(totals.platform),
        offlineRevenue: roundMoney(totals.offline),
        depositRevenue: roundMoney(totals.deposit),
        balanceRevenue: roundMoney(totals.balance),
        fullRevenue: roundMoney(totals.full),
        outstanding: roundMoney(currentOutstandingTasks.reduce((sum, task) => sum + Number(task.current_due_amount || 0), 0)),
        outstandingDeposit: roundMoney(currentOutstandingTasks.filter((task) => task.current_due_phase === 'deposit').reduce((sum, task) => sum + Number(task.current_due_amount || 0), 0)),
        outstandingBalance: roundMoney(currentOutstandingTasks.filter((task) => task.current_due_phase === 'balance').reduce((sum, task) => sum + Number(task.current_due_amount || 0), 0)),
        outstandingFull: roundMoney(currentOutstandingTasks.filter((task) => task.current_due_phase === 'full').reduce((sum, task) => sum + Number(task.current_due_amount || 0), 0))
    };
}

function buildClientStats(tasks, payments, range) {
    const paymentsInRange = payments.filter((payment) => inRange(payment.received_at, range.start, range.endExclusive));
    const revenueByClient = new Map();
    const activeClients = new Set();

    for (const payment of paymentsInRange) {
        const key = payment.client_id ? `u_${payment.client_id}` : payment.guest_client_id ? `g_${payment.guest_client_id}` : `task_${payment.task_id}`;
        activeClients.add(key);
        const entry = addToMap(revenueByClient, key, () => ({
            name: getClientName(payment),
            projectCount: 0,
            revenue: 0,
            lastActive: payment.received_at
        }));
        entry.revenue += payment.amount;
        entry.lastActive = payment.received_at;
    }

    for (const task of tasks) {
        const key = getClientKey(task);
        if (
            inRange(task.created_at, range.start, range.endExclusive)
            || inRange(task.updated_at, range.start, range.endExclusive)
            || inRange(task.completed_at, range.start, range.endExclusive)
        ) {
            activeClients.add(key);
        }
        const entry = addToMap(revenueByClient, key, () => ({
            name: getClientName(task),
            projectCount: 0,
            revenue: 0,
            lastActive: task.updated_at || task.created_at
        }));
        entry.projectCount += 1;
        if (asDate(task.updated_at) > asDate(entry.lastActive)) {
            entry.lastActive = task.updated_at;
        }
    }

    const topClients = [...revenueByClient.values()]
        .filter((item) => item.revenue > 0)
        .sort((left, right) => right.revenue - left.revenue)
        .slice(0, 10)
        .map((item) => ({
            ...item,
            revenue: roundMoney(item.revenue),
            rating: 4.8
        }));

    const clientProjectCounts = {};
    for (const task of tasks) {
        const key = getClientKey(task);
        clientProjectCounts[key] = (clientProjectCounts[key] || 0) + 1;
    }

    const loyaltyBuckets = { 'One-time': 0, Returning: 0, VIP: 0 };
    Object.values(clientProjectCounts).forEach((count) => {
        if (count === 1) loyaltyBuckets['One-time'] += 1;
        else if (count <= 5) loyaltyBuckets.Returning += 1;
        else loyaltyBuckets.VIP += 1;
    });

    const totalClients = Object.keys(clientProjectCounts).length || 1;
    const clientLoyalty = Object.entries(loyaltyBuckets)
        .map(([name, count]) => ({
            name,
            count,
            percentage: Math.round((count / totalClients) * 100)
        }))
        .filter((item) => item.count > 0);

    const clientScatter = [...revenueByClient.values()]
        .filter((item) => item.revenue > 0)
        .sort((left, right) => right.revenue - left.revenue)
        .slice(0, 50)
        .map((item) => ({
            name: item.name,
            projects: item.projectCount,
            revenue: roundMoney(item.revenue),
            lastActive: item.lastActive
        }));

    const repeatClients = Object.values(clientProjectCounts).filter((count) => count > 1).length;
    const retentionRate = totalClients > 0 ? Math.round((repeatClients / totalClients) * 100) : 0;

    const acquisitionMap = new Map();
    for (const task of tasks) {
        const key = task.guest_client_id ? 'Guest Referral' : 'Registered Client';
        acquisitionMap.set(key, (acquisitionMap.get(key) || 0) + 1);
    }

    const acquisitionChannels = [...acquisitionMap.entries()].map(([name, value]) => ({ name, value }));

    return {
        totalClients,
        activeClients: activeClients.size,
        inactiveClients: Math.max(totalClients - activeClients.size, 0),
        topClients,
        clientLoyalty,
        clientScatter,
        retentionRate,
        acquisitionChannels
    };
}

class AnalyticsService {
    async getKpis(startDate, endDate) {
        const range = buildRange(startDate, endDate, (end) => new Date(end.getTime() - 30 * DAY_MS));
        const previousRange = getPreviousRange(range.start, range.end);
        const [tasks, payments] = await Promise.all([fetchAnalyticsTasks(), fetchAnalyticsPayments()]);
        return computeKpis(tasks, payments, range, previousRange);
    }

    async getRevenue(startDate, endDate, groupBy = 'month') {
        const range = buildRange(startDate, endDate, (end) => new Date(end.getTime() - 180 * DAY_MS));
        const [tasks, payments] = await Promise.all([fetchAnalyticsTasks(), fetchAnalyticsPayments()]);
        return buildRevenueSeries(tasks, payments, range, groupBy === 'day' ? 'day' : 'month');
    }

    async getPipeline() {
        const tasks = await fetchAnalyticsTasks();
        return buildPipeline(tasks);
    }

    async getTaskStatus(startDate, endDate) {
        const range = buildRange(startDate, endDate, (end) => new Date(end.getTime() - 30 * DAY_MS));
        const tasks = await fetchAnalyticsTasks();
        return buildTaskStatus(tasks, range);
    }

    async getFinancialStats(startDate, endDate) {
        const range = buildRange(startDate, endDate, (end) => new Date(end.getTime() - 180 * DAY_MS));
        const [tasks, payments] = await Promise.all([fetchAnalyticsTasks(), fetchAnalyticsPayments()]);
        return buildFinancialStats(tasks, payments, range);
    }

    async getClientStats(startDate, endDate) {
        const range = buildRange(startDate, endDate, (end) => new Date(end.getTime() - 365 * DAY_MS));
        const [tasks, payments] = await Promise.all([fetchAnalyticsTasks(), fetchAnalyticsPayments()]);
        return buildClientStats(tasks, payments, range);
    }
}

module.exports = new AnalyticsService();
