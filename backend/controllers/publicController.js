const { pool } = require('../config/database');

exports.getPublicStats = async (req, res) => {
    try {
        // Run queries in parallel for speed
        const clientCountPromise = pool.query(
            'SELECT (SELECT COUNT(*) FROM users WHERE role = ?) + (SELECT COUNT(*) FROM guest_clients WHERE upgraded_to_user_id IS NULL) as count',
            ['client']
        );

        const jobsDonePromise = pool.query(
            'SELECT COUNT(*) as count FROM tasks WHERE status = ?',
            ['completed']
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
