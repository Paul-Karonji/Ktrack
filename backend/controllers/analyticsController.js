const { pool } = require('../config/database');
const analyticsService = require('../services/analyticsService');

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
    const data = await analyticsService.getKpis(req.query.startDate, req.query.endDate);
    res.json(data);
  } catch (error) {
    console.error('Get KPIs error:', error);
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
};


// Revenue Analytics
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;
    const results = await analyticsService.getRevenue(startDate, endDate, groupBy);
    res.json(results);
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
};

// Task Pipeline
exports.getTaskPipeline = async (req, res) => {
  try {
    const results = await analyticsService.getPipeline();
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
    const results = await analyticsService.getTaskStatus(req.query.startDate, req.query.endDate);
    res.json(results);
  } catch (error) {
    console.error('Get task status error:', error);
    res.status(500).json({ error: 'Failed to fetch task status' });
  }
};

// Detailed Financial Stats
exports.getFinancialStats = async (req, res) => {
  try {
    const results = await analyticsService.getFinancialStats(req.query.startDate, req.query.endDate);
    res.json(results);
  } catch (error) {
    console.error('Get financial stats error:', error);
    res.status(500).json({ error: 'Failed to fetch financial stats' });
  }
};

// Detailed Client Stats
exports.getClientStats = async (req, res) => {
  try {
    const results = await analyticsService.getClientStats(req.query.startDate, req.query.endDate);
    res.json(results);
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
