const { pool } = require('../config/database');

exports.getPublicStats = async (req, res) => {
    try {
        // Run queries in parallel for speed
        const clientCountPromise = pool.query(
            'SELECT COUNT(*) as count FROM users WHERE role = ?',
            ['client']
        );

        const jobsDonePromise = pool.query(
            'SELECT COUNT(*) as count FROM tasks WHERE status = ? OR status = ?',
            ['completed', 'approved'] // Assuming 'approved' might also count as "done" or just 'completed'
        );

        const [clientRows] = await clientCountPromise;
        const [jobRows] = await jobsDonePromise;

        res.json({
            success: true,
            stats: {
                clients: clientRows[0].count,
                jobsDone: jobRows[0].count
            }
        });
    } catch (error) {
        console.error('Error fetching public stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
};
