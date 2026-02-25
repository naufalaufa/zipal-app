const express = require('express');
const db = require('../config/db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.get('/admin/activity-logs', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const checkRoleSql = 'SELECT role FROM users WHERE id = ?';

    db.query(checkRoleSql, [userId], (err, userResult) => {
        if (err) return res.status(500).json({ error: err.message });

        if (userResult.length === 0 || userResult[0].role !== 'admin') {
            return res.status(403).json({
                status: 'fail',
                message: 'Akses Ditolak! Anda bukan Admin.'
            });
        }

        const logSql = `
            SELECT login_activities.*, users.avatar 
            FROM login_activities 
            LEFT JOIN users ON login_activities.user_id = users.id 
            ORDER BY login_activities.login_at DESC
        `;

        db.query(logSql, (errLogs, logResults) => {
            if (errLogs) return res.status(500).json({ error: errLogs.message });
            res.json({ status: 'success', data: logResults });
        });
    });
});

module.exports = router;

