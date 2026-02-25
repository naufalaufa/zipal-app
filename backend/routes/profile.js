const express = require('express');
const db = require('../config/db');
const { upload } = require('../config/cloudinary');

const router = express.Router();

router.put('/profile', upload.single('avatar'), (req, res) => {
    const { id, username, password } = req.body;
    const avatar = req.file ? req.file.path : null;

    if (!id) {
        return res
            .status(400)
            .json({ status: 'fail', message: 'ID User tidak ditemukan!' });
    }

    let sqlUpdate = 'UPDATE users SET username = ?';
    const params = [username];

    if (password && password.trim() !== '') {
        sqlUpdate += ', password = ?';
        params.push(password);
    }

    if (avatar) {
        sqlUpdate += ', avatar = ?';
        params.push(avatar);
    }

    sqlUpdate += ' WHERE id = ?';
    params.push(id);

    db.query(sqlUpdate, params, err => {
        if (err) {
            return res.status(500).json({ status: 'error', message: err.message });
        }

        db.query('SELECT * FROM users WHERE id = ?', [id], (err2, rows) => {
            if (err2) return res.status(500).json({ error: err2.message });

            console.log('✅ Profile Berhasil Diupdate:', rows[0].username);

            res.json({
                status: 'success',
                message: 'Profile Success Update!',
                user: rows[0]
            });
        });
    });
});

module.exports = router;

