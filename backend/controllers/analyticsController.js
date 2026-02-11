const { pool } = require('../config/database');

// Executive KPIs
exports.getKPIs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate || new Date();

    // Revenue metrics
    const revenueQuery = `
      SELECT 
        SUM(CASE WHEN quote_status = 'approved' THEN quoted_amount ELSE 0 END) as expected_revenue,
        SUM(CASE WHEN is_paid = 1 THEN quoted_amount ELSE 0 END) as actual_revenue,
        COUNT(CASE WHEN is_paid = 1 THEN 1 END) as paid_count,
        COUNT(*) as total_tasks
      FROM tasks
      WHERE created_at BETWEEN ? AND ?
    `;

    // Active tasks
    const activeTasksQuery = `
      SELECT 
        COUNT(*) as active_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'review' THEN 1 END) as pending_review
      FROM tasks
      WHERE status IN ('in_progress', 'review')
    `;

    // Client metrics
    const clientQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'client' AND status = 'approved') as total_clients,
        (SELECT COUNT(*) FROM users WHERE role = 'client' AND status = 'approved') as registered_clients,
        0 as guest_clients
    `;


    // Quote performance
    const quoteQuery = `
      SELECT 
        COUNT(CASE WHEN quote_status = 'approved' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as acceptance_rate,
        AVG(DATEDIFF(updated_at, created_at)) as avg_response_time,
        COUNT(CASE WHEN quote_status = 'quote_sent' THEN 1 END) as pending_quotes
      FROM tasks
      WHERE created_at BETWEEN ? AND ?
    `;


    // Task completion
    const completionQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        AVG(DATEDIFF(date_delivered, date_commissioned)) as avg_completion_time,
        COUNT(CASE WHEN date_delivered <= date_commissioned THEN 1 END) * 100.0 / 
          NULLIF(COUNT(CASE WHEN status = 'completed' THEN 1 END), 0) as on_time_rate
      FROM tasks
      WHERE created_at BETWEEN ? AND ?
    `;

    // Payment health
    const paymentQuery = `
      SELECT 
        SUM(CASE WHEN quote_status = 'approved' AND is_paid = 0 THEN quoted_amount ELSE 0 END) as outstanding,
        SUM(CASE WHEN quote_status = 'approved' AND is_paid = 0 AND date_delivered < NOW() THEN quoted_amount ELSE 0 END) as overdue,
        SUM(CASE WHEN is_paid = 1 AND updated_at BETWEEN ? AND ? THEN quoted_amount ELSE 0 END) as paid_this_month
      FROM tasks
    `;

    const [[revenue]] = await pool.query(revenueQuery, [start, end]);
    const [[activeTasks]] = await pool.query(activeTasksQuery);
    const [[clients]] = await pool.query(clientQuery);
    const [[quotes]] = await pool.query(quoteQuery, [start, end]);
    const [[completion]] = await pool.query(completionQuery, [start, end]);
    const [[payment]] = await pool.query(paymentQuery, [start, end]);

    res.json({
      // Revenue
      expectedRevenue: revenue.expected_revenue || 0,
      actualRevenue: revenue.actual_revenue || 0,
      collectionRate: revenue.expected_revenue > 0
        ? Math.round((revenue.actual_revenue / revenue.expected_revenue) * 100)
        : 0,
      revenueTrend: '+12%', // TODO: Calculate from previous period

      // Active Tasks
      activeTasks: activeTasks.active_tasks || 0,
      inProgress: activeTasks.in_progress || 0,
      pendingReview: activeTasks.pending_review || 0,
      tasksTrend: '+5%',

      // Clients
      totalClients: clients.total_clients || 0,
      registeredClients: clients.registered_clients || 0,
      guestClients: clients.guest_clients || 0,
      clientGrowth: '+8%',

      // Quotes
      quoteAcceptanceRate: Math.round(quotes.acceptance_rate || 0),
      avgQuoteResponseTime: Math.round(quotes.avg_response_time || 0),
      pendingQuotes: quotes.pending_quotes || 0,
      quoteTrend: '+3%',

      // Completion
      completedThisPeriod: completion.completed_count || 0,
      avgCompletionTime: Math.round(completion.avg_completion_time || 0),
      onTimeRate: Math.round(completion.on_time_rate || 0),
      completionTrend: '+10%',

      // Payment
      outstanding: payment.outstanding || 0,
      overdue: payment.overdue || 0,
      paidThisMonth: payment.paid_this_month || 0,
      paymentTrend: '-5%'
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

    const dateFormat = groupBy === 'day' ? '%Y-%m-%d' : '%Y-%m';

    const query = `
      SELECT 
        DATE_FORMAT(created_at, ?) as period,
        SUM(CASE WHEN quote_status = 'approved' THEN quoted_amount ELSE 0 END) as expected,
        SUM(CASE WHEN is_paid = 1 THEN quoted_amount ELSE 0 END) as actual,
        COUNT(*) as task_count
      FROM tasks
      WHERE created_at BETWEEN ? AND ?
      GROUP BY period
      ORDER BY period
    `;

    const [results] = await pool.query(query, [dateFormat, start, end]);

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
    const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 6));
    const end = endDate || new Date();

    const query = `
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as period,
        COUNT(*) as registered,
        0 as guests
      FROM users
      WHERE role = 'client' AND created_at BETWEEN ? AND ?
      GROUP BY period
      ORDER BY period
    `;


    const [results] = await pool.query(query, [start, end]);

    res.json(results);
  } catch (error) {
    console.error('Get client growth error:', error);
    res.status(500).json({ error: 'Failed to fetch client growth' });
  }
};

// Task Status Distribution
exports.getTaskStatus = async (req, res) => {
  try {
    const query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM tasks
      GROUP BY status
      ORDER BY FIELD(status, 'pending_quote', 'quote_sent', 'in_progress', 'review', 'completed')
    `;

    const [results] = await pool.query(query);

    res.json(results);
  } catch (error) {
    console.error('Get task status error:', error);
    res.status(500).json({ error: 'Failed to fetch task status' });
  }
};
