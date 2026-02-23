const { pool } = require('../config/database');

const getPreviousPeriod = (start, end) => {
  const diff = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diff);
  return { start: prevStart, end: prevEnd };
};

const calculateTrend = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? '+100%' : '0%';
  const change = ((current - previous) / previous) * 100;
  return `${change > 0 ? '+' : ''}${Math.round(change)}%`;
};

// Fill in missing months/periods for time-series charts
const fillGaps = (data, startPeriod, endPeriod, format = 'month') => {
  const filledData = [];
  let current = new Date(startPeriod);
  const finish = new Date(endPeriod);

  while (current <= finish ||
    (format === 'month' && current.getMonth() === finish.getMonth() && current.getFullYear() === finish.getFullYear())) {
    const period = format === 'day'
      ? current.toISOString().split('T')[0]
      : current.getFullYear() + '-' + String(current.getMonth() + 1).padStart(2, '0');

    // Prevent infinite loop
    if (filledData.length > 500) break;

    // Avoid duplicate periods
    if (filledData.some(r => r.period === period)) {
      if (format === 'day') current.setDate(current.getDate() + 1);
      else current.setMonth(current.getMonth() + 1);
      continue;
    }

    const existing = data.find(item => item.period === period);
    if (existing) {
      filledData.push(existing);
    } else {
      filledData.push({ period, registered: 0, guests: 0, expected: 0, actual: 0, task_count: 0 });
    }

    if (format === 'day') {
      current.setDate(current.getDate() + 1);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }
  return filledData;
};

exports.getKPIs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const end = endDate ? new Date(endDate) : new Date();
    // Add 24h buffer to catch same-day payments/tasks across potential clock drift
    const endBuffered = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(end.getDate() - 30));
    const { start: prevStart, end: prevEnd } = getPreviousPeriod(start, end);

    const getStatsForPeriod = async (startPeriod, endPeriod) => {
      // Buffer the end period for the query
      const endBufferedQuery = new Date(new Date(endPeriod).getTime() + 24 * 60 * 60 * 1000);

      // Revenue metrics - Actual revenue should be based on paid_at within period
      const revenueQuery = `
        SELECT 
          SUM(CASE WHEN quote_status = 'approved' THEN COALESCE(NULLIF(quoted_amount, 0), expected_amount, 0) ELSE 0 END) as expected_revenue,
          SUM(CASE WHEN is_paid = 1 AND COALESCE(paid_at, updated_at) BETWEEN ? AND ? THEN quoted_amount ELSE 0 END) as actual_revenue,
          COUNT(CASE WHEN is_paid = 1 AND COALESCE(paid_at, updated_at) BETWEEN ? AND ? THEN 1 END) as paid_count,
          COUNT(*) as total_tasks
        FROM tasks
        WHERE (created_at BETWEEN ? AND ?) 
           OR (is_paid = 1 AND COALESCE(paid_at, updated_at) BETWEEN ? AND ?)
      `;

      // Quote performance
      const quoteQuery = `
        SELECT 
          COUNT(CASE WHEN quote_status = 'approved' THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN quote_status != 'pending_quote' THEN 1 END), 0) as acceptance_rate,
          AVG(DATEDIFF(updated_at, created_at)) as avg_response_time,
          COUNT(CASE WHEN quote_status = 'quote_sent' THEN 1 END) as pending_quotes
        FROM tasks
        WHERE created_at BETWEEN ? AND ?
      `;

      // Completion metrics
      const completionQuery = `
        SELECT 
          COUNT(CASE WHEN status = 'completed' AND completed_at BETWEEN ? AND ? THEN 1 END) as completed_count,
          COUNT(CASE WHEN status = 'completed' AND completed_at BETWEEN ? AND ? AND (completed_at <= date_delivered OR date_delivered IS NULL) THEN 1 END) as completed_on_time,
          AVG(DATEDIFF(completed_at, date_commissioned)) as avg_completion_time
        FROM tasks
        WHERE (completed_at BETWEEN ? AND ? OR (status = 'completed' AND completed_at IS NULL AND updated_at BETWEEN ? AND ?))
      `;

      // Joined query for clients
      const clientQuery = `
        SELECT 
          (SELECT COUNT(*) FROM users WHERE role = 'client' AND status = 'approved' AND created_at <= ?) + 
          (SELECT COUNT(*) FROM guest_clients WHERE (upgraded_to_user_id IS NULL OR upgraded_at > ?) AND created_at <= ?) as total_clients
      `;

      const [[rev]] = await pool.query(revenueQuery, [
        startPeriod, endBufferedQuery, // actual_revenue
        startPeriod, endBufferedQuery, // paid_count
        startPeriod, endBufferedQuery, // WHERE created_at
        startPeriod, endBufferedQuery  // WHERE paid_at fallback
      ]);
      const [[q]] = await pool.query(quoteQuery, [startPeriod, endBufferedQuery]);
      const [[comp]] = await pool.query(completionQuery, [
        startPeriod, endBufferedQuery, // completed_count
        startPeriod, endBufferedQuery, // completed_on_time
        startPeriod, endBufferedQuery, // WHERE completed_at
        startPeriod, endBufferedQuery  // WHERE updated_at fallback
      ]);
      const [[cli]] = await pool.query(clientQuery, [endBufferedQuery, endBufferedQuery, endBufferedQuery]);

      return { rev, q, comp, cli };
    };

    // Current metrics
    const current = await getStatsForPeriod(start, end);

    // Previous metrics for trends
    const previous = await getStatsForPeriod(prevStart, prevEnd);

    // Current Snapshots (don't need trend usually)
    const [[activeTasks]] = await pool.query(`
      SELECT 
        COUNT(*) as active_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'review' THEN 1 END) as pending_review
      FROM tasks
      WHERE status IN ('in_progress', 'review')
    `);

    const [[priority]] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN priority = 'urgent' AND status != 'completed' THEN 1 END) as urgent,
        COUNT(CASE WHEN priority = 'high' AND status != 'completed' THEN 1 END) as high,
        COUNT(CASE WHEN priority = 'medium' AND status != 'completed' THEN 1 END) as medium,
        COUNT(CASE WHEN priority = 'low' AND status != 'completed' THEN 1 END) as low
      FROM tasks
    `);

    const [[payment]] = await pool.query(`
      SELECT 
        SUM(CASE WHEN quote_status = 'approved' AND is_paid = 0 THEN quoted_amount ELSE 0 END) as outstanding,
        SUM(CASE WHEN quote_status = 'approved' AND is_paid = 0 AND date_delivered < NOW() THEN quoted_amount ELSE 0 END) as overdue,
        SUM(CASE WHEN is_paid = 1 AND paid_at BETWEEN ? AND ? THEN quoted_amount ELSE 0 END) as paid_this_month
      FROM tasks
    `, [new Date(new Date().setDate(1)), new Date()]); // Paid this calendar month

    const [[clientsNow]] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'client' AND status = 'approved') as registered_clients,
        (SELECT COUNT(*) FROM guest_clients WHERE upgraded_to_user_id IS NULL) as guest_clients
    `);

    res.json({
      expectedRevenue: Number(current.rev.expected_revenue) || 0,
      actualRevenue: Number(current.rev.actual_revenue) || 0,
      collectionRate: current.rev.expected_revenue > 0 ? Math.round((current.rev.actual_revenue / current.rev.expected_revenue) * 100) : 0,
      revenueTrend: calculateTrend(current.rev.actual_revenue, previous.rev.actual_revenue),

      activeTasks: activeTasks.active_tasks || 0,
      inProgress: activeTasks.in_progress || 0,
      pendingReview: activeTasks.pending_review || 0,
      tasksTrend: calculateTrend(activeTasks.active_tasks, previous.rev.total_tasks),
      priorityBreakdown: {
        urgent: priority.urgent || 0,
        high: priority.high || 0,
        medium: priority.medium || 0,
        low: priority.low || 0
      },

      totalClients: current.cli.total_clients || 0,
      registeredClients: clientsNow.registered_clients || 0,
      guestClients: clientsNow.guest_clients || 0,
      clientGrowth: calculateTrend(current.cli.total_clients, previous.cli.total_clients),

      quoteAcceptanceRate: Math.round(current.q.acceptance_rate || 0),
      avgQuoteResponseTime: Math.round(current.q.avg_response_time || 0),
      pendingQuotes: current.q.pending_quotes || 0,
      quoteTrend: calculateTrend(current.q.acceptance_rate, previous.q.acceptance_rate),

      completedThisPeriod: current.comp.completed_count || 0,
      completedOnTime: current.comp.completed_on_time || 0,
      avgCompletionTime: Math.round(current.comp.avg_completion_time || 0),
      onTimeRate: current.rev.total_tasks > 0 ? Math.round((current.comp.completed_on_time / current.rev.total_tasks) * 100) : 0,
      completionTrend: calculateTrend(current.comp.completed_count, previous.comp.completed_count),

      outstanding: Number(payment.outstanding) || 0,
      overdue: Number(payment.overdue) || 0,
      paidThisMonth: Number(payment.paid_this_month) || 0,
      paymentTrend: calculateTrend(payment.paid_this_month, previous.rev.actual_revenue)
    });
  } catch (error) {
    console.error('Get KPIs error:', error);
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
};


