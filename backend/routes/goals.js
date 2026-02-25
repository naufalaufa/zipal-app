const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/goals', (req, res) => {
    db.query('SELECT * FROM financial_goals ORDER BY id ASC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', data: results });
    });
});

router.post('/goals', (req, res) => {
    const { title, target_amount, collected_amount, description } = req.body;

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

router.put('/goals/:id', (req, res) => {
    const { id } = req.params;
    const { title, target_amount, collected_amount, description } = req.body;

    db.query(
        'UPDATE financial_goals SET title=?, target_amount=?, collected_amount=?, description=? WHERE id=?',
        [title, target_amount, collected_amount, description, id],
        err => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                status: 'success',
                message: 'Tujuan berhasil diupdate!'
            });
        }
    );
});

router.delete('/goals/:id', (req, res) => {
    db.query('DELETE FROM financial_goals WHERE id = ?', [req.params.id], err => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            status: 'success',
            message: 'Tujuan berhasil dihapus!'
        });
    });
});

module.exports = router;

