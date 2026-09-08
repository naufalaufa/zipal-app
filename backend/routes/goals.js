const express = require('express');
const db = require('../config/db');

const authenticateToken = require('../middleware/auth');
const router = express.Router();
const adminOnly = (req, res, next) => db.query('SELECT role FROM users WHERE id = ?', [req.user.id], (error, rows) => {
    if (error) return res.status(500).json({ message: 'Gagal memeriksa akses.' });
    if (rows[0]?.role !== 'admin') return res.status(403).json({ message: 'Hanya admin yang dapat mengubah Purpose.' });
    next();
});
const validateGoal = (req, res, next) => {
    const { title, target_amount, collected_amount = 0 } = req.body;
    if (typeof title !== 'string' || !title.trim() || !Number.isFinite(target_amount) || target_amount <= 0 || !Number.isFinite(collected_amount) || collected_amount < 0) {
        return res.status(400).json({ message: 'Nama, target, dan saldo tabungan tidak valid.' });
    }
    next();
};

router.get('/goals', (req, res) => {
    db.query('SELECT * FROM financial_goals ORDER BY id ASC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', data: results });
    });
});

router.post('/goals', authenticateToken, adminOnly, validateGoal, (req, res) => {
    const { title, target_amount, collected_amount = 0, description } = req.body;

    db.query(
        'INSERT INTO financial_goals (title, target_amount, collected_amount, description) VALUES (?, ?, ?, ?)',
        [title, target_amount, collected_amount || 0, description],
        err => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                status: 'success',
                message: 'Tujuan baru berhasil dibuat!'
            });
        }
    );
});

router.put('/goals/:id', authenticateToken, adminOnly, validateGoal, (req, res) => {
    const { id } = req.params;
    const { title, target_amount, collected_amount = 0, description } = req.body;

    db.query(
        'UPDATE financial_goals SET title=?, target_amount=?, collected_amount=?, description=? WHERE id=? AND collected_amount=?',
        [title, target_amount, collected_amount, description, id, req.body.expected_collected_amount],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!result.affectedRows) return res.status(409).json({ message: 'Saldo berubah atau tujuan tidak ditemukan. Muat ulang Purpose sebelum mengedit.' });
            res.json({
                status: 'success',
                message: 'Tujuan berhasil diupdate!'
            });
        }
    );
});

router.delete('/goals/:id', authenticateToken, adminOnly, (req, res) => {
    db.query('DELETE FROM financial_goals WHERE id = ?', [req.params.id], err => {
        if (err?.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ message: 'Tabungan memiliki transaksi dan tidak dapat dihapus.' });
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            status: 'success',
            message: 'Tujuan berhasil dihapus!'
        });
    });
});

module.exports = router;

