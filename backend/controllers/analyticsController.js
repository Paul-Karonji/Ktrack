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


    // Priority breakdown
    const priorityQuery = `
      SELECT 
        priority,
        COUNT(*) as count
      FROM tasks
      WHERE status != 'completed'
      GROUP BY priority
    `;

    // Task completion details
    const completionQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'completed' AND date_delivered <= date_commissioned THEN 1 END) as completed_on_time,
        AVG(DATEDIFF(date_delivered, date_commissioned)) as avg_completion_time,
        AVG(DATEDIFF(date_commissioned, created_at)) as avg_response_time,
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
    const [priority] = await pool.query(priorityQuery);
    const [[completion]] = await pool.query(completionQuery, [start, end]);
    const [[payment]] = await pool.query(paymentQuery, [start, end]);

    // Format priority breakdown
    const priorityStats = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    priority.forEach(p => {
      if (priorityStats[p.priority] !== undefined) {
        priorityStats[p.priority] = p.count;
      }
    });

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
      priorityBreakdown: priorityStats,

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
      completedOnTime: completion.completed_on_time || 0,
      avgCompletionTime: Math.round(completion.avg_completion_time || 0),
      avgResponseTime: Math.round(completion.avg_response_time || 0),
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

// Detailed Financial Stats
exports.getFinancialStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    // Ensure dates are Date objects for correct MySQL formatting
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 6));
    const end = endDate ? new Date(endDate) : new Date();

    // 1. Revenue Breakdown by Client
    // Joins tasks with users to get client names
    const breakdownQuery = `
      SELECT 
        u.full_name as client,
        COUNT(t.id) as projectCount,
        SUM(CASE WHEN t.quote_status = 'approved' THEN t.quoted_amount ELSE 0 END) as expected,
        SUM(CASE WHEN t.is_paid = 1 THEN t.quoted_amount ELSE 0 END) as paid,
        SUM(CASE WHEN t.is_paid = 1 THEN t.quoted_amount ELSE 0 END) as revenue
      FROM tasks t
      JOIN users u ON t.client_id = u.id
      WHERE t.created_at BETWEEN ? AND ?
      GROUP BY t.client_id, u.full_name
      ORDER BY revenue DESC
      LIMIT 5
    `;

    // 2. Overdue Payments
    // Tasks that are approved, not paid, and past due date
    const overdueQuery = `
      SELECT 
        u.full_name as client,
        t.task_name as project,
        t.quoted_amount as amount,
        t.date_delivered as dueDate,
        DATEDIFF(NOW(), t.date_delivered) as daysOverdue
      FROM tasks t
      JOIN users u ON t.client_id = u.id
      WHERE t.quote_status = 'approved' AND t.is_paid = 0 AND t.date_delivered < NOW()
      ORDER BY daysOverdue DESC
      LIMIT 5
    `;

    // 3. Payment Status by Month
    // Grouped by month for the stacked bar chart
    const paymentStatusQuery = `
      SELECT 
        DATE_FORMAT(updated_at, '%b') as month,
        SUM(CASE WHEN is_paid = 1 THEN quoted_amount ELSE 0 END) as paid,
        SUM(CASE WHEN is_paid = 0 AND quote_status = 'approved' AND date_delivered >= NOW() THEN quoted_amount ELSE 0 END) as pending,
        SUM(CASE WHEN is_paid = 0 AND quote_status = 'approved' AND date_delivered < NOW() THEN quoted_amount ELSE 0 END) as overdue
      FROM tasks
      WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY MAX(updated_at) ASC
    `;

    const [breakdown] = await pool.query(breakdownQuery, [start, end]);
    const [overdue] = await pool.query(overdueQuery);
    const [paymentStatus] = await pool.query(paymentStatusQuery);

    res.json({
      revenueByClient: breakdown,
      overduePayments: overdue,
      paymentStatusByMonth: paymentStatus
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

    // 1. Top Clients by Revenue
    const topClientsQuery = `
      SELECT 
        u.full_name as name,
        COUNT(t.id) as projectCount,
        SUM(CASE WHEN t.is_paid = 1 THEN t.quoted_amount ELSE 0 END) as revenue,
        4.8 as rating -- Placeholder
      FROM tasks t
      JOIN users u ON t.client_id = u.id
      WHERE t.created_at BETWEEN ? AND ?
      GROUP BY t.client_id, u.full_name
      ORDER BY revenue DESC
      LIMIT 10
    `;

    // 2. Client Loyalty Distribution (Real Data)
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
          SELECT client_id, COUNT(*) as project_count 
          FROM tasks 
          GROUP BY client_id
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

    const [topClients] = await pool.query(topClientsQuery, [start, end]);

    // 3. Client Scatter Data
    let scatterData = [];
    try {
      const scatterQuery = `
        SELECT 
          u.full_name as name,
          COUNT(t.id) as projects,
          SUM(CASE WHEN t.is_paid = 1 THEN t.quoted_amount ELSE 0 END) as revenue,
          MAX(t.created_at) as lastActive
        FROM tasks t
        JOIN users u ON t.client_id = u.id
        GROUP BY t.client_id, u.full_name
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
          COUNT(DISTINCT CASE WHEN project_count > 1 THEN client_id END) * 100.0 / NULLIF(COUNT(DISTINCT client_id), 0) as retention_rate
        FROM (
          SELECT client_id, COUNT(*) as project_count 
          FROM tasks 
          GROUP BY client_id
        ) as client_projects
      `;
      const [retentionResult] = await pool.query(retentionQuery);
      retentionRate = retentionResult && retentionResult[0] ? Math.round(retentionResult[0].retention_rate || 0) : 0;
    } catch (err) {
      console.error('Retention query error:', err);
    }

    res.json({
      topClients,
      clientLoyalty,
      clientScatter: scatterData,
      retentionRate
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
        COALESCE(u.full_name, t.client_name) as client,
        t.status,
        t.date_commissioned as start,
        t.date_delivered as end,
        t.quoted_amount as amount
      FROM tasks t
      LEFT JOIN users u ON t.client_id = u.id
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