// Revenue Analytics
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;
    const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 6));
    const end = endDate || new Date();

    const endBuffered = new Date(new Date(end).getTime() + 24 * 60 * 60 * 1000);
    const dateFormat = groupBy === 'day' ? '%Y-%m-%d' : '%Y-%m';

    const query = `
      SELECT 
        DATE_FORMAT(COALESCE(paid_at, updated_at), ?) as period,
        SUM(CASE WHEN quote_status = 'approved' THEN COALESCE(NULLIF(quoted_amount, 0), expected_amount, 0) ELSE 0 END) as expected,
        SUM(CASE WHEN is_paid = 1 THEN quoted_amount ELSE 0 END) as actual,
        COUNT(*) as task_count
      FROM tasks
      WHERE (COALESCE(paid_at, updated_at) BETWEEN ? AND ?)
         OR (quote_status = 'approved' AND created_at BETWEEN ? AND ?)
      GROUP BY period
      ORDER BY period
    `;

    const [results] = await pool.query(query, [dateFormat, start, endBuffered, start, endBuffered]);

    res.json(results);
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
};

// Task Pipeline
exports.getTaskPipeline = async (req, res) => {
  try {
    const query = `
      SELECT 
        status as stage,
        COUNT(*) as count,
        SUM(quoted_amount) as value
      FROM tasks
      WHERE status != 'completed'
      GROUP BY status
      ORDER BY FIELD(status, 'pending_quote', 'quote_sent', 'in_progress', 'review')
    `;

    const [results] = await pool.query(query);

    // Calculate conversion rates
    const total = results.reduce((sum, r) => sum + r.count, 0);
    results.forEach((r, i) => {
      if (i === 0) {
        r.conversion = 100;
      } else {
        r.conversion = Math.round((r.count / results[i - 1].count) * 100);
      }
    });

    res.json(results);
  } catch (error) {
    console.error('Get task pipeline error:', error);
    res.status(500).json({ error: 'Failed to fetch task pipeline' });
  }
};

