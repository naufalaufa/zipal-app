const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';

    db.query(sql, [username, password], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        if (result.length > 0) {
            const user = result[0];
            const userPayload = { id: user.id, username: user.username };

            const accessToken = jwt.sign(
                userPayload,
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '1h' }
            );
            const refreshToken = jwt.sign(
                userPayload,
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '7d' }
            );

            const logSql =
                'INSERT INTO login_activities (user_id, username, role) VALUES (?, ?, ?)';

            db.query(logSql, [user.id, user.username, user.role], logErr => {
                if (logErr) console.error('❌ [ERROR LOG]', logErr.sqlMessage);
                else console.log(`✅ [SUKSES LOG] User ${user.username} login.`);
            });

            res.json({
                status: 'success',
                message: 'Login Berhasil!',
                accessToken,
                refreshToken,
                data: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    avatar: user.avatar
                }
            });
        } else {
            res
                .status(401)
                .json({ status: 'fail', message: 'Username atau Password salah!' });
        }
    });
});

router.post('/auth/check-username', (req, res) => {
    const { username } = req.body;
    db.query(
        'SELECT id, username, avatar FROM users WHERE username = ?',
        [username],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.length > 0) {
                res.json({
                    status: 'success',
                    message: 'Username ditemukan',
                    user: result[0]
                });
            } else {
                res
                    .status(404)
                    .json({ status: 'fail', message: 'Username tidak terdaftar!' });
            }
        }
    );
});

router.post('/auth/reset-password', (req, res) => {
    const { username, newPassword } = req.body;
    if (!newPassword || newPassword.length < 3) {
        return res
            .status(400)
            .json({ status: 'fail', message: 'Password terlalu pendek!' });
    }

    db.query(
        'UPDATE users SET password = ? WHERE username = ?',
        [newPassword, username],
        err => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                status: 'success',
                message: 'Password berhasil diubah!'
            });
        }
    );
});

module.exports = router;