// Client Growth
exports.getClientGrowth = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const end = endDate ? new Date(endDate) : new Date();
    const endBuffered = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 6));

    const query = `
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as period,
        COUNT(*) as registered,
        0 as guests
      FROM users
      WHERE role = 'client' AND status = 'approved' AND created_at BETWEEN ? AND ?
      GROUP BY period
      UNION ALL
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as period,
        0 as registered,
        COUNT(*) as guests
      FROM guest_clients
      WHERE created_at BETWEEN ? AND ?
      GROUP BY period
      ORDER BY period
    `;

    const [results] = await pool.query(query, [start, endBuffered, start, endBuffered]);

    // Merge results by period
    const mergedResults = results.reduce((acc, curr) => {
      const existing = acc.find(item => item.period === curr.period);
      if (existing) {
        existing.registered += Number(curr.registered);
        existing.guests += Number(curr.guests);
      } else {
        acc.push({
          period: curr.period,
          registered: Number(curr.registered),
          guests: Number(curr.guests)
        });
      }
      return acc;
    }, []);

    const finalResults = fillGaps(mergedResults, start, end, 'month');

    res.json(finalResults);
  } catch (error) {
    console.error('Get client growth error:', error);
    res.status(500).json({ error: 'Failed to fetch client growth' });
  }
};

// Task Status Distribution
exports.getTaskStatus = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const end = endDate ? new Date(endDate) : new Date();
    const endBuffered = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(end.getDate() - 30));

    const query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM tasks
      WHERE created_at BETWEEN ? AND ? OR (is_paid = 1 AND COALESCE(paid_at, updated_at) BETWEEN ? AND ?)
      GROUP BY status
      ORDER BY FIELD(status, 'pending_quote', 'quote_sent', 'in_progress', 'review', 'completed')
    `;

    const [results] = await pool.query(query, [start, endBuffered, start, endBuffered]);

    res.json(results);
  } catch (error) {
    console.error('Get task status error:', error);
    res.status(500).json({ error: 'Failed to fetch task status' });
  }
};

// Detailed Financial Stats
exports.getFinancialStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const end = endDate ? new Date(endDate) : new Date();
    const endBuffered = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 6));

    // 1. Revenue Breakdown by Client
    const breakdownQuery = `
      SELECT 
        COALESCE(u.full_name COLLATE utf8mb4_0900_ai_ci, gc.name, t.client_name) as client,
        COUNT(t.id) as projectCount,
        SUM(CASE WHEN t.quote_status = 'approved' THEN t.quoted_amount ELSE 0 END) as expected,
        SUM(CASE WHEN t.is_paid = 1 THEN t.quoted_amount ELSE 0 END) as paid,
        SUM(CASE WHEN t.is_paid = 1 THEN t.quoted_amount ELSE 0 END) as revenue
      FROM tasks t
      LEFT JOIN users u ON t.client_id = u.id
      LEFT JOIN guest_clients gc ON t.guest_client_id = gc.id
      WHERE (t.created_at BETWEEN ? AND ?) OR (t.is_paid = 1 AND COALESCE(t.paid_at, t.updated_at) BETWEEN ? AND ?)
        AND (t.client_id IS NOT NULL OR t.guest_client_id IS NOT NULL)
      GROUP BY COALESCE(u.full_name COLLATE utf8mb4_0900_ai_ci, gc.name, t.client_name)
      ORDER BY revenue DESC
      LIMIT 5
    `;

    // 2. Overdue Payments
    const overdueQuery = `
      SELECT 
        COALESCE(u.full_name COLLATE utf8mb4_0900_ai_ci, gc.name, t.client_name) as client,
        t.task_name as project,
        t.quoted_amount as amount,
        t.date_delivered as dueDate,
        DATEDIFF(NOW(), t.date_delivered) as daysOverdue
      FROM tasks t
      LEFT JOIN users u ON t.client_id = u.id
      LEFT JOIN guest_clients gc ON t.guest_client_id = gc.id
      WHERE t.quote_status = 'approved' AND t.is_paid = 0 AND t.date_delivered < NOW()
      ORDER BY daysOverdue DESC
      LIMIT 5
    `;

    // 3. Payment Status by Month - using COALESCE(paid_at, updated_at)
    const paymentStatusQuery = `
      SELECT 
        DATE_FORMAT(COALESCE(paid_at, updated_at), '%b') as month,
        SUM(CASE WHEN is_paid = 1 THEN quoted_amount ELSE 0 END) as paid,
        SUM(CASE WHEN is_paid = 0 AND quote_status = 'approved' AND (date_delivered >= NOW() OR date_delivered IS NULL) THEN quoted_amount ELSE 0 END) as pending,
        SUM(CASE WHEN is_paid = 0 AND quote_status = 'approved' AND date_delivered < NOW() THEN quoted_amount ELSE 0 END) as overdue
      FROM tasks
      WHERE (created_at BETWEEN ? AND ?) OR (is_paid = 1 AND COALESCE(paid_at, updated_at) BETWEEN ? AND ?)
      GROUP BY month
      ORDER BY MAX(COALESCE(paid_at, updated_at)) ASC
    `;

    const [breakdown] = await pool.query(breakdownQuery, [start, endBuffered, start, endBuffered]);
    const [overdue] = await pool.query(overdueQuery);
    const [paymentStatus] = await pool.query(paymentStatusQuery, [start, endBuffered, start, endBuffered]);

    // 4. Calculate real averages
    const [stats] = await pool.query(`
      SELECT 
        AVG(DATEDIFF(paid_at, completed_at)) as avgDaysToPayment,
        (COUNT(CASE WHEN quote_status = 'approved' AND is_paid = 0 AND date_delivered < NOW() THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN quote_status = 'approved' AND is_paid = 0 THEN 1 END), 0)) as overdueRate
      FROM tasks
      WHERE created_at BETWEEN ? AND ?
    `, [start, end]);

    res.json({
      revenueByClient: breakdown,
      overduePayments: overdue,
      paymentStatusByMonth: paymentStatus,
      avgDaysToPayment: Math.round(stats[0].avgDaysToPayment || 0),
      overdueRate: Math.round(stats[0].overdueRate || 0)
    });

  } catch (error) {
    console.error('Get financial stats error:', error);
    res.status(500).json({ error: 'Failed to fetch financial stats' });
  }
};

// Detailed Client Stats
exports.getClientStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 12));
    const end = endDate ? new Date(endDate) : new Date();
    const endBuffered = new Date(end.getTime() + 24 * 60 * 60 * 1000);

    // 1. Top Clients by Revenue
    const topClientsQuery = `
      SELECT 
        COALESCE(u.full_name COLLATE utf8mb4_0900_ai_ci, gc.name, t.client_name) as name,
        COUNT(t.id) as projectCount,
        SUM(CASE WHEN t.is_paid = 1 THEN t.quoted_amount ELSE 0 END) as revenue,
        4.8 as rating -- Placeholder
      FROM tasks t
      LEFT JOIN users u ON t.client_id = u.id
      LEFT JOIN guest_clients gc ON t.guest_client_id = gc.id
      WHERE (t.created_at BETWEEN ? AND ?) OR (t.is_paid = 1 AND COALESCE(t.paid_at, t.updated_at) BETWEEN ? AND ?)
        AND (t.client_id IS NOT NULL OR t.guest_client_id IS NOT NULL)
      GROUP BY COALESCE(u.full_name COLLATE utf8mb4_0900_ai_ci, gc.name, t.client_name)
      ORDER BY revenue DESC
      LIMIT 10
    `;

    // 2. Client Loyalty Distribution
    let clientLoyalty = [];
    try {
      const loyaltyQuery = `
        SELECT 
          CASE 
            WHEN project_count = 1 THEN 'One-time'
            WHEN project_count BETWEEN 2 AND 5 THEN 'Returning'
            ELSE 'VIP'
          END as category,
          COUNT(*) as count
        FROM (
          -- Combined project counts for users and guests with prefixed IDs to avoid collision
          SELECT CONCAT('u_', client_id) as id, COUNT(*) as project_count 
          FROM tasks 
          WHERE client_id IS NOT NULL
          GROUP BY client_id
          UNION ALL
          SELECT CONCAT('g_', guest_client_id) as id, COUNT(*) as project_count 
          FROM tasks 
          WHERE guest_client_id IS NOT NULL
          GROUP BY guest_client_id
        ) as client_counts
        GROUP BY category
      `;

      const [loyaltyResult] = await pool.query(loyaltyQuery);

      const totalClientsWithProjects = loyaltyResult.reduce((sum, item) => sum + item.count, 0);
      clientLoyalty = loyaltyResult.map(item => ({
        name: item.category,
        count: item.count,
        percentage: totalClientsWithProjects > 0 ? Math.round((item.count / totalClientsWithProjects) * 100) : 0
      })).sort((a, b) => b.count - a.count);
    } catch (err) {
      console.error('Loyalty query error:', err);
    }

    const [topClients] = await pool.query(topClientsQuery, [start, endBuffered, start, endBuffered]);

    // 3. Client Scatter Data
    let scatterData = [];
    try {
      const scatterQuery = `
        SELECT 
          COALESCE(u.full_name COLLATE utf8mb4_0900_ai_ci, gc.name, t.client_name) as name,
          COUNT(t.id) as projects,
          SUM(CASE WHEN t.is_paid = 1 THEN t.quoted_amount ELSE 0 END) as revenue,
          MAX(t.created_at) as lastActive
        FROM tasks t
        LEFT JOIN users u ON t.client_id = u.id
        LEFT JOIN guest_clients gc ON t.guest_client_id = gc.id
        GROUP BY COALESCE(u.full_name COLLATE utf8mb4_0900_ai_ci, gc.name, t.client_name)
        HAVING revenue > 0
        ORDER BY revenue DESC
        LIMIT 50
      `;
      const [scatterResult] = await pool.query(scatterQuery);
      scatterData = scatterResult;
    } catch (err) {
      console.error('Scatter query error:', err);
    }

    // 4. Client Retention Rate
    let retentionRate = 0;
    try {
      const retentionQuery = `
        SELECT 
          COUNT(DISTINCT CASE WHEN project_count > 1 THEN id END) * 100.0 / NULLIF(COUNT(DISTINCT id), 0) as retention_rate
        FROM (
          SELECT CONCAT('u_', client_id) as id, COUNT(*) as project_count 
          FROM tasks 
          WHERE client_id IS NOT NULL
          GROUP BY client_id
          UNION ALL
          SELECT CONCAT('g_', guest_client_id) as id, COUNT(*) as project_count 
          FROM tasks 
          WHERE guest_client_id IS NOT NULL
          GROUP BY guest_client_id
        ) as client_projects
      `;
      const [retentionResult] = await pool.query(retentionQuery);
      retentionRate = retentionResult && retentionResult[0] ? Math.round(retentionResult[0].retention_rate || 0) : 0;
    } catch (err) {
      console.error('Retention query error:', err);
    }

    // Mock acquisition channels based on client courses
    const acquisitionQuery = `
      SELECT 
        COALESCE(course, 'Other') as name,
        COUNT(*) as value
      FROM (
        SELECT course COLLATE utf8mb4_0900_ai_ci as course FROM users WHERE role = 'client'
        UNION ALL
        SELECT course FROM guest_clients
      ) as all_clients
      GROUP BY name
    `;
    const [acquisitionChannels] = await pool.query(acquisitionQuery);

    res.json({
      topClients,
      clientLoyalty,
      clientScatter: scatterData,
      retentionRate,
      acquisitionChannels: acquisitionChannels.map(c => ({
        name: c.name,
        value: Number(c.value)
      }))
    });

  } catch (error) {
    console.error('Get client stats error:', error);
    res.status(500).json({ error: 'Failed to fetch client stats' });
  }
};

// Project Timeline (Gantt)
exports.getProjectTimeline = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 3));
    const end = endDate ? new Date(endDate) : new Date();

    const query = `
      SELECT 
        t.id,
        t.task_name as name,
        COALESCE(u.full_name, gc.name, t.client_name) as client,
        t.status,
        t.date_commissioned as start,
        t.date_delivered as end,
        t.quoted_amount as amount
      FROM tasks t
      LEFT JOIN users u ON t.client_id = u.id
      LEFT JOIN guest_clients gc ON t.guest_client_id = gc.id
      WHERE t.date_commissioned BETWEEN ? AND ?
      ORDER BY t.date_commissioned DESC
      LIMIT 20
    `;

    const [projects] = await pool.query(query, [start, end]);

    // Format dates and handle nulls
    const timeline = projects.map(p => ({
      ...p,
      start: p.start || new Date(), // Fallback if missing
      end: p.end || new Date(new Date(p.start).setDate(new Date(p.start).getDate() + 7)) // Estimate 7 days if ongoing
    }));

    res.json(timeline);
  } catch (error) {
    console.error('Get project timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch project timeline' });
  }
};

// Activity Heatmap
exports.getActivityHeatmap = async (req, res) => {
  try {
    // defaults to 1 year back
    const start = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    const end = new Date();

    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM tasks
      WHERE created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const [rows] = await pool.query(query, [start, end]);

    // Format for react-calendar-heatmap: { date: 'yyyy-mm-dd', count: 12 }
    const heatmap = rows.map(r => ({
      date: r.date.toISOString().split('T')[0], // Ensure YYYY-MM-DD
      count: r.count
    }));

    res.json(heatmap);
  } catch (error) {
    console.error('Get activity heatmap error:', error);
    res.status(500).json({ error: 'Failed to fetch activity heatmap' });
  }
};

// Storage Analytics
exports.getStorageAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 6));
    const end = endDate ? new Date(endDate) : new Date();

    // 1. Storage Stats (Utilization)
    // Assuming 5GB limit for now (5 * 1024 * 1024 * 1024)
    const limit = 5 * 1024 * 1024 * 1024; // 5GB
    const statsQuery = `
      SELECT 
        COUNT(*) as total_files,
        COALESCE(SUM(file_size), 0) as used_storage
      FROM task_files
    `;

    // 2. File Type Distribution
    const typesQuery = `
      SELECT 
        file_type,
        COUNT(*) as count,
        SUM(file_size) as size
      FROM task_files
      GROUP BY file_type
      ORDER BY size DESC
      LIMIT 5
    `;

    // 3. Storage Growth Trend
    const growthQuery = `
      SELECT 
        DATE_FORMAT(uploaded_at, '%Y-%m') as period,
        COUNT(*) as count,
        SUM(file_size) as size
      FROM task_files
      WHERE uploaded_at BETWEEN ? AND ?
      GROUP BY period
      ORDER BY period
    `;

    const [[stats]] = await pool.query(statsQuery);
    const [types] = await pool.query(typesQuery);
    const [growth] = await pool.query(growthQuery, [start, end]);

    // Calculate cumulative growth
    let cumulativeSize = 0;
    const trend = growth.map(item => {
      cumulativeSize += Number(item.size);
      return {
        period: item.period,
        size: item.size, // Daily/Monthly addition
        total: cumulativeSize, // Running total
        count: item.count
      };
    });

    res.json({
      totalFiles: stats.total_files || 0,
      usedStorage: stats.used_storage || 0,
      storageLimit: limit,
      utilization: Math.round((stats.used_storage / limit) * 100),
      fileTypes: types,
      storageTrend: trend
    });

  } catch (error) {
    console.error('Get storage analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch storage analytics' });
  }
};
